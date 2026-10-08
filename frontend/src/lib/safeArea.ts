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
 *
 * The plugin reports how far each bar overlaps the WebView (0 for the
 * navigation bar on Android ≤ 14, where the WebView ends above it), and pushes
 * an "insetsChange" event whenever that changes after startup.
 */
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

interface SafeAreaInsets {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface SafeAreaPlugin {
  getInsets(): Promise<SafeAreaInsets>;
  addListener(
    eventName: "insetsChange",
    listener: (insets: SafeAreaInsets) => void,
  ): Promise<PluginListenerHandle>;
}

const SafeArea = Capacitor.registerPlugin<SafeAreaPlugin>("SafeArea");

function applyInsets(insets: SafeAreaInsets) {
  const root = document.documentElement.style;
  if (typeof insets.top === "number") {
    root.setProperty("--safe-top-px", `${insets.top}px`);
  }
  if (typeof insets.bottom === "number") {
    root.setProperty("--safe-bottom-px", `${insets.bottom}px`);
  }
}

let listening = false;

export async function syncSafeAreaVars(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (!listening) {
      listening = true;
      await SafeArea.addListener("insetsChange", applyInsets);
    }
    applyInsets(await SafeArea.getInsets());
  } catch {
    // Plugin missing (stale native build) — the env() fallback stays in charge.
  }
}
