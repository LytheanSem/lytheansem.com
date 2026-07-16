import Reveal from "./Reveal";
import LeafMark from "./LeafMark";

export default function SectionHeading({ en, sub }: { en: string; sub?: string }) {
  return (
    <Reveal className="mb-16">
      <div className="flex items-end gap-5">
        <LeafMark className="h-12 -translate-y-1 rotate-[24deg] text-momiji-500 md:h-14" />
        <div>
          <h2 className="font-display text-3xl font-bold tracking-wide text-paper md:text-5xl">
            {en}
          </h2>
          {sub && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.35em] text-ink-300">
              {sub}
            </p>
          )}
        </div>
      </div>
      <div className="rule-fade mt-6" />
    </Reveal>
  );
}
