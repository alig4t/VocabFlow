package ir.vocabflow.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Network;
import android.net.NetworkInfo;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ir.cafebazaar.poolakey.Connection;
import ir.cafebazaar.poolakey.ConnectionState;
import ir.cafebazaar.poolakey.Payment;
import ir.cafebazaar.poolakey.config.PaymentConfiguration;
import ir.cafebazaar.poolakey.config.SecurityCheck;
import ir.cafebazaar.poolakey.entity.PurchaseInfo;
import ir.cafebazaar.poolakey.entity.SkuDetails;
import ir.cafebazaar.poolakey.request.PurchaseRequest;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import kotlin.Unit;
import org.json.JSONObject;

/** Poolakey is the only billing transport. No developer API secret is shipped. */
@CapacitorPlugin(name = "BazaarBilling")
public class BazaarBillingPlugin extends Plugin {
    private static final String[] SKUS = {
        BuildConfig.BAZAAR_MONTHLY_SKU, BuildConfig.BAZAAR_QUARTERLY_SKU, BuildConfig.BAZAAR_YEARLY_SKU
    };
    private static final String[] PLANS = {"monthly", "quarterly", "yearly"};
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ArrayDeque<BillingTask> tasks = new ArrayDeque<>();
    private Payment payment;
    private Connection connection;
    private BillingTask current;
    private ConnectivityManager.NetworkCallback networkCallback;
    private Boolean lastOnline;
    private final String sessionClockId = "session:" + UUID.randomUUID();

