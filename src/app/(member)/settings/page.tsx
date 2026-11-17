import type { Metadata } from "next";
import Settings from "@/components/account/Settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <Settings />;
}
