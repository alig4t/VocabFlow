package ir.vocabflow.app;

import android.view.View;
import android.view.ViewTreeObserver;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Exposes the real system-bar insets to the WebView.
 *
 * Android's WebView does not report the full status/navigation bar heights
 * through CSS env(safe-area-inset-*) — it only mirrors the display cutout —
 * so with edge-to-edge enforced (targetSdk 35) the web side can't pad its
 * content correctly on its own. The web layer calls getInsets() at startup
 * and on every app resume, and also listens for "insetsChange", and injects
 * the values as CSS custom properties (--safe-top-px / --safe-bottom-px) that
 * index.css folds into --safe-top / --safe-bottom.
 *
 * The reported value is how far each system bar actually OVERLAPS the WebView,
 * not the raw bar height: on Android 15+ (enforced edge-to-edge) the WebView
 * runs under the navigation bar, but on Android ≤ 14 it stops above it (only
 * the status bar is overlaid, via StatusBar.setOverlaysWebView), so padding by
 * the raw navigation-bar height there would double it up.
 */
@CapacitorPlugin(name = "SafeArea")
public class SafeAreaPlugin extends Plugin {

  private ViewTreeObserver.OnGlobalLayoutListener layoutListener;
  private String lastSent = "";

  @Override
  public void load() {
    // Insets and the WebView's bounds settle (and later change: rotation,
    // nav-mode switch, status-bar overlay toggle) in a layout pass, so push
    // every change to the web side instead of relying on one early read.
    View decor = getActivity().getWindow().getDecorView();
    layoutListener = () -> {
      JSObject insets = computeInsets();
      if (insets == null) return;
      String key = insets.toString();
      if (key.equals(lastSent)) return;
      lastSent = key;
      notifyListeners("insetsChange", insets);
    };
    decor.getViewTreeObserver().addOnGlobalLayoutListener(layoutListener);
  }

  @Override
  protected void handleOnDestroy() {
    if (layoutListener != null) {
      View decor = getActivity().getWindow().getDecorView();
      decor.getViewTreeObserver().removeOnGlobalLayoutListener(layoutListener);
      layoutListener = null;
    }
  }

  /** System-bar + cutout overlap in CSS pixels (dp), or empty if not yet laid out. */
  @PluginMethod
  public void getInsets(PluginCall call) {
    JSObject insets = computeInsets();
    call.resolve(insets != null ? insets : new JSObject());
  }

  private JSObject computeInsets() {
    View decor = getActivity().getWindow().getDecorView();
    View webView = getBridge().getWebView();
    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
    if (insets == null || webView == null || webView.getHeight() == 0 || decor.getHeight() == 0) {
      // Not attached / laid out yet (very early startup) — the layout
      // listener sends the values once they exist.
      return null;
    }
    // Union of system bars and any display cutout: whichever intrudes more wins.
    Insets bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());

    // Both views are positioned in window coordinates; the decor view spans the
    // whole window, bars included.
    int[] loc = new int[2];
    webView.getLocationInWindow(loc);
    int webLeft = loc[0];
    int webTop = loc[1];
    int webRight = webLeft + webView.getWidth();
    int webBottom = webTop + webView.getHeight();

    int top = Math.max(0, bars.top - webTop);
    int bottom = Math.max(0, webBottom - (decor.getHeight() - bars.bottom));
    int left = Math.max(0, bars.left - webLeft);
    int right = Math.max(0, webRight - (decor.getWidth() - bars.right));

    float density = getContext().getResources().getDisplayMetrics().density;
    JSObject ret = new JSObject();
    ret.put("top", top / density);
    ret.put("bottom", bottom / density);
    ret.put("left", left / density);
    ret.put("right", right / density);
    return ret;
  }
}
