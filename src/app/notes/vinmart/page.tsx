import type { Metadata } from "next";
import FieldNote from "@/components/ui/FieldNote";
import { vinmartNote } from "@/data/notes/vinmart";

export const metadata: Metadata = {
  title: "Eight weeks to rebuild a supermarket — Field note · Lythean Sem",
  description:
    "Inheriting a live multi-branch POS as the sole engineer, stabilizing it, and rebuilding it in eight weeks — offline-first sales, a 16-second cold-start war, and a to-the-cent data migration.",
  alternates: { canonical: "/notes/vinmart" },
};

export default function VinmartNotePage() {
  return <FieldNote note={vinmartNote} />;
}
