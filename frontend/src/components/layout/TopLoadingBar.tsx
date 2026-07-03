import { useEffect, useState } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

/**
 * Slim top-of-viewport progress bar (NProgress-style) that appears whenever
 * any TanStack Query fetch or mutation is in flight — i.e. during service
 * calls. It trickles toward 90% while active, then snaps to 100% and fades.
 */
export function TopLoadingBar() {
  const active = useIsFetching() + useIsMutating() > 0
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setVisible(true)
      setProgress((p) => (p < 12 ? 12 : p))
      const interval = setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + Math.max(0.8, (90 - p) * 0.08)))
      }, 220)
      return () => clearInterval(interval)
    }
    // finished: complete the bar, then hide it
    setProgress(100)
    const timeout = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 450)
    return () => clearTimeout(timeout)
  }, [active])

  return (
    <div dir="ltr" aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_10px_rgba(228,168,36,0.75)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  )
}
