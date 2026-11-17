import type { Metadata } from "next";
import MyProfile from "@/components/account/MyProfile";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfilePage() {
  return <MyProfile />;
}
