"use client";

import { useState } from "react";
import { Button, Chip, Dialog, Field, Input, Select, Switch } from "@/components/ui";
import { useCategories, useMarkets } from "@/lib/api/hooks";
import { DURATIONS, type Arrangement, type DiscoveryFilters, type Gender, type Rank } from "@/lib/api/types";
import { COUNTRIES_BY_NAME, countryByCode } from "@/lib/countries";
import { currencySymbol, hoursLabel, toMinor } from "@/lib/format";
import { ARRANGEMENTS, GENDERS, INTENTIONS, INTEREST_SUGGESTIONS, LANGUAGE_NAMES, RANKS } from "@/lib/labels";

export function countFilters(f: DiscoveryFilters): number {
  return Object.entries(f).filter(([k, v]) => k !== "query" && v !== undefined && !(Array.isArray(v) && !v.length) && v !== false).length;
}

const toggle = <T,>(list: T[] | undefined, v: T) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

export default function FiltersDialog({ open, onClose, value, onApply, homeCountry }: { open: boolean; onClose: () => void; value: DiscoveryFilters; onApply: (f: DiscoveryFilters) => void; homeCountry: string }) {
  const [f, setF] = useState<DiscoveryFilters>(value);
  const [budget, setBudget] = useState("");
  const cats = useCategories();
  const markets = useMarkets();
  const set = (p: Partial<DiscoveryFilters>) => setF((s) => ({ ...s, ...p }));
  const country = countryByCode(f.country ?? homeCountry)!;
  const openDiscovery = new Set(markets.data?.filter((m) => m.features.discovery).map((m) => m.country));

  return (
    <Dialog open={open} onClose={onClose} title="Filters" wide>
      <div className="space-y-7">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Country">
            {(id) => (
              <Select id={id} value={f.country ?? ""} onChange={(e) => set({ country: e.target.value || undefined })}>
                <option value="">All open countries</option>
                {COUNTRIES_BY_NAME.filter((c) => openDiscovery.has(c.code)).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="City" optional>
            {(id) => <Input id={id} list="filter-cities" value={f.city ?? ""} onChange={(e) => set({ city: e.target.value || undefined })} />}
          </Field>
          <datalist id="filter-cities">
            {country.cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field label="Age range">
            {(id) => (
              <div className="flex items-center gap-2">
                <Input id={id} type="number" min={18} max={99} placeholder="18" value={f.ageMin ?? ""} onChange={(e) => set({ ageMin: e.target.value ? Math.max(18, Number(e.target.value)) : undefined })} />
                <span className="text-mute">to</span>
                <Input aria-label="Maximum age" type="number" min={18} max={99} placeholder="99" value={f.ageMax ?? ""} onChange={(e) => set({ ageMax: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            )}
          </Field>
          <Field label="Distance" hint="Approximate, from your city.">
            {(id) => (
              <Select id={id} value={f.maxKm ?? ""} onChange={(e) => set({ maxKm: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Any distance</option>
                {[5, 10, 25, 50, 100].map((k) => (
                  <option key={k} value={k}>
                    Within about {k} km
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </section>

        <section>
          <h3 className="mb-2.5 text-[13px] font-medium">Show me</h3>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <Chip key={g.id} on={!!f.genders?.includes(g.id)} onClick={() => set({ genders: toggle<Gender>(f.genders, g.id) })}>
                {g.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-[13px] font-medium">Looking for</h3>
          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map((i) => (
              <Chip key={i.id} on={!!f.intentions?.includes(i.id)} onClick={() => set({ intentions: toggle(f.intentions, i.id) })}>
                {i.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-ink/60 p-4 ring-1 ring-inset ring-line">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[13px] font-medium">Only people offering experiences</h3>
              <p className="text-xs text-mute">Companions you can book for a planned experience.</p>
            </div>
            <Switch label="Providers only" on={!!f.providersOnly} onChange={(v) => set({ providersOnly: v || undefined })} />
          </div>
          <div className="mt-5 space-y-5">
            <div>
              <h4 className="mb-2 text-xs text-mute">Experiences</h4>
              <div className="flex flex-wrap gap-2">
                {cats.data?.map((c) => (
                  <Chip key={c.id} on={!!f.categories?.includes(c.id)} onClick={() => set({ categories: toggle(f.categories, c.id) })}>
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Arrangement">
                {(id) => (
                  <Select id={id} value={f.arrangement ?? ""} onChange={(e) => set({ arrangement: (e.target.value || undefined) as Arrangement | undefined })}>
                    <option value="">Free or paid</option>
                    {ARRANGEMENTS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Minimum level">
                {(id) => (
                  <Select id={id} value={f.minRank ?? ""} onChange={(e) => set({ minRank: (e.target.value || undefined) as Rank | undefined })}>
                    <option value="">Any level</option>
                    {RANKS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} and above
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={`Budget (${currencySymbol(country.currency)})`} hint="Per booking">
                {(id, d) => <Input id={id} aria-describedby={d} inputMode="decimal" placeholder="Any" value={budget} onChange={(e) => setBudget(e.target.value)} />}
              </Field>
            </div>
            <div>
              <h4 className="mb-2 text-xs text-mute">Durations</h4>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((h) => (
                  <Chip key={h} on={!!f.durations?.includes(h)} onClick={() => set({ durations: toggle(f.durations, h) })}>
                    {hoursLabel(h)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-[13px] font-medium">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {INTEREST_SUGGESTIONS.slice(0, 24).map((i) => (
              <Chip key={i} on={!!f.interests?.includes(i)} onClick={() => set({ interests: toggle(f.interests, i) })}>
                {i}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-[13px] font-medium">Speaks</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
              <Chip key={code} on={!!f.languages?.includes(code)} onClick={() => set({ languages: toggle(f.languages, code) })}>
                {name}
              </Chip>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">Verified profiles only</span>
          <Switch label="Verified only" on={!!f.verifiedOnly} onChange={(v) => set({ verifiedOnly: v || undefined })} />
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-between gap-2 border-t border-line bg-coal px-5 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              setF({});
              setBudget("");
            }}
          >
            Clear all
          </Button>
          <Button
            onClick={() => {
              const minor = budget ? toMinor(budget, country.currency) : null;
              onApply({ ...f, budget: minor ? { amountMinor: minor, currency: country.currency } : undefined });
              onClose();
            }}
          >
            Show results
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
