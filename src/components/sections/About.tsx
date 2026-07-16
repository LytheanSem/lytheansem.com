import { skills, virtues } from "@/data/portfolio";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

export default function About() {
  return (
    <section id="about" className="relative z-10 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 pt-28">
        <SectionHeading en="The Way" sub="about me" />

        <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <div className="space-y-5 text-[15px] leading-relaxed text-ink-200">
              <p>
                I&apos;m <span className="text-paper">Lythean Sem</span> — friends call me{" "}
                <span className="text-paper">Zen</span> — a full-stack engineer from Phnom
                Penh, Cambodia.
              </p>
              <p>
                I learned to build software the honest way: by shipping systems that real
                people depend on every day — retail counters that can&apos;t stop mid-sale,
                platforms handling sensitive data, tools used by teams who don&apos;t care
                what framework it is, only that it works. If it breaks, someone&apos;s day
                breaks with it. So it doesn&apos;t break.
              </p>
              <p>
                That responsibility shaped how I work. I care about software that stays calm:
                offline-first when the network wobbles, bilingual when the team is, encrypted
                when the stakes demand it, and fast everywhere — because in the real world,
                nobody waits for a spinner.
              </p>
              <p className="pt-4 font-display text-xl italic text-momiji-300/90">— Zen</p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="grid gap-3">
              {virtues.map((v) => (
                <div
                  key={v.numeral}
                  className="group flex gap-5 border border-ink-800 p-5 transition-colors hover:border-momiji-600/50"
                >
                  <span className="min-w-[2.2rem] font-display text-3xl font-bold leading-none text-momiji-500/80 transition-colors group-hover:text-momiji-400">
                    {v.numeral}
                  </span>
                  <div>
                    <p className="font-display text-base font-bold text-paper">{v.title}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-200">
                      {v.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* skills */}
        <Reveal className="mt-20">
          <div className="grid gap-px overflow-hidden border border-ink-800 bg-ink-800 sm:grid-cols-3">
            {skills.map((s) => (
              <div key={s.title} className="bg-ink-950 p-7">
                <h3 className="flex items-center gap-3 font-display text-sm font-bold uppercase tracking-[0.25em] text-paper">
                  <span className="font-mono text-[11px] font-normal text-momiji-500" aria-hidden>
                    {s.index}
                  </span>
                  {s.title}
                </h3>
                <ul className="mt-5 space-y-2">
                  {s.items.map((item) => (
                    <li key={item} className="font-mono text-[12px] text-ink-200">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
