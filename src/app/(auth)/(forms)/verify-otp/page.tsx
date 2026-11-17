import type { Metadata } from "next";
import OtpForm from "@/components/auth/OtpForm";

export const metadata: Metadata = { title: "Enter your code" };

export default function VerifyOtpPage() {
  return <OtpForm />;
}
