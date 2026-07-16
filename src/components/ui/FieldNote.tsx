import Link from "next/link";
import LeafMark from "./LeafMark";
import IgniteLeaf from "./IgniteLeaf";
import { site } from "@/data/portfolio";

export type FieldNoteData = {
  slug: string;
  project: string;
  title: string;
  deck: string;
  meta: { label: string; value: string }[];
  sections: { heading: string; body: string[]; pull?: string }[];
};

/** Shared long-form layout for project case studies ("field notes"). */
export default function FieldNote({ note }: { note: FieldNoteData }) {
  return (
    <div className="min-h-screen bg-ink-950">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          aria-label="Lythean Sem — back to the field"
          className="group flex items-center gap-3"
        >
          <span className="hanko h-8 w-8" aria-hidden>
            <LeafMark className="h-4 rotate-[24deg] transition-transform duration-500 group-hover:rotate-[80deg]" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-200 transition-colors group-hover:text-momiji-300">
            ← Back to the field
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-28 pt-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-momiji-300">
          Field note — {note.project}
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-paper md:text-5xl">
          {note.title}
        </h1>
        <p className="mt-5 max-w-2xl font-display text-lg leading-relaxed text-momiji-300/90">
          {note.deck}
        </p>

        <dl className="mt-10 grid gap-px overflow-hidden border border-ink-800 bg-ink-800 sm:grid-cols-4">
          {note.meta.map((m) => (
            <div key={m.label} className="bg-ink-950 p-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-300">
                {m.label}
              </dt>
              <dd className="mt-2 text-[13px] leading-snug text-paper/90">{m.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 space-y-14">
          {note.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="flex items-center gap-3 font-display text-2xl font-bold text-paper">
                {/* ignites as the reader passes it — a trail through the note */}
                <IgniteLeaf className="h-5 rotate-[24deg]" />
                {s.heading}
              </h2>
              <div className="mt-5 space-y-5">
                {s.body.map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.85] text-ink-200">
                    {p}
                  </p>
                ))}
              </div>
              {s.pull && (
                <blockquote className="mt-8 border-l-2 border-momiji-600 pl-6 font-display text-xl leading-relaxed text-paper/90">
                  {s.pull}
                </blockquote>
              )}
            </section>
          ))}
        </div>

        <div className="rule-fade mt-20" />
        <div className="mt-10 flex flex-wrap items-center gap-8">
          <Link
            href="/#works"
            className="border border-momiji-600/60 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-momiji-300 transition-all hover:border-momiji-400 hover:bg-momiji-600/10"
          >
            ← All works
          </Link>
          <a
            href={`mailto:${site.email}`}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-200 underline decoration-ink-500 underline-offset-8 transition-colors hover:text-paper hover:decoration-momiji-500"
          >
            {site.email}
          </a>
        </div>
      </main>
    </div>
  );
}
