import type { Metadata } from "next";
import BecomeCompanion from "@/components/companion/BecomeCompanion";

export const metadata: Metadata = { title: "Become a companion" };

export default function BecomeCompanionPage() {
  return <BecomeCompanion />;
}
