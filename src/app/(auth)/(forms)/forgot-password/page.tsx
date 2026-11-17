"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, DevNote, Field, Input, Notice } from "@/components/ui";
import { api, devTools } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    await api.auth.requestPasswordReset(email).catch(() => {});
    if (devTools) {
      const box = await devTools.outbox();
      const m = box.find((x) => x.to.toLowerCase() === email.toLowerCase() && x.subject.includes("Reset"));
      setDevLink(m?.body ?? null);
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <div>
      <h1 className="display text-5xl">Reset your password</h1>
      <p className="mt-2 text-[15px] text-mute">Enter the email on your account and we will send you a reset link.</p>

      {sent ? (
        <div className="mt-8 space-y-4">
          <Notice tone="ok" title="Check your email">
            If an account exists for {email}, a reset link is on its way. It expires in 30 minutes.
          </Notice>
          {devLink && (
            <DevNote>
              No email is sent in development. Simulated link:{" "}
              <Link href={devLink} className="font-medium text-cream underline">
                open reset page
              </Link>
            </DevNote>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-mute">
        <Link href="/login" className="font-medium text-cream underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
