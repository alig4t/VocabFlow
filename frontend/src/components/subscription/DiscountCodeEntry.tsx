import { useState } from "react";
import { Pencil, Tag } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";

interface DiscountCodeEntryProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function DiscountCodeEntry({
  value,
  onChange,
  disabled,
}: DiscountCodeEntryProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function changeOpen(nextOpen: boolean) {
    setDraft(nextOpen ? value : "");
    setError("");
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <p className="min-w-0 flex-1 text-sm leading-7 text-muted-foreground">
          {value ? (
            <>
              <span className="sr-only">کد تخفیف وکب فلو: </span>
              <bdi
                dir="ltr"
                title={value}
                className="block truncate text-left font-mono text-xs text-foreground"
              >
                {value}
              </bdi>
            </>
          ) : (
            "کد تخفیف وکب فلو وارد نشده (اختیاری)"
          )}
        </p>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-h-11 shrink-0"
          >
            {value ? <Pencil aria-hidden="true" /> : <Tag aria-hidden="true" />}
            {value ? "ویرایش کد" : "درج کد تخفیف"}
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent
        dir="rtl"
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl font-persian sm:rounded-2xl"
        style={{
          maxHeight:
            "calc(100dvh - var(--safe-top) - var(--safe-bottom) - 2rem)",
        }}
      >
        <DialogTitle className="pl-6 leading-7">
          {value ? "ویرایش کد تخفیف" : "درج کد تخفیف"}
        </DialogTitle>
        <DialogDescription className="leading-7">
          کد مربوط به اشتراک انتخابی را وارد کنید. اعتبار کد و مبلغ نهایی هنگام
          پرداخت در بازار مشخص می‌شود.
        </DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled) return;
            const token = draft.trim();
            if (
              !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
            ) {
              setError("فرمت کد تخفیف درست نیست؛ کد کامل را وارد کنید.");
              return;
            }
            // A format check cannot confirm Bazaar's signature or one-use status.
            onChange(token);
            changeOpen(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="subscription-discount-token">
              کد تخفیف وکب فلو
            </Label>
            <textarea
              id="subscription-discount-token"
              dir="ltr"
              rows={4}
              value={draft}
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={`subscription-discount-help${error ? " subscription-discount-error" : ""}`}
              onChange={(event) => {
                setDraft(event.target.value);
                setError("");
              }}
              placeholder="کد کامل را اینجا وارد کنید"
              className="block w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-left font-mono text-xs leading-6 ring-offset-background placeholder:font-persian focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {error && (
              <p
                id="subscription-discount-error"
                role="alert"
                className="text-sm leading-7 text-destructive"
              >
                {error}
              </p>
            )}
            <p
              id="subscription-discount-help"
              className="text-xs leading-6 text-muted-foreground"
            >
              تخفیف فقط برای همین خرید است؛ تمدید خودکار با قیمت اصلی انجام
              می‌شود.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={disabled || !draft.trim()}
              className="min-h-11 flex-1"
            >
              ثبت کد تخفیف
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="min-h-11">
                انصراف
              </Button>
            </DialogClose>
            {value && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                className="min-h-11 text-destructive"
                onClick={() => {
                  onChange("");
                  changeOpen(false);
                }}
              >
                حذف کد
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
