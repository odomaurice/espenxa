"use client";

import { Cancel01Icon, FilterHorizontalIcon, FireIcon, GridViewIcon, Location01Icon, Search01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import PhotoCard, { PhotoCardSkeleton } from "@/components/people/PhotoCard";
import { useSession } from "@/components/Providers";
import { Button, EmptyState, ErrorState, Icon, IconButton, Input, Skeleton, Tabs } from "@/components/ui";
import { useCategories, useDiscovery, useMyProfile } from "@/lib/api/hooks";
import type { DiscoveryFilters, DiscoveryMode } from "@/lib/api/types";
import { countryByCode } from "@/lib/countries";
import { hoursLabel, money } from "@/lib/format";
import { arrangementLabel, genderLabel, intentionLabel, languageName, rankLabel } from "@/lib/labels";
import FiltersDialog, { countFilters } from "./Filters";
import NearbyMap from "./NearbyMap";
import SwipeDeck from "./SwipeDeck";

const MODES = ["for_you", "browse", "nearby"] as const;

/** One removable chip per active filter, like the Explore reference. */
function useFilterChips(f: DiscoveryFilters, set: (f: DiscoveryFilters) => void) {
  const cats = useCategories();
  const chips: { key: string; label: string; clear: () => void }[] = [];
  const drop = (k: keyof DiscoveryFilters) => () => set({ ...f, [k]: undefined });
  if (f.ageMin || f.ageMax) chips.push({ key: "age", label: `${f.ageMin ?? 18} to ${f.ageMax ?? 99} y.o.`, clear: () => set({ ...f, ageMin: undefined, ageMax: undefined }) });
  f.genders?.forEach((g) => chips.push({ key: `g${g}`, label: genderLabel(g), clear: () => set({ ...f, genders: f.genders!.filter((x) => x !== g) }) }));
  f.intentions?.forEach((i) => chips.push({ key: `i${i}`, label: intentionLabel(i), clear: () => set({ ...f, intentions: f.intentions!.filter((x) => x !== i) }) }));
  f.categories?.forEach((c) => chips.push({ key: `c${c}`, label: cats.data?.find((x) => x.id === c)?.name ?? c, clear: () => set({ ...f, categories: f.categories!.filter((x) => x !== c) }) }));
  f.interests?.forEach((i) => chips.push({ key: `n${i}`, label: i, clear: () => set({ ...f, interests: f.interests!.filter((x) => x !== i) }) }));
  f.languages?.forEach((l) => chips.push({ key: `l${l}`, label: languageName(l), clear: () => set({ ...f, languages: f.languages!.filter((x) => x !== l) }) }));
  f.durations?.forEach((d) => chips.push({ key: `d${d}`, label: hoursLabel(d), clear: () => set({ ...f, durations: f.durations!.filter((x) => x !== d) }) }));
  if (f.country) chips.push({ key: "country", label: countryByCode(f.country)?.name ?? f.country, clear: drop("country") });
  if (f.city) chips.push({ key: "city", label: f.city, clear: drop("city") });
  if (f.maxKm) chips.push({ key: "km", label: `Within ${f.maxKm} km`, clear: drop("maxKm") });
  if (f.arrangement) chips.push({ key: "arr", label: arrangementLabel(f.arrangement), clear: drop("arrangement") });
  if (f.minRank) chips.push({ key: "rank", label: `${rankLabel(f.minRank)}+`, clear: drop("minRank") });
  if (f.budget) chips.push({ key: "budget", label: `Up to ${money(f.budget)}`, clear: drop("budget") });
  if (f.providersOnly) chips.push({ key: "prov", label: "Providers", clear: drop("providersOnly") });
  if (f.verifiedOnly) chips.push({ key: "ver", label: "Verified", clear: drop("verifiedOnly") });
  return chips;
}

export default function Discover() {
  const { account } = useSession();
  const me = useMyProfile();
  const params = useSearchParams();
  const initialMode = (MODES as readonly string[]).includes(params.get("mode") ?? "") ? (params.get("mode") as DiscoveryMode) : "for_you";
  const [mode, setMode] = useState<DiscoveryMode>(initialMode);
  const [filters, setFilters] = useState<DiscoveryFilters>(params.get("providers") ? { providersOnly: true } : {});
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const effective = mode === "browse" && query.trim() ? { ...filters, query: query.trim() } : filters;
  const list = useDiscovery(mode, effective);
  const n = countFilters(filters);
  const chips = useFilterChips(filters, setFilters);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="display hidden text-[40px] md:block">{mode === "browse" ? "Explore" : mode === "nearby" ? "Nearby" : "Discover"}</h1>
        <Tabs
          value={mode}
          onChange={setMode}
          items={[
            { id: "for_you", label: "For you", icon: FireIcon },
            { id: "browse", label: "Explore", icon: GridViewIcon },
            { id: "nearby", label: "Nearby", icon: Location01Icon },
          ]}
        />
        <div className="relative">
          <IconButton icon={FilterHorizontalIcon} label="Filters" tone="filled" onClick={() => setFiltersOpen(true)} />
          {n > 0 && <span className="pointer-events-none absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-ember text-[10px] font-bold text-ink">{n}</span>}
        </div>
      </div>

      {mode === "browse" && (
        <div className="relative mb-4">
          <Icon icon={Search01Icon} size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
          <Input aria-label="Search people" placeholder="Search names, cities, interests" className="pl-11" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {chips.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.clear} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-char pr-4 pl-3 text-[13.5px] font-medium hover:bg-smoke" aria-label={`Remove filter ${c.label}`}>
              <Icon icon={Cancel01Icon} size={14} stroke={2.2} className="text-mute" />
              {c.label}
            </button>
          ))}
          <button type="button" onClick={() => setFilters({})} className="h-10 shrink-0 px-2 text-[13px] text-mute hover:text-cream">
            Clear all
          </button>
        </div>
      )}

      {list.isPending ? (
        mode === "for_you" ? (
          <Skeleton className="mx-auto aspect-[3/4.3] w-full max-w-[440px] rounded-[36px] lg:mx-0" />
        ) : mode === "nearby" ? (
          <Skeleton className="aspect-[16/11] w-full rounded-[32px]" />
        ) : (
          <Grid>
            {Array.from({ length: 8 }).map((_, i) => (
              <PhotoCardSkeleton key={i} />
            ))}
          </Grid>
        )
      ) : list.isError ? (
        <ErrorState error={list.error} retry={() => list.refetch()} />
      ) : mode === "for_you" ? (
        <SwipeDeck key={JSON.stringify(filters)} people={list.data} onOpenFilters={() => setFiltersOpen(true)} />
      ) : list.data.length === 0 ? (
        <EmptyState
          icon={mode === "nearby" ? Location01Icon : UserGroupIcon}
          title={mode === "nearby" ? "No one nearby right now" : "No one matches these filters"}
          body={mode === "nearby" ? "Nearby only shows people who share an approximate distance. Try Explore to see your whole country." : "Try removing a filter or two."}
          action={
            n > 0 ? (
              <Button variant="secondary" onClick={() => setFilters({})}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : mode === "nearby" ? (
        <NearbyMap people={list.data} selfPhoto={me.data?.photos[0]} />
      ) : (
        <Grid>
          {list.data.map((p) => (
            <PhotoCard key={p.id} p={p} />
          ))}
        </Grid>
      )}

      {account && <FiltersDialog key={String(filtersOpen)} open={filtersOpen} onClose={() => setFiltersOpen(false)} value={filters} onApply={setFilters} homeCountry={account.country} />}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
