import { isNative } from '@/lib/platform'
import { seedIfNeeded } from './seed'

/**
 * Prepare the native offline app: open the SQLite DB and seed the bundled
 * book data on first launch. No-op on the web build.
 */
export async function prepareNative(
  onProgress?: (p: number, label: string) => void,
): Promise<void> {
  if (!isNative()) return
  await seedIfNeeded(onProgress)
}
