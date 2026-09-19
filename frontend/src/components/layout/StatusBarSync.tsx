import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useTheme, type ResolvedTheme } from "./ThemeProvider";

interface StatusBarSpec {
  darkIcons: boolean;
}

/*
  The status bar is always a transparent overlay on top of the WebView
  (edge-to-edge); icon color per theme is the only thing left to configure.
  Top inset is handled in CSS via env(safe-area-inset-top).
*/
const BACKGROUND: Record<ResolvedTheme, StatusBarSpec> = {
  light: { darkIcons: true },
  dark: { darkIcons: false },
  study: { darkIcons: true },
};

/**
 * Keeps the Android status bar transparent (edge-to-edge) with theme-matched
 * icon colors. Renders nothing. No-op on the web — every call is native-only
 * and failure-tolerant.
 */
export function StatusBarSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    import("@capacitor/status-bar")
      .then(({ StatusBar, Style }) => {
        if (cancelled) return;
        const spec = BACKGROUND[resolvedTheme];
        // Always edge-to-edge: the WebView draws under a transparent status
        // bar on every Android version (on 15+ edge-to-edge is enforced
        // anyway and overlay:false is ignored). The layout pads its top edge
        // with env(safe-area-inset-top) instead, which resolves to the real
        // status-bar height on native and 0 on the web.
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
        // Android style mapping (per the plugin's native source):
        // Style.Light = light status bar → DARK icons; Style.Dark → LIGHT icons.
        StatusBar.setStyle({
          style: spec.darkIcons ? Style.Light : Style.Dark,
        }).catch(() => undefined);
        StatusBar.setBackgroundColor({ color: "#00000000" }).catch(
          () => undefined,
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);

  return null;
}
