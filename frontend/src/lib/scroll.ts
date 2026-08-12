/**
 * The app body never scrolls — Layout pins the shell to 100dvh and the real
 * scroll box is the <main> element. `window.scrollTo` is therefore a no-op
 * anywhere inside the app shell; use these helpers instead.
 */
export const SCROLL_CONTAINER_ID = 'app-scroll'

export function getScrollContainer(): HTMLElement | null {
  return document.getElementById(SCROLL_CONTAINER_ID)
}

/** Jump the app's scroll box back to the top (falls back to the window on
 *  shell-less pages such as the landing/auth screens). */
export function scrollToTop(behavior: ScrollBehavior = 'auto') {
  const el = getScrollContainer()
  if (el) el.scrollTo({ top: 0, behavior })
  else window.scrollTo({ top: 0, behavior })
}
