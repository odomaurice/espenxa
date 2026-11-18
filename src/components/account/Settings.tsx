"use client";

import { Add01Icon, Call02Icon, Delete02Icon, Logout03Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { PrivacyControls } from "@/components/profile/sections";
import { useSession } from "@/components/Providers";
import { Button, errorMessage, Field, Icon, IconButton, Input, Notice, PageHeader, Panel, PanelHeader, Skeleton } from "@/components/ui";
import { useSignOut } from "@/components/useSignOut";
import { api } from "@/lib/api/client";
import { qk, useMyProfile, useTrusted } from "@/lib/api/hooks";
import type { PrivacySettings } from "@/lib/api/types";
import { openCookieSettings, useCookieChoice } from "@/lib/consent";

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" sub="Control what people see, who to call in an emergency, and your account." />
      <Privacy />
      <Trusted />
      <Cookies />
      <Account />
    </div>
  );
}

function Cookies() {
  const { choice } = useCookieChoice();
  return (
    <Panel>
      <PanelHeader title="Cookies" sub="Essential cookies keep you signed in and safe. The rest are up to you." />
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6">
        <p className="text-sm text-mute">{!choice ? "You have not chosen yet." : choice.analytics || choice.personalisation ? `On: essential${choice.analytics ? ", analytics" : ""}${choice.personalisation ? ", preferences" : ""}.` : "Only essential cookies."}</p>
        <Button variant="secondary" onClick={openCookieSettings}>
          Change cookie settings
        </Button>
      </div>
    </Panel>
  );
}

function Privacy() {
  const me = useMyProfile();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [v, setV] = useState<PrivacySettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!v && me.data) setV(me.data.privacy);
  const dirty = !!v && JSON.stringify(v) !== JSON.stringify(me.data?.privacy);

  return (
    <Panel>
      <PanelHeader title="Privacy" sub="Your exact location and address are never shown to anyone." />
      <div className="px-6 pb-6">
        {!v ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            {err && <Notice tone="bad" className="mb-4">{err}</Notice>}
            <PrivacyControls value={v} onChange={(x) => { setV(x); setSaved(false); }} />
            <div className="mt-6 flex items-center justify-end gap-3">
              <AnimatePresence>{saved && <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-sm text-ok">Saved</motion.span>}</AnimatePresence>
              <Button
                disabled={!dirty}
                loading={busy}
                onClick={async () => {
                  if (v.privateDiscovery && !me.data!.privacy.privateDiscovery && !(await confirm({ title: "Turn on private discovery?", body: "You will disappear from Discover. Only people you like or connect with will be able to see your profile.", confirmLabel: "Turn on" }))) return;
                  setBusy(true);
                  setErr(null);
                  try {
                    await api.profile.save({ ...me.data!, privacy: v });
                    await qc.invalidateQueries({ queryKey: qk.myProfile });
                    setSaved(true);
                  } catch (e) {
                    setErr(errorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Save privacy
              </Button>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

function Trusted() {
  const list = useTrusted();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: qk.trusted });

  return (
    <Panel>
      <PanelHeader
        title="Trusted contacts"
        sub="People we can share your booking plans with, and who you can alert during a meeting."
        action={
          !adding && (list.data?.length ?? 0) < 5 && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Icon icon={Add01Icon} size={15} /> Add
            </Button>
          )
        }
      />
      <div className="space-y-3 px-6 pb-6">
        {list.data?.length === 0 && !adding && <p className="rounded-[10px] bg-char px-4 py-5 text-center text-sm text-mute">No trusted contacts yet. Add a friend or family member you trust.</p>}
        <AnimatePresence initial={false}>
          {list.data?.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className="flex items-center gap-4 rounded-[10px] bg-char p-4">
              <span className="grid size-11 place-items-center rounded-full bg-ok/15 text-ok">
                <Icon icon={Call02Icon} size={18} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-xs text-mute">
                  {c.relation || "Contact"} · {c.phone}
                </span>
              </span>
              <IconButton
                icon={Delete02Icon}
                label={`Remove ${c.name}`}
                onClick={async () => {
                  if (!(await confirm({ title: `Remove ${c.name}?`, body: "They will no longer be told about your bookings or receive safety alerts from you.", confirmLabel: "Remove", tone: "danger" }))) return;
                  await api.safety.removeTrustedContact(c.id);
                  refresh();
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {adding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              onSubmit={async (e) => {
                e.preventDefault();
                setErr(null);
                try {
                  await api.safety.saveTrustedContact(form);
                  setForm({ name: "", phone: "", relation: "" });
                  setAdding(false);
                  refresh();
                } catch (x) {
                  setErr(errorMessage(x));
                }
              }}
            >
              <div className="grid gap-4 rounded-[10px] bg-char/60 p-4 sm:grid-cols-3">
                {err && <Notice tone="bad" className="sm:col-span-3">{err}</Notice>}
                <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
                <Field label="Phone">{(id) => <Input id={id} type="tel" placeholder="+234…" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
                <Field label="Relation" optional>{(id) => <Input id={id} placeholder="Sister" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />}</Field>
                <div className="flex justify-end gap-2 sm:col-span-3">
                  <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save contact</Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

function Account() {
  const { account } = useSession();
  const confirm = useConfirm();
  const signOut = useSignOut();
  const [deleteNote, setDeleteNote] = useState(false);
  if (!account) return null;
  const rows = [
    ["Username", `@${account.username}`],
    ["Email", account.email],
    ["Phone", account.phone],
    ["Codes sent by", account.otpChannel === "sms" ? "SMS" : "Email"],
  ];
  return (
    <Panel>
      <PanelHeader title="Account" />
      <div className="px-6 pb-6">
        <dl className="divide-y divide-line rounded-[10px] bg-char">
          {rows.map(([k, val]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3.5 text-[14.5px]">
              <dt className="text-mute">{k}</dt>
              <dd className="truncate font-medium">{val}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/forgot-password" className="rounded-full bg-char px-4 py-2.5 text-sm font-medium hover:bg-smoke">
            Change password
          </Link>
          <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-full bg-char px-4 py-2.5 text-sm font-medium hover:bg-smoke">
            <Icon icon={Logout03Icon} size={16} /> Sign out
          </button>
        </div>
        <div className="mt-8 rounded-[10px] bg-bad/8 p-5">
          <p className="font-semibold text-bad">Delete account</p>
          <p className="mt-1 text-sm text-mute">Permanently remove your profile, connections and messages. Booking and payment records are kept as the law requires.</p>
          {deleteNote && <Notice tone="warn" className="mt-4">Account deletion is not connected yet. Contact support to delete your account.</Notice>}
          <Button
            variant="danger"
            className="mt-4"
            onClick={async () => {
              const ok = await confirm({ title: "Delete your account?", body: "This permanently deletes your profile, photos, connections and messages. It cannot be undone.", confirmLabel: "Delete account", tone: "danger" });
              // TODO(team): account deletion endpoint and data-retention rules.
              if (ok) setDeleteNote(true);
            }}
          >
            <Icon icon={Delete02Icon} size={16} /> Delete my account
          </Button>
        </div>
      </div>
    </Panel>
  );
}
