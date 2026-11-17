/*
 * Country flag from public/flags/<ISO>.svg (one file per African Union
 * member state, copied from the country-flag-icons set). Static files keep
 * all 55 flags out of the JavaScript bundle.
 */
export default function Flag({ code, className = "h-4 w-6" }: { code: string; className?: string }) {
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed
    <img src={`/flags/${code}.svg`} alt="" aria-hidden className={`shrink-0 rounded-[3px] object-cover ${className}`} />
  );
}
