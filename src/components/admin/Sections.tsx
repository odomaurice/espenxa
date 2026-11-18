"use client";

/*
 * Staff console sections. Every decision asks for confirmation and a
 * recorded reason, and lands in the audit log.
 */
import { CheckmarkBadge01Icon, File01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import Flag from "@/components/Flag";
import { useSession } from "@/components/Providers";
import { Avatar, Badge, Button, cx, Dialog, EmptyState, ErrorState, errorMessage, Icon, Input, Notice, PageHeader, Select, Skeleton, Switch, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { Market, MarketFeature, MarketStatus, VerificationCase, VerificationDecision } from "@/lib/api/types";
import { COUNTRIES_BY_NAME, countryByCode } from "@/lib/countries";
import { dateOnly, timeAgo } from "@/lib/format";
import { ID_TYPES, MARKET_FEATURES, MARKET_STATUS, staffCan, staffRoleLabel, VERIFICATION } from "@/lib/labels";

const useAdmin = <T,>(key: string, fn: () => Promise<T>) => useQuery({ queryKey: ["admin", key], queryFn: fn });

/* ---- verification --------------------------------------------------------------- */

export function VerificationQueue() {
  const q = useAdmin("verification", api.admin.verificationQueue);
  const [open, setOpen] = useState<{
    c: VerificationCase;
    d: VerificationDecision;
  } | null>(null);
  return (
    <div>
      <PageHeader title="Verification" sub="Open each submission, compare the ID and selfie with the profile, then decide. Every document view is recorded in the audit log." />
      {q.isPending ? (
        <Skeleton className="h-48" />
      ) : q.isError ? (
        <ErrorState error={q.error} />
      ) : !q.data.length ? (
        <EmptyState icon={CheckmarkBadge01Icon} title="Queue is clear" body="New submissions appear here as people finish onboarding." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {q.data.map((c) => (
              <motion.li key={c.userId} layout exit={{ opacity: 0, x: 40 }} className="surface rounded-[26px] p-5">
                <div className="flex items-center gap-4">
                  <Avatar src={c.photo ?? undefined} name={c.name} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-mute">
                      @{c.username} · {c.role === "companion" ? "Companion" : "Member"} · {c.age} · {countryByCode(c.country)?.name}
                    </p>
                  </div>
                  <Badge tone={VERIFICATION[c.status].tone}>{VERIFICATION[c.status].label}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-char p-3">
                    <p className="text-xs text-mute">Document</p>
                    <p className="mt-0.5 font-medium">{ID_TYPES.find((t) => t.id === c.documentType)?.label ?? "Missing"}</p>
                    <p className="text-xs text-mute">{c.documentCountry ? `${countryByCode(c.documentCountry)?.name}${c.hasBack ? ", front and back" : ""}` : ""}</p>
                  </div>
                  <div className="rounded-2xl bg-char p-3">
                    <p className="text-xs text-mute">Selfie</p>
                    <p className="mt-0.5 font-medium">{c.selfie ? "Submitted" : "Missing"}</p>
                    <p className="text-xs text-mute">{c.submittedAt ? timeAgo(c.submittedAt) : ""}</p>
                  </div>
                </div>
                <Link href={`/admin/verification/${c.userId}`} className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-cream text-sm font-semibold text-ink transition-colors hover:bg-cream/85">
                  <Icon icon={File01Icon} size={16} /> Review documents and selfie
                </Link>
                <p className="mt-2 text-center text-[11px] text-faint">Partner checks (face match, liveness, authenticity) appear once a KYC provider is connected.</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setOpen({ c, d: "reject" })}>
                    Reject
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setOpen({ c, d: "needs_info" })}>
                    Ask for more
                  </Button>
                  <Button size="sm" variant="accent" onClick={() => setOpen({ c, d: "approve" })}>
                    Approve
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {open && <DecisionDialog c={open.c} d={open.d} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DecisionDialog({ c, d, onClose }: { c: VerificationCase; d: VerificationDecision; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const title = d === "approve" ? `Approve ${c.name}?` : d === "reject" ? `Reject ${c.name}?` : `Ask ${c.name} for more?`;
  return (
    <Dialog open onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-mute">{d === "approve" ? "Their account opens immediately and they get a verified badge." : "They will see your note and must resubmit their ID and selfie before they can use espenxa."}</p>
        {err && <Notice tone="bad">{err}</Notice>}
        <Textarea aria-label="Note" rows={3} placeholder={d === "approve" ? "Optional note for the audit log" : "Tell them what to fix, e.g. the photo was blurred."} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={d === "approve" ? "accent" : "danger"}
            size="lg"
            className={d === "reject" ? "bg-bad! text-white!" : undefined}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await api.admin.decide(c.userId, d, note);
                await qc.invalidateQueries({ queryKey: ["admin"] });
                onClose();
              } catch (e) {
                setErr(errorMessage(e));
                setBusy(false);
              }
            }}
          >
            {d === "approve" ? "Approve" : d === "reject" ? "Reject" : "Send request"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---- users -------------------------------------------------------------------------- */

export function Users() {
  const [query, setQuery] = useState("");
  const list = useQuery({
    queryKey: ["admin", "users", query],
    queryFn: () => api.admin.users(query),
  });
  const [target, setTarget] = useState<{
    id: string;
    name: string;
    suspend: boolean;
  } | null>(null);
  return (
    <div>
      <PageHeader title="Users" sub="Search accounts, check status, suspend or reactivate with a recorded reason." />
      <div className="relative mb-5">
        <Icon icon={Search01Icon} size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
        <Input aria-label="Search users" placeholder="Name, @username or email" className="pl-11" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : (
        <>
          <ul className="space-y-2 sm:hidden">
            {list.data.map((u) => (
              <li key={u.id} className="surface flex items-center gap-3 rounded-[22px] p-3.5">
                <Link href={`/admin/users/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={u.photo ?? undefined} name={u.name} size={44} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14.5px] font-semibold">{u.name}</span>
                      <Flag code={u.country} className="h-3 w-4.5 shrink-0" />
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {u.staff.length ? <Badge tone="info">{staffRoleLabel(u.staff[0])}</Badge> : <Badge>{u.role === "companion" ? "Companion" : "Member"}</Badge>}
                      <Badge tone={VERIFICATION[u.verification].tone}>{VERIFICATION[u.verification].label}</Badge>
                    </span>
                  </span>
                </Link>
                {!u.staff.length && (
                  <Button
                    size="sm"
                    variant={u.verification === "suspended" ? "secondary" : "danger"}
                    onClick={() =>
                      setTarget({
                        id: u.id,
                        name: u.name,
                        suspend: u.verification !== "suspended",
                      })
                    }
                  >
                    {u.verification === "suspended" ? "Reactivate" : "Suspend"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="surface hidden overflow-x-auto rounded-[24px] sm:block">
            <table className="w-full min-w-190 text-sm">
              <thead className="text-left text-xs text-mute">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Person</th>
                  <th className="px-3 py-3.5 font-medium">Role</th>
                  <th className="px-3 py-3.5 font-medium">Country</th>
                  <th className="px-3 py-3.5 font-medium">Status</th>
                  <th className="px-3 py-3.5 font-medium">Joined</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-char/50">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar src={u.photo ?? undefined} name={u.name} size={36} />
                        <span>
                          <Link href={`/admin/users/${u.id}`} className="block font-medium hover:underline">
                            {u.name}
                          </Link>
                          <span className="block text-xs text-mute">@{u.username}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3">{u.staff.length ? <Badge tone="info">{staffRoleLabel(u.staff[0])}</Badge> : u.role === "companion" ? "Companion" : "Member"}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <Flag code={u.country} className="h-3.5 w-5" /> {u.country}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={VERIFICATION[u.verification].tone}>{VERIFICATION[u.verification].label}</Badge>
                    </td>
                    <td className="px-3 py-3 text-mute">{dateOnly(u.joinedAt)}</td>
                    <td className="px-5 py-3 text-right">
                      {!u.staff.length && (
                        <Button
                          size="sm"
                          variant={u.verification === "suspended" ? "secondary" : "danger"}
                          onClick={() =>
                            setTarget({
                              id: u.id,
                              name: u.name,
                              suspend: u.verification !== "suspended",
                            })
                          }
                        >
                          {u.verification === "suspended" ? "Reactivate" : "Suspend"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {target && <SuspendDialog {...target} onClose={() => setTarget(null)} />}
    </div>
  );
}

function SuspendDialog({ id, name, suspend, onClose }: { id: string; name: string; suspend: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={suspend ? `Suspend ${name}?` : `Reactivate ${name}?`}>
      <div className="space-y-4">
        <p className="text-sm text-mute">{suspend ? "They will be signed out and unable to use espenxa until reactivated. They can appeal." : "They will be able to sign in and use espenxa again."}</p>
        {err && <Notice tone="bad">{err}</Notice>}
        <Textarea aria-label="Reason" rows={3} placeholder="Reason (recorded in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={suspend ? "danger" : "primary"}
            className={suspend ? "bg-bad! text-white!" : undefined}
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await api.admin.setSuspended(id, suspend, reason);
                await qc.invalidateQueries({ queryKey: ["admin"] });
                onClose();
              } catch (e) {
                setErr(errorMessage(e));
                setBusy(false);
              }
            }}
          >
            {suspend ? "Suspend" : "Reactivate"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---- markets --------------------------------------------------------------------------- */

export function Markets() {
  const list = useAdmin("markets", api.admin.markets);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function change(m: Market, patch: Partial<Pick<Market, "status" | "features">>, label: string) {
    const name = countryByCode(m.country)?.name ?? m.country;
    const ok = await confirm({
      title: `${label} in ${name}?`,
      body: "This changes what people in this country can do immediately, and is recorded in the audit log.",
      confirmLabel: "Apply change",
      tone: "danger",
    });
    if (!ok) return;
    setErr(null);
    try {
      await api.admin.updateMarket(m.country, patch, label);
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await qc.invalidateQueries({ queryKey: ["markets"] });
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  const rows = (list.data ?? []).filter((m) => countryByCode(m.country)?.name.toLowerCase().includes(q.toLowerCase()));
  rows.sort((a, b) => (countryByCode(a.country)?.name ?? "").localeCompare(countryByCode(b.country)?.name ?? ""));

  return (
    <div>
      <PageHeader title="Markets" sub="All 55 African Union member states. Each feature switches on independently once legal, payment and verification partners are ready." />
      {err && (
        <Notice tone="bad" className="mb-4">
          {err}
        </Notice>
      )}
      <div className="relative mb-5">
        <Icon icon={Search01Icon} size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
        <Input aria-label="Search countries" placeholder={`Search ${COUNTRIES_BY_NAME.length} countries`} className="pl-11" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.isPending ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : (
        <div className="surface overflow-x-auto rounded-[24px]">
          <table className="w-full min-w-225 text-sm">
            <thead className="text-left text-xs text-mute">
              <tr>
                <th className="px-5 py-3.5 font-medium">Country</th>
                <th className="px-3 py-3.5 font-medium">Status</th>
                {MARKET_FEATURES.map((f) => (
                  <th key={f.id} className="px-3 py-3.5 text-center font-medium">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((m) => {
                const c = countryByCode(m.country)!;
                return (
                  <tr key={m.country} className="transition-colors hover:bg-char/50">
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-3">
                        <Flag code={c.code} className="h-4 w-6" />
                        <span>
                          <span className="block font-medium">{c.name}</span>
                          <span className="block text-xs text-mute">{m.currency}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        aria-label={`${c.name} status`}
                        className="h-9 w-auto min-w-40 text-[13px]"
                        value={m.status}
                        onChange={(e) => change(m, { status: e.target.value as MarketStatus }, `Set status to ${MARKET_STATUS[e.target.value as MarketStatus]}`)}
                      >
                        {(Object.keys(MARKET_STATUS) as MarketStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {MARKET_STATUS[s]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    {MARKET_FEATURES.map((f) => (
                      <td key={f.id} className="px-3 py-2.5 text-center">
                        <span className="inline-flex">
                          <Switch label={`${f.label} in ${c.name}`} on={m.features[f.id as MarketFeature]} onChange={(on) => change(m, { features: { ...m.features, [f.id]: on } }, `${on ? "Enable" : "Disable"} ${f.label.toLowerCase()}`)} />
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---- audit ---------------------------------------------------------------------------- */

export function Audit() {
  const { account } = useSession();
  const list = useAdmin("audit", api.admin.audit);
  if (account && !staffCan(account.roles, "audit")) return null;
  return (
    <div>
      <PageHeader title="Audit log" sub="Every staff decision, who made it and why." />
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : (
        <ul className="surface divide-y divide-line rounded-[24px]">
          {list.data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <span>
                <span className="block font-medium">
                  {a.action} <span className="text-mute">· {a.target}</span>
                </span>
                <span className="mt-0.5 block text-sm text-mute">{a.reason}</span>
              </span>
              <span className={cx("text-right text-xs text-faint")}>
                <span className="block text-cream/80">{a.actor}</span>
                {staffRoleLabel(a.role)} · {timeAgo(a.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
