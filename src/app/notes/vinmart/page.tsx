import type { Metadata } from "next";
import FieldNote from "@/components/ui/FieldNote";
import { vinmartNote } from "@/data/notes/vinmart";

const title = "Eight weeks to rebuild a supermarket — Field note · Lythean Sem";
const description =
  "Inheriting a live multi-branch POS as the sole engineer, stabilizing it, and rebuilding it in eight weeks — offline-first sales, a 16-second cold-start war, and a to-the-cent data migration.";

// metadata merging is SHALLOW: without these blocks the note would inherit the
// homepage's entire openGraph/twitter (wrong title, og:url pointing at "/"),
// so shared links unfurl as the homepage card
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/notes/vinmart" },
  openGraph: {
    title: "Eight weeks to rebuild a supermarket",
    description,
    url: "/notes/vinmart",
    siteName: "Lythean Sem",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eight weeks to rebuild a supermarket",
    description,
  },
};

export default function VinmartNotePage() {
  return <FieldNote note={vinmartNote} />;
}
