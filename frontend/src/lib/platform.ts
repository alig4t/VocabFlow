import { Capacitor } from '@capacitor/core'

/**
 * True when running inside the native (Android) Capacitor shell — the fully
 * offline build backed by local SQLite. On the web build this is always false,
 * so the app keeps using the HTTP services + server.
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}
