import type { Metadata } from "next";
import CanvasRoot from "@/components/gl/CanvasRoot";
import Nav from "@/components/sections/Nav";
import Hero from "@/components/sections/Hero";
import Projects from "@/components/sections/Projects";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";

// canonical lives here, not in layout.tsx — a layout-level canonical would be
// inherited by every route that forgets its own, silently deindexing it
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <CanvasRoot>
      <Nav />
      <main id="main">
        <Hero />
        <Projects />
        <About />
        <Contact />
      </main>
    </CanvasRoot>
  );
}
