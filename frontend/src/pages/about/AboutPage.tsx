import { Mail, Github } from "lucide-react";
import { useRef, useState } from "react";
import { isNative } from "../../lib/platform";
import { SUBSCRIPTION_POLICY } from "../../config/subscription";
import { DeveloperAccessSheet } from "../../components/subscription/DeveloperAccessSheet";

// «درباره سازنده» — a quiet, unobtrusive page. Reached from the faint footer
// link; intentionally minimal so it never competes with the app itself.
export function AboutPage() {
  const [developerOpen, setDeveloperOpen] = useState(false);
  const taps = useRef({ count: 0, lastAt: 0 });
  function tapTitle() {
    if (!isNative()) return;
    const now = performance.now();
    taps.current.count =
      now - taps.current.lastAt > SUBSCRIPTION_POLICY.developerTapTimeoutMs
        ? 1
        : taps.current.count + 1;
    taps.current.lastAt = now;
    if (taps.current.count >= SUBSCRIPTION_POLICY.developerTapCount) {
      taps.current.count = 0;
      setDeveloperOpen(true);
    }
  }
  return (
    <div dir="rtl" className="mx-auto max-w-xl px-4 py-12 font-persian">
      <div className="flex flex-col items-center text-center">
        <p className="text-xs tracking-wide text-muted-foreground/60">
          درباره‌ی سازنده
        </p>
        <h1
          className="mt-2 text-2xl font-bold text-foreground"
          onClick={tapTitle}
        >
          وکب فلو
        </h1>

        <div className="mt-6 space-y-4 text-[15px] leading-8 text-muted-foreground">
          <p>
            سال‌ها به‌عنوان یک زبان‌آموز دنبال یک سیستم ساده و پیوسته برای مرور
            واژه بودم؛ چیزی که نگذارد کلمه‌ها فراموش شوند و هر روز کمی جلوتر
            ببرد.
          </p>
          <p>
            وقتی چنین ابزاری آن‌طور که می‌خواستم پیدا نکردم، تصمیم گرفتم خودم
            بسازمش. وکب فلو حاصل همان تجربه است: یک همراه کوچک و آفلاین برای
            مرور روزمره‌ی واژه‌ها، با تکرار فاصله‌دار و تمرکز بر ماندگاری
            بلندمدت در حافظه.
          </p>
          <p>امیدوارم برای تو هم به‌اندازه‌ی من مفید باشد.</p>
        </div>

        {/* Maker's name — kept intentionally faint, just above the contact links. */}
        <div className="mt-12 flex flex-col items-center gap-1">
          <span className="h-px w-8 bg-border" aria-hidden="true" />
          <p className="pt-2 text-[13px] font-medium tracking-wide text-muted-foreground/50">
            ساخته‌ی علی قاسمی
          </p>
        </div>

        <div
          dir="ltr"
          className="mt-3 flex items-center gap-5 text-xs text-muted-foreground/40"
        >
          <a
            href="mailto:ali.gha3mi75@gmail.com"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-muted-foreground"
          >
            <Mail className="h-3.5 w-3.5" />
            ali.gha3mi75@gmail.com
          </a>
          <a
            href="https://github.com/alig4t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-muted-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            alig4t
          </a>
        </div>
      </div>
      {isNative() && (
        <DeveloperAccessSheet
          open={developerOpen}
          onOpenChange={setDeveloperOpen}
        />
      )}
    </div>
  );
}
