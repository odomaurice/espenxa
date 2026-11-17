import Wordmark from "@/components/Wordmark";
import { Photo } from "@/components/ui";
import { SITE } from "@/lib/site";

// AI-generated people (public/people). Decorative only.
const COLLAGE = ["amara", "kai", "mei", "dami", "nia", "marcus"];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line lg:sticky lg:top-0 lg:block lg:h-dvh" aria-hidden>
        <div className="absolute inset-0 grid grid-cols-3 gap-3 p-3 opacity-90">
          {[0, 1, 2].map((col) => (
            <div key={col} className={col === 1 ? "-mt-24 space-y-3" : "space-y-3"}>
              {COLLAGE.slice(col * 2, col * 2 + 2).map((p) => (
                <Photo key={p} src={`/people/${p}.webp`} alt="" className="aspect-3/4 w-full rounded-2xl" />
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="display max-w-md text-6xl leading-[0.92]">Good company, wherever you are in Africa.</p>
          <p className="mt-4 max-w-sm text-[15px] text-mute">{SITE.description}</p>
        </div>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Wordmark />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-faint">
          {SITE.name} is for adults aged {SITE.minAge} and over.
        </p>
      </main>
    </div>
  );
}
