import { isNative } from "@/lib/platform";
import { seedIfNeeded } from "./seed";

type ProgressListener = (p: number, label: string) => void;
let preparation: Promise<void> | null = null;
const progressListeners = new Set<ProgressListener>();

/**
 * Prepare the native offline app: open the SQLite DB and seed the bundled
 * book data on first launch. No-op on the web build.
 */
export async function prepareNative(
  onProgress?: ProgressListener,
): Promise<void> {
  if (!isNative()) return;
  if (onProgress) progressListeners.add(onProgress);
  try {
    // StrictMode/remounts must not start overlapping seed transactions.
    preparation ??= seedIfNeeded((p, label) => {
      for (const listener of progressListeners) listener(p, label);
    }).finally(() => {
      preparation = null;
    });
    await preparation;
  } finally {
    if (onProgress) progressListeners.delete(onProgress);
  }
}
