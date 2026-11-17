"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, errorMessage, Field, Input, LinkButton, Notice } from "@/components/ui";
import { api } from "@/lib/api/client";

export default function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="display text-5xl">Link not valid</h1>
        <p className="text-mute">This reset link is incomplete. Request a new one.</p>
        <LinkButton href="/forgot-password">Request a new link</LinkButton>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The passwords do not match.");
    setBusy(true);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="display text-5xl">Choose a new password</h1>
      {done ? (
        <div className="mt-8 space-y-4">
          <Notice tone="ok" title="Password updated">
            You can now sign in with your new password.
          </Notice>
          <LinkButton href="/login" size="lg" className="w-full">
            Sign in
          </LinkButton>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          {error && <Notice tone="bad">{error}</Notice>}
          <Field label="New password" hint="At least 8 characters, with letters and numbers.">
            {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Field label="Confirm password">{(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Update password
          </Button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-mute hover:text-cream">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
