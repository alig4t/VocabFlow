interface PaginationDotsProps {
  count: number;
  active: number;
  onSelect: (index: number) => void;
}
export function PaginationDots({
  count,
  active,
  onSelect,
}: PaginationDotsProps) {
  return (
    <div className="flex items-center" aria-label="مراحل معرفی">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className="onboarding-dot"
          onClick={() => onSelect(i)}
          aria-label={`رفتن به مرحله ${i + 1}`}
          aria-current={i === active ? "step" : undefined}
        >
          <span className={i === active ? "onboarding-dot-active" : ""} />
        </button>
      ))}
    </div>
  );
}
