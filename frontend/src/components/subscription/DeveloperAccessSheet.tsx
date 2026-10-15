import { useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogBottomContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { subscriptionService } from "../../services/subscription.service";

export function DeveloperAccessSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function activate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await subscriptionService.activateDeveloper(code);
      setCode("");
      setMessage("دسترسی توسعه‌دهنده برای ۳۰ روز فعال شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "فعال‌سازی انجام نشد.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setMessage("");
          setCode("");
          onOpenChange(value);
        }
      }}
    >
      <DialogBottomContent
        dir="rtl"
        className="font-persian"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between gap-4">
          <DialogTitle>Developer Access</DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="بستن"
              disabled={busy}
            >
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <DialogDescription>کد دسترسی امروز را وارد کنید.</DialogDescription>
        <form onSubmit={activate} className="space-y-4">
          <label htmlFor="developer-access-code" className="text-sm">
            رمز دسترسی
          </label>
          <Input
            id="developer-access-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            dir="ltr"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={32}
            disabled={busy}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !code.trim()}
          >
            {busy ? "در حال بررسی…" : "فعال‌سازی"}
          </Button>
          {message && (
            <p role="status" className="text-sm leading-7">
              {message}
            </p>
          )}
        </form>
      </DialogBottomContent>
    </Dialog>
  );
}
