/**
 * Native system-bar insets → CSS variables.
 *
 * Android's WebView only mirrors the display cutout into
 * env(safe-area-inset-*), NOT the full status/navigation bar heights, so on
 * edge-to-edge Android (targetSdk 35) the web side can't pad its content
 * correctly from CSS alone. This asks the native SafeArea plugin for the real
 * values and exposes them as --safe-top-px / --safe-bottom-px; index.css
 * folds them into --safe-top / --safe-bottom (max() with env() so iOS and
 * the web build keep working). No-op on the web.
 */
import { Capacitor } from "@capacitor/core";

interface SafeAreaInsets {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface SafeAreaPlugin {
  getInsets(): Promise<SafeAreaInsets>;
}

const SafeArea = Capacitor.registerPlugin<SafeAreaPlugin>("SafeArea");

export async function syncSafeAreaVars(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const insets = await SafeArea.getInsets();
    const root = document.documentElement.style;
    if (typeof insets.top === "number") {
      root.setProperty("--safe-top-px", `${insets.top}px`);
    }
    if (typeof insets.bottom === "number") {
      root.setProperty("--safe-bottom-px", `${insets.bottom}px`);
    }
  } catch {
    // Plugin missing (stale native build) — the env() fallback stays in charge.
  }
}
