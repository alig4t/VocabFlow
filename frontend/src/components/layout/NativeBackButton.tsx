import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNative } from "../../lib/platform";

// Paths treated as the app "home": pressing hardware back here exits the app
// instead of navigating. On native, `/` immediately redirects to `/dashboard`,
// so both count as home.
const HOME_PATHS = new Set(["/dashboard", "/"]);

/**
 * Wires the Android hardware back button to sensible behaviour on the native
 * (Capacitor) build:
 *   - With a dialog open     → let its existing Escape handler dismiss it.
 *   - With the sidebar open  → close it without changing the current route.
 *   - On the dashboard (home) → close the app.
 *   - Anywhere else          → go back one screen.
 *
 * Without this, Capacitor's default handler walks WebView history and gets
 * stuck on the initial `/` → `/dashboard` redirect, so back appeared to do
 * nothing on the dashboard. Renders nothing; web build is a no-op.
 */
export function NativeBackButton() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;

    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    import("@capacitor/app")
      .then((m) =>
        m.App.addListener("backButton", () => {
          const dismissTarget = document.querySelector(
            '[role="dialog"][data-state="open"]',
          )
            ? document
            : document.querySelector('[data-sidebar][data-state="open"]');
          if (dismissTarget) {
            // Radix dismisses only its top layer and respects dialogs that
            // prevent dismissal. Otherwise, send Escape to the sidebar itself.
            // Keep navigation behind either overlay untouched.
            dismissTarget.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true,
              }),
            );
            return;
          }
          // Read the live path so the handler never closes over a stale route.
          if (HOME_PATHS.has(window.location.pathname)) {
            m.App.exitApp();
          } else {
            navigate(-1);
          }
        }),
      )
      .then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [navigate]);

  return null;
}
