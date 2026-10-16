import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PaginationDots } from "./components/PaginationDots";
import { OnboardingButton } from "./components/OnboardingButton";
import { OnboardingSlide } from "./components/OnboardingSlide";
import { completeOnboarding } from "@/lib/onboarding";
const SLIDES = [
  {
    eyebrow: "کشف واژه‌ها",
    headline: ["واژه‌های تازه،", "دنیای بزرگ‌تر."],
    body: "از کتاب‌های معتبر انگلیسی شروع کن و واژه‌ها را همراه با معنی، مثال و تلفظ یاد بگیر.",
    imgSrc: "/vector/step1-newbg.png",
  },
  {
    eyebrow: "مرور هوشمند",
    headline: ["یاد بگیر،", "در خاطرت نگه دار."],
    body: "هر واژه در زمان مناسب به تو برمی‌گردد؛ مرورهای کوتاه کمک می‌کنند آموخته‌ها ماندگار شوند.",
    imgSrc: "/vector/step2-removebg-preview.png",
  },
  {
    eyebrow: "عادت روزانه",
    headline: ["قدم‌های کوچک،", "پیشرفت ماندگار."],
    body: "یک کتاب انتخاب کن، برنامه‌ات را بساز و هر روز یک قدم به دایره واژگان بزرگ‌تر نزدیک‌تر شو.",
    imgSrc: "/vector/step3-cut.png",
  },
];
/** First-launch introduction, with RTL swipes and hardware keyboard support. */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isLast = index === SLIDES.length - 1;
  const finish = useCallback(() => {
    completeOnboarding();
    navigate("/dashboard", { replace: true });
  }, [navigate]);
  const next = useCallback(() => {
    if (isLast) finish();
    else setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  }, [isLast, finish]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // Leave vertical scrolling alone on small screens and enlarged text.
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    if (dx > 0 && !isLast) next();
    else if (dx < 0) prev();
  };
  return (
    <main
      dir="rtl"
      className="onboarding-page font-persian"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        touchStart.current = null;
      }}
    >
      <OnboardingSlide {...SLIDES[index]} step={index + 1}>
        <PaginationDots
          count={SLIDES.length}
          active={index}
          onSelect={setIndex}
        />
        <OnboardingButton
          label={isLast ? "شروع یادگیری" : "بعدی"}
          onClick={next}
        />
      </OnboardingSlide>
    </main>
  );
}
