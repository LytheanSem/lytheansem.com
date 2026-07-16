import { site } from "@/data/portfolio";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import LeafMark from "@/components/ui/LeafMark";

export default function Contact() {
  return (
    <section id="contact" className="relative z-10 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 pt-28">
        <SectionHeading en="Let's Talk" sub="the ties that bind" />

        <Reveal className="pb-28">
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-200">
            Have a product to build, a system to steady, or an idea that needs a calm pair of
            hands? My inbox is open.
          </p>
          <a
            href={`mailto:${site.email}`}
            className="group mt-10 inline-block break-all font-display text-3xl font-bold text-paper transition-colors hover:text-momiji-300 md:text-5xl"
          >
            {site.email}
            <span className="mt-3 block h-px w-0 bg-momiji-500 transition-all duration-500 group-hover:w-full" />
          </a>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-300">
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile (opens in a new tab)"
              className="whitespace-nowrap transition-colors hover:text-momiji-400"
            >
              GitHub ↗
            </a>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span className="whitespace-nowrap">{site.location}</span>
          </div>
        </Reveal>
      </div>

      <footer className="border-t border-ink-800/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-ink-300">
            <span className="hanko h-6 w-6" aria-hidden>
              <LeafMark className="h-3.5 rotate-[24deg]" />
            </span>
            © {new Date().getFullYear()} {site.name}
          </p>
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-300">
            handcrafted with Next.js × Three.js — the moon above shows tonight&apos;s
            real phase
          </p>
        </div>
      </footer>
    </section>
  );
}
