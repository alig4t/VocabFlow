import { ArrowLeft } from "lucide-react";
interface OnboardingButtonProps {
  label: string;
  onClick: () => void;
}
export function OnboardingButton({ label, onClick }: OnboardingButtonProps) {
  return (
    <button type="button" onClick={onClick} className="onboarding-next">
      {label}
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
