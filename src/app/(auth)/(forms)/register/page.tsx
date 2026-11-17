import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage(props: PageProps<"/register">) {
  const { to } = await props.searchParams;
  const name = typeof to === "string" && /^[\p{L} .'-]{1,30}$/u.test(to) ? to : null;
  return <RegisterForm intro={name ? `Create your account to connect with ${name}. It only takes a minute.` : undefined} />;
}
