interface PaginationDotsProps {
  count: number
  active: number
}

/** Three RTL-friendly dots; the active one is golden orange. */
export function PaginationDots({ count, active }: PaginationDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === active
              ? 'w-6 bg-[hsl(31,94%,55%)]'
              : 'w-2 bg-[hsl(210,29%,82%)]'
          }`}
        />
      ))}
    </div>
  )
}
