const STORAGE_KEY = "onboardingCompleted";

export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function completeOnboarding(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}
