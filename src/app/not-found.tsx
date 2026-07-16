import Link from "next/link";
import LeafMark from "@/components/ui/LeafMark";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-950 px-6 text-center">
      {/* the one lost leaf, drifting down the empty field */}
      <span aria-hidden className="leaf-lost pointer-events-none absolute left-[61%] top-0">
        <LeafMark className="h-4 text-momiji-500/80" />
      </span>
      <LeafMark className="h-14 rotate-[24deg] text-momiji-500" />
      <h1 className="mt-8 font-display text-5xl font-bold text-paper md:text-6xl">404</h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-200">
        This path wanders off into the field. The page you&apos;re after isn&apos;t here.
      </p>
      <Link
        href="/"
        className="mt-10 border border-momiji-600/60 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-momiji-300 transition-all hover:border-momiji-400 hover:bg-momiji-600/10"
      >
        Back to the field
      </Link>
    </main>
  );
}
