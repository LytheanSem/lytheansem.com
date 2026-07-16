"use client";

import Link from "next/link";
import { archive, projects, type Project } from "@/data/portfolio";
import EmblemView from "@/components/gl/Emblem";
import { emblemMap } from "@/components/gl/emblems";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import LeafMark from "@/components/ui/LeafMark";

function ProjectPanel({ project, flip }: { project: Project; flip: boolean }) {
  const Emblem = emblemMap[project.emblem];

  return (
    <article className="grid items-center gap-10 py-16 first:pt-6 md:py-24 md:first:pt-8 lg:grid-cols-2 lg:gap-16">
      {/* emblem — drag to turn, hover to ignite */}
      <Reveal className={flip ? "lg:order-2" : ""}>
        <div className="group relative">
          <EmblemView
            label={`Interactive 3D emblem for ${project.name}`}
            autoRotate={!["ripple", "disc", "lanes"].includes(project.emblem)}
            className="aspect-square w-full max-h-[460px] border border-ink-700/60 transition-colors duration-500 group-hover:border-momiji-600/50"
          >
            <Emblem />
          </EmblemView>
          {/* frame ticks */}
          <span className="pointer-events-none absolute -left-px -top-px h-4 w-4 border-l-2 border-t-2 border-momiji-500/70" />
          <span className="pointer-events-none absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-momiji-500/70" />
          {/* index watermark */}
          <span
            className="pointer-events-none absolute bottom-3 right-5 font-display text-5xl font-bold text-paper/10 transition-colors duration-500 group-hover:text-momiji-500/25"
            aria-hidden
          >
            {project.index}
          </span>
          <span className="pointer-events-none absolute left-5 top-4 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-300/80">
            <span className="pointer-coarse:hidden">drag · hover</span>
            <span className="hidden pointer-coarse:inline">drag to rotate</span>
          </span>
        </div>
      </Reveal>

      {/* copy */}
      <Reveal delay={120} className={flip ? "lg:order-1" : ""}>
        <div className="flex items-baseline gap-4">
          <span className="font-display text-sm font-bold text-momiji-500">{project.index}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-300">
            {project.category}
          </span>
        </div>
        <h3 className="mt-4 font-display text-4xl font-bold text-paper md:text-5xl">
          {project.name}
        </h3>
        <p className="mt-3 font-display text-lg italic text-momiji-300/90">{project.tagline}</p>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-200">
          {project.description}
        </p>
        <ul className="mt-6 space-y-2">
          {project.highlights.map((h) => (
            <li key={h} className="flex gap-3 text-sm text-paper/80">
              <span className="text-momiji-500" aria-hidden>
                —
              </span>
              {h}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap gap-2">
          {project.tech.map((t) => (
            <span
              key={t}
              className="border border-ink-700 px-3 py-1 font-mono text-[11px] text-ink-300 transition-colors hover:border-momiji-600 hover:text-momiji-300"
            >
              {t}
            </span>
          ))}
        </div>
        {project.note && (
          <p className="mt-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-momiji-300/90">
            <LeafMark className="h-3.5 rotate-[24deg]" />
            {project.note}
          </p>
        )}
        {project.fieldNote && (
          <div className="mt-6">
            <Link
              href={project.fieldNote}
              className="group/note inline-block border border-momiji-600/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-momiji-300 transition-all hover:border-momiji-400 hover:bg-momiji-600/10"
            >
              Read the field note{" "}
              <span className="inline-block transition-transform group-hover/note:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        )}
        {(project.links?.live || project.links?.github) && (
          <div className="mt-8 flex flex-wrap items-center gap-6">
            {project.links.live && (
              <a
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link border border-momiji-600/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-momiji-300 transition-all hover:border-momiji-400 hover:bg-momiji-600/10"
              >
                Visit live site{" "}
                <span className="inline-block transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5">
                  ↗
                </span>
              </a>
            )}
            {project.links.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-300 underline decoration-ink-600 underline-offset-8 transition-colors hover:text-paper hover:decoration-momiji-500"
              >
                Source on GitHub ↗
              </a>
            )}
          </div>
        )}
      </Reveal>
    </article>
  );
}

export default function Projects() {
  return (
    <section id="works" className="relative z-10 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 pt-28">
        <SectionHeading en="Selected Works" sub="eight systems in the wild" />
        <div className="divide-y divide-ink-800/60">
          {projects.map((p, i) => (
            <ProjectPanel key={p.id} project={p} flip={i % 2 === 1} />
          ))}
        </div>

        {/* smaller works */}
        <Reveal className="mt-8">
          <p className="mb-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-ink-300">
            <LeafMark className="h-4 rotate-[24deg] text-momiji-500" />
            Smaller works
          </p>
          <div className="grid gap-px overflow-hidden border border-ink-800 bg-ink-800 sm:grid-cols-3">
            {archive.map((a) => (
              <a
                key={a.name}
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group/arc bg-ink-950 p-6 transition-colors hover:bg-ink-900"
              >
                <h3 className="font-display text-base font-bold text-paper transition-colors group-hover/arc:text-momiji-300">
                  {a.name} ↗
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-200">
                  {a.desc}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-300 transition-colors group-hover/arc:text-momiji-400">
                  {a.tag}
                </p>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
