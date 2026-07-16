import { site } from "@/data/portfolio";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import LeafMark from "@/components/ui/LeafMark";
import FooterField from "@/components/gl/FooterField";

export default function Contact() {
  return (
    <section id="contact" className="relative z-10 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 pt-28">
        <SectionHeading en="Let's Talk" sub="send word" />

        <Reveal className="pb-28">
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-200">
            Have a product to build, a system to steady, or an idea that needs a calm pair of
            hands? I&apos;m open to full-time roles — remote or in Phnom Penh. My inbox is
            open.
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
            <a
              href={site.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile (opens in a new tab)"
              className="whitespace-nowrap transition-colors hover:text-momiji-400"
            >
              LinkedIn ↗
            </a>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span className="whitespace-nowrap">{site.location}</span>
          </div>
        </Reveal>
      </div>

      {/* the field returns to see you off — moon, leaves, and the wanderer */}
      <FooterField />

      <footer className="border-t border-ink-800/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-ink-300">
            <span className="hanko h-6 w-6" aria-hidden>
              <LeafMark className="h-3.5 rotate-[24deg]" />
            </span>
            © {new Date().getFullYear()} {site.name}
          </p>
          <div className="text-left font-mono text-[11px] tracking-[0.2em] text-ink-300 sm:text-right">
            <p>
              handcrafted with Next.js × Three.js — the moon above shows tonight&apos;s
              real phase
            </p>
            <p className="mt-1.5 text-[10px] text-ink-300/80">
              samurai silhouette after{" "}
              <a
                href="https://sketchfab.com/3d-models/ronin-1ba5693b714c4e9fbf5f3689b16909ae"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-momiji-300"
              >
                &ldquo;RONIN&rdquo; by dj256
              </a>{" "}
              —{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-momiji-300"
              >
                CC BY 4.0
              </a>
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
