import type { Metadata } from "next";
import CompanionSettings from "@/components/companion/CompanionSettings";

export const metadata: Metadata = { title: "Experiences and prices" };

export default function ProviderSettingsPage() {
  return <CompanionSettings />;
}
