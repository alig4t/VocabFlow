interface PaginationDotsProps {
  count: number;
  active: number;
}

/** Three tiny dots; the active one is solid dark. */
export function PaginationDots({ count, active }: PaginationDotsProps) {
  return (
    <div className="flex items-center gap-[2cqw]" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`h-[1.9cqw] w-[1.9cqw] rounded-full ${
            i === active ? "bg-[#111111]" : "bg-[#6F663D]/40"
          }`}
        />
      ))}
    </div>
  );
}
