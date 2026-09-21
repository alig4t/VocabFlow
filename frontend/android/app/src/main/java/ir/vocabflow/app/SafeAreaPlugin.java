package ir.vocabflow.app;

import android.view.View;
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
 * and on every app resume, and injects the returned values as CSS custom
 * properties (--safe-top-px / --safe-bottom-px) that index.css folds into
 * --safe-top / --safe-bottom.
 */
@CapacitorPlugin(name = "SafeArea")
public class SafeAreaPlugin extends Plugin {

  /** System-bar + cutout insets in CSS pixels (dp), or empty if not yet attached. */
  @PluginMethod
  public void getInsets(PluginCall call) {
    View decor = getActivity().getWindow().getDecorView();
    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
    if (insets == null) {
      // Insets aren't attached yet (very early startup) — the web side retries.
      call.resolve(new JSObject());
      return;
    }
    // Union of system bars and any display cutout: whichever intrudes more wins.
    Insets bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
    float density = getContext().getResources().getDisplayMetrics().density;
    JSObject ret = new JSObject();
    ret.put("top", bars.top / density);
    ret.put("bottom", bars.bottom / density);
    ret.put("left", bars.left / density);
    ret.put("right", bars.right / density);
    call.resolve(ret);
  }
}
