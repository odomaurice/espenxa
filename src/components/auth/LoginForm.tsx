"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/Providers";
import { Button, DevNote, errorMessage, Field, Input, Notice } from "@/components/ui";
import { api, IS_MOCK } from "@/lib/api/client";
import { DEMO_PASSWORD } from "@/lib/api/mock/seed";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const acc = await api.auth.login(email, password);
      await refresh();
      router.replace(acc.roles.length ? "/admin" : !acc.contactVerified ? "/verify-otp" : next);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="display text-5xl">Welcome back</h1>
      <p className="mt-2 text-[15px] text-mute">Sign in to see who you have been missing.</p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {error && <Notice tone="bad">{error}</Notice>}
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password">
          {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[13px] text-mute hover:text-cream">
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        New to Meet?{" "}
        <Link href="/register" className="font-medium text-cream underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      {IS_MOCK && (
        <div className="mt-8 space-y-2">
          <DevNote>
            Demo accounts, password <b>{DEMO_PASSWORD}</b>: <b>ada@meet.dev</b> (member), <b>amara@meet.dev</b> (companion), <b>admin@meet.dev</b> (staff).
          </DevNote>
          <div className="flex flex-wrap gap-2">
            {["ada", "amara", "admin"].map((u) => (
              <Button
                key={u}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEmail(`${u}@meet.dev`);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                Use {u}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
