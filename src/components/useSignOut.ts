"use client";

import { useRouter } from "next/navigation";
import { useConfirm } from "./Confirm";
import { useSession } from "./Providers";

/** Sign out, always after confirming. Returns to the public homepage. */
export function useSignOut() {
  const confirm = useConfirm();
  const { signOut } = useSession();
  const router = useRouter();
  return async () => {
    const ok = await confirm({
      title: "Sign out of espenxa?",
      body: "You will need your email and password to sign back in on this device.",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (!ok) return;
    await signOut();
    router.replace("/");
  };
}
