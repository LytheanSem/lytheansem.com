// File-convention OG images do not propagate to child segments, so without
// this the field note — the most-shared URL on the site — unfurls image-less
// on LinkedIn/WhatsApp/Slack. Reuse the root card; the alt is note-specific.
export { default, size, contentType } from "../../opengraph-image";

export const alt = "Eight weeks to rebuild a supermarket — a field note by Lythean Sem";
