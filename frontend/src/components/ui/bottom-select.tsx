import { useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "./button";
import {
  Dialog,
  DialogBottomContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { cn } from "@/lib/utils";

interface BottomSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
}

export function BottomSelect<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled,
}: BottomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const valueId = useId();
  const optionRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  const focusValue = selected?.value ?? options[0]?.value;

  return (
    <div dir="rtl" className="min-w-0 space-y-1">
      <span id={labelId} className="text-xs text-muted-foreground">
        {label}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-labelledby={`${labelId} ${valueId}`}
            className="h-11 w-full min-w-0 justify-between rounded-xl px-3 font-normal"
          >
            <span id={valueId} dir="auto" className="min-w-0 truncate">
              {selected?.label ?? label}
            </span>
            <ChevronDown aria-hidden className="text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogBottomContent
          dir="rtl"
          className="font-persian gap-3 overflow-hidden p-4 pb-[max(1rem,var(--safe-bottom))] motion-reduce:animate-none"
          style={{
            maxHeight: "min(85dvh, calc(100dvh - var(--safe-top) - 1rem))",
          }}
          onOpenAutoFocus={(event) => {
            if (!optionRef.current) return;
            event.preventDefault();
            optionRef.current.focus({ preventScroll: true });
            optionRef.current.scrollIntoView({ block: "nearest" });
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3">
            <DialogTitle>انتخاب {label}</DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="بستن"
                className="h-11 w-11 rounded-xl text-muted-foreground"
              >
                <X aria-hidden />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">
            یک گزینه را انتخاب کنید تا فیلتر اعمال شود.
          </DialogDescription>
          <div
            role="group"
            aria-label={`گزینه‌های ${label}`}
            className="min-h-0 space-y-1 overflow-y-auto overscroll-contain"
          >
            {options.map((option) => (
              <button
                key={option.value}
                ref={option.value === focusValue ? optionRef : undefined}
                type="button"
                aria-pressed={option.value === value}
                onClick={() => {
                  if (option.value !== value) onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-right text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  option.value === value
                    ? "border-primary/40 bg-primary/10 font-medium text-foreground"
                    : "border-transparent text-foreground hover:bg-muted",
                )}
              >
                <span dir="auto" className="min-w-0 break-words">
                  {option.label}
                </span>
                {option.value === value && (
                  <Check
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-primary"
                  />
                )}
              </button>
            ))}
          </div>
        </DialogBottomContent>
      </Dialog>
    </div>
  );
}
