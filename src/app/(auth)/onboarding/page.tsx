import type { Metadata } from "next";
import { Suspense } from "react";
import Onboarding from "@/components/onboarding/Onboarding";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}
