import type { Metadata } from "next";
import CompanionDashboard from "@/components/companion/CompanionDashboard";

export const metadata: Metadata = { title: "My work" };

export default function ProviderPage() {
  return <CompanionDashboard />;
}