    @Override
    public void load() {
        ConnectivityManager manager = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) { reportConnectivity(); }
            @Override public void onLost(Network network) { reportConnectivity(); }
            @Override public void onCapabilitiesChanged(Network network, NetworkCapabilities capabilities) { reportConnectivity(); }
        };
        manager.registerNetworkCallback(new NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(), networkCallback);
    }

    private void reportConnectivity() {
        handler.post(() -> {
            boolean online = isOnline();
            if (lastOnline != null && lastOnline == online) return;
            lastOnline = online;
            JSObject result = new JSObject();
            result.put("online", online);
            notifyListeners("networkChange", result, true);
        });
    }

    private static class BillingTask {
        final PluginCall call;
        final Runnable operation;
        final long timeoutMs;
        Runnable timeout;
        BillingTask(PluginCall call, Runnable operation, long timeoutMs) {
            this.call = call;
            this.operation = operation;
            this.timeoutMs = timeoutMs;
        }
    }

    @PluginMethod
    public void getConfiguration(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configured", isConfigured());
        result.put("developerConfigured", !BuildConfig.DEVELOPER_ACCESS_SECRET.isEmpty());
        JSArray products = new JSArray();
        for (int i = 0; i < SKUS.length; i++) {
            JSObject product = new JSObject();
            product.put("plan", PLANS[i]);
            product.put("sku", SKUS[i]);
            products.put(product);
        }
        result.put("products", products);
        call.resolve(result);
    }

    @PluginMethod
    public void getEnvironment(PluginCall call) {
        JSObject result = clock();
        result.put("online", isOnline());
        result.put("bazaarInstalled", isBazaarInstalled());
        call.resolve(result);
    }

    @PluginMethod
    public void getSubscribedProducts(PluginCall call) {
        enqueue(call, () -> {
            final BillingTask task = current;
            payment.getSubscribedProducts(callback -> {
                callback.querySucceed(purchases -> {
                    try {
                        if (!isOnline()) throw new IllegalStateException();
                        JSArray verified = new JSArray();
                        for (PurchaseInfo purchase : purchases) {
                            verifyReceipt(purchase);
                            if (allowedSku(purchase.getProductId())) verified.put(receipt(purchase));
                        }
                        JSObject result = new JSObject();
                        result.put("purchases", verified);
                        result.put("clock", clock());
                        succeed(task, result);
                    } catch (Exception error) {
                        fail(task, "اعتبار پاسخ بازار تأیید نشد؛ دوباره تلاش کنید.", "INVALID_RECEIPT");
                    }
                    return Unit.INSTANCE;
                });
                callback.queryFailed(error -> {
                    fail(task, "بررسی اشتراک در بازار انجام نشد؛ اتصال اینترنت و ورود به حساب بازار را بررسی کنید.", "QUERY_FAILED");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
        }, 30_000);
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        enqueue(call, () -> {
            final BillingTask task = current;
            payment.getSubscriptionSkuDetails(Arrays.asList(SKUS), callback -> {
                callback.getSkuDetailsSucceed(products -> {
                    JSArray items = new JSArray();
                    for (SkuDetails product : products) {
                        if (!allowedSku(product.getSku()) || !"subs".equals(product.getType())) continue;
                        JSObject item = new JSObject();
                        item.put("sku", product.getSku());
                        item.put("price", product.getPrice());
                        item.put("title", product.getTitle());
                        item.put("description", product.getDescription());
                        items.put(item);
                    }
                    JSObject result = new JSObject();
                    result.put("products", items);
                    succeed(task, result);
                    return Unit.INSTANCE;
                });
                callback.getSkuDetailsFailed(error -> {
                    fail(task, "قیمت اشتراک‌ها از بازار دریافت نشد.", "PRODUCTS_FAILED");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
        }, 30_000);
    }

    @PluginMethod
    public void subscribe(PluginCall call) {
        String sku = call.getString("sku", "");
        if (!allowedSku(sku)) {
            call.reject("این اشتراک قابل خرید نیست.", "INVALID_SKU");
            return;
        }
        enqueue(call, () -> {
            final BillingTask task = current;
            PurchaseRequest request = new PurchaseRequest(sku, UUID.randomUUID().toString(), null);
            payment.subscribeProduct(getActivity().getActivityResultRegistry(), request, callback -> {
                callback.purchaseSucceed(purchase -> {
                    try {
                        verifyReceipt(purchase);
                        if (!sku.equals(purchase.getProductId())) throw new IllegalArgumentException();
                        // Only a subsequent subscription query can renew the local grace window.
                        succeed(task, new JSObject());
                    } catch (Exception error) {
                        fail(task, "اعتبار رسید خرید تأیید نشد؛ بازیابی خرید را انجام دهید.", "INVALID_RECEIPT");
                    }
                    return Unit.INSTANCE;
                });
                callback.purchaseCanceled(() -> {
                    fail(task, "خرید لغو شد.", "PURCHASE_CANCELED");
                    return Unit.INSTANCE;
                });
                callback.purchaseFailed(error -> {
                    fail(task, "خرید تکمیل نشد؛ حساب بازار و اتصال اینترنت را بررسی کنید.", "PURCHASE_FAILED");
                    return Unit.INSTANCE;
                });
                callback.failedToBeginFlow(error -> {
                    fail(task, "صفحه پرداخت بازار باز نشد.", "PURCHASE_UNAVAILABLE");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
        }, 300_000);
    }

    @PluginMethod
    public void activateDeveloper(PluginCall call) {
        if (BuildConfig.DEVELOPER_ACCESS_SECRET.isEmpty()) {
            call.reject("دسترسی توسعه‌دهنده در این نسخه تنظیم نشده است.", "DEVELOPER_NOT_CONFIGURED");
            return;
        }
        try {
            long now = System.currentTimeMillis();
            SimpleDateFormat format = new SimpleDateFormat("yyyyMMdd", Locale.US);
            format.setTimeZone(TimeZone.getTimeZone("Asia/Tehran"));
            String day = format.format(now);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(BuildConfig.DEVELOPER_ACCESS_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(("VocabFlow|" + day).getBytes(StandardCharsets.UTF_8));
            long bits = 0;
            for (int i = 0; i < 5; i++) bits = (bits << 8) | (digest[i] & 255L);
            String alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
            StringBuilder expected = new StringBuilder("VF-");
            for (int i = 7; i >= 0; i--) expected.append(alphabet.charAt((int) ((bits >>> (i * 5)) & 31)));
            String code = call.getString("code", "").trim().toUpperCase(Locale.US);
            if (!MessageDigest.isEqual(expected.toString().getBytes(StandardCharsets.UTF_8), code.getBytes(StandardCharsets.UTF_8))) {
                call.reject("کد دسترسی معتبر نیست.", "INVALID_DEVELOPER_CODE");
                return;
            }
            JSObject result = new JSObject();
            result.put("version", 1);
            result.put("activatedAt", now);
            result.put("validUntil", now + 30L * 24 * 60 * 60 * 1000);
            result.put("lastCodeDay", day);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("بررسی کد دسترسی انجام نشد.", "DEVELOPER_FAILED");
        }
    }

    private void enqueue(PluginCall call, Runnable operation, long timeoutMs) {
        handler.post(() -> {
            tasks.add(new BillingTask(call, operation, timeoutMs));
            startNext();
        });
    }

    private void startNext() {
        if (current != null || tasks.isEmpty()) return;
        current = tasks.remove();
        final BillingTask task = current;
        if (!isConfigured()) { fail(task, "خرید اشتراک هنوز آماده نیست.", "NOT_CONFIGURED"); return; }
        if (!isOnline()) { fail(task, "برای بررسی اشتراک به اینترنت وصل شوید.", "OFFLINE"); return; }
        if (!isBazaarInstalled()) { fail(task, "برای بررسی اشتراک، برنامه بازار را نصب کنید.", "BAZAAR_UNAVAILABLE"); return; }
        task.timeout = () -> {
            closeConnection();
            fail(task, "پاسخی از بازار دریافت نشد؛ دوباره تلاش کنید.", "BILLING_TIMEOUT");
        };
        handler.postDelayed(task.timeout, task.timeoutMs);
        if (payment != null && connection != null && connection.getState() == ConnectionState.Connected.INSTANCE) {
            runTask(task);
            return;
        }
        // Poolakey's built-in query verifier silently filters invalid receipts.
        // A single strict verifier below turns them into an error, never a false
        // empty inventory that would revoke the last valid cache.
        final Payment createdPayment = new Payment(getContext(), new PaymentConfiguration(SecurityCheck.Disable.INSTANCE));
        payment = createdPayment;
        connection = payment.connect(callback -> {
            callback.connectionSucceed(() -> { runTask(task); return Unit.INSTANCE; });
            callback.connectionFailed(error -> {
                fail(task, "اتصال به بازار برقرار نشد؛ ورود به حساب بازار را بررسی کنید.", "CONNECTION_FAILED");
                return Unit.INSTANCE;
            });
            callback.disconnected(() -> {
                if (payment == createdPayment && current != null) fail(current, "ارتباط با بازار قطع شد؛ دوباره تلاش کنید.", "DISCONNECTED");
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    private void runTask(BillingTask task) {
        if (current != task) return;
        try { task.operation.run(); }
        catch (Exception error) { fail(task, "بررسی بازار انجام نشد؛ دوباره تلاش کنید.", "BILLING_FAILED"); }
    }

    private void succeed(BillingTask task, JSObject result) {
        handler.post(() -> {
            if (current != task) return;
            if (task.timeout != null) handler.removeCallbacks(task.timeout);
            current = null;
            task.call.resolve(result);
            startNext();
        });
    }

    private void fail(BillingTask task, String message, String code) {
        handler.post(() -> {
            if (current != task) return;
            if (task.timeout != null) handler.removeCallbacks(task.timeout);
            current = null;
            task.call.reject(message, code);
            startNext();
        });
    }

    private void verifyReceipt(PurchaseInfo purchase) throws Exception {
        Signature verifier = Signature.getInstance("SHA1withRSA");
        verifier.initVerify(KeyFactory.getInstance("RSA").generatePublic(
            new X509EncodedKeySpec(Base64.decode(BuildConfig.BAZAAR_RSA_PUBLIC_KEY, Base64.DEFAULT))));
        verifier.update(purchase.getOriginalJson().getBytes(StandardCharsets.UTF_8));
        if (!verifier.verify(Base64.decode(purchase.getDataSignature(), Base64.DEFAULT))) throw new IllegalArgumentException();
        JSONObject raw = new JSONObject(purchase.getOriginalJson());
        if (!getContext().getPackageName().equals(raw.getString("packageName"))
            || raw.getInt("purchaseState") != 0
            || raw.getString("purchaseToken").isEmpty()
            || !raw.getString("productId").equals(purchase.getProductId())) throw new IllegalArgumentException();
    }

    private JSObject receipt(PurchaseInfo purchase) {
        JSObject result = new JSObject();
        result.put("productId", purchase.getProductId());
        result.put("packageName", purchase.getPackageName());
        result.put("purchaseToken", purchase.getPurchaseToken());
        result.put("orderId", purchase.getOrderId());
        result.put("purchaseTime", purchase.getPurchaseTime());
        result.put("originalJson", purchase.getOriginalJson());
        result.put("dataSignature", purchase.getDataSignature());
        return result;
    }

    private boolean allowedSku(String sku) {
        return sku != null && !sku.isEmpty() && Arrays.asList(SKUS).contains(sku);
    }

    private boolean isConfigured() {
        boolean productsConfigured = !BuildConfig.BAZAAR_RSA_PUBLIC_KEY.isEmpty()
            && !SKUS[0].isEmpty() && !SKUS[1].isEmpty() && !SKUS[2].isEmpty()
            && !SKUS[0].equals(SKUS[1]) && !SKUS[0].equals(SKUS[2]) && !SKUS[1].equals(SKUS[2]);
        if (!productsConfigured) return false;
        try {
            KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(
                Base64.decode(BuildConfig.BAZAAR_RSA_PUBLIC_KEY, Base64.DEFAULT)));
            return true;
        } catch (Exception invalidKey) { return false; }
    }

    private boolean isBazaarInstalled() {
        try { getContext().getPackageManager().getPackageInfo("com.farsitel.bazaar", 0); return true; }
        catch (Exception ignored) { return false; }
    }

    @SuppressWarnings("deprecation")
    private boolean isOnline() {
        ConnectivityManager manager = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NetworkCapabilities capabilities = manager.getNetworkCapabilities(manager.getActiveNetwork());
            return capabilities != null
                && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        }
        NetworkInfo info = manager.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    private JSObject clock() {
        JSObject result = new JSObject();
        result.put("wallTime", System.currentTimeMillis());
        result.put("elapsedRealtime", SystemClock.elapsedRealtime());
        int boot = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
            ? Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.BOOT_COUNT, -1) : -1;
        result.put("bootId", boot >= 0 ? Integer.toString(boot) : sessionClockId);
        return result;
    }

    private void closeConnection() {
        if (connection != null) connection.disconnect();
        connection = null;
        payment = null;
    }

    @Override
    protected void handleOnDestroy() {
        if (networkCallback != null) {
            ConnectivityManager manager = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            if (manager != null) manager.unregisterNetworkCallback(networkCallback);
            networkCallback = null;
        }
        handler.removeCallbacksAndMessages(null);
        if (current != null) current.call.reject("ارتباط با بازار بسته شد.", "DESTROYED");
        current = null;
        for (BillingTask task : tasks) task.call.reject("ارتباط با بازار بسته شد.", "DESTROYED");
        tasks.clear();
        closeConnection();
    }
}
