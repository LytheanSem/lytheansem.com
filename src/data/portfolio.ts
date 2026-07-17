export type Project = {
  id: string;
  index: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  highlights: string[];
  tech: string[];
  techGroups?: { label: string; items: string[] }[]; // labeled stacks (e.g. legacy vs rebuild) — overrides flat tech chips
  emblem: "shelf" | "stage" | "ripple" | "cipher" | "bars" | "disc" | "bowl" | "lanes";
  links?: { live?: string; github?: string };
  note?: string; // short closing caption for link-less panels
  fieldNote?: string; // internal route to a long-form case study
};

export const projects: Project[] = [
  {
    id: "vinmart",
    index: "01",
    name: "VinMart",
    category: "Retail Suite — In Production",
    tagline: "The software that runs a real supermarket, every day.",
    description:
      "The retail suite behind VinMart, a supermarket in Phnom Penh — point of sale, barcode inventory, purchasing, and reporting. When the original team moved on, I became its sole engineer: keeping the live system shipping daily, and building its complete next-generation replacement from the ground up in parallel.",
    highlights: [
      "Sole engineer for a live multi-branch POS",
      "Khmer-first bilingual, down to thermal-printer receipts",
      "Legacy data migration reconciled to the cent",
      "Offline-first rebuild, staged for cutover — a sale is never silently dropped",
    ],
    tech: ["Laravel", "React", "Next.js", "Supabase", "Drizzle ORM", "PostgreSQL"],
    techGroups: [
      { label: "Legacy — live", items: ["Laravel", "React"] },
      { label: "Rebuild — staged", items: ["Next.js", "Supabase", "Drizzle ORM", "PostgreSQL"] },
    ],
    emblem: "shelf",
    note: "Private system — running daily at VinMart, Phnom Penh",
    fieldNote: "/notes/vinmart",
  },
  {
    id: "emotionwork",
    index: "02",
    name: "EmotionWork",
    category: "Client Platform — Live Events",
    tagline: "A concert company's stage, rebuilt in the browser.",
    description:
      "A production platform for Visual Emotionwork, a concert and event production company in Cambodia running since 2013. Customers browse the real equipment catalog, design their own stage in an interactive 3D editor, and book consultations that auto-create Zoom meetings, send confirmations, and log to the company's operations sheets. Built with a three-person university team — and still live on the client's domain today.",
    highlights: [
      "Still live on the client's domain today",
      "In-browser 3D stage designer — drag-and-drop equipment, templates, PNG/PDF export",
      "Bookings wire together the Zoom API, email confirmations, and Google Sheets",
      "Type-safe tRPC API over MongoDB Atlas with role-based access control",
    ],
    tech: ["Next.js 15", "tRPC", "MongoDB", "Three.js / R3F", "NextAuth", "Cloudinary", "Zoom API"],
    emblem: "stage",
    links: {
      live: "https://www.visualemotionwork.com",
      github: "https://github.com/LytheanSem/emotionwork",
    },
  },
  {
    id: "ripple",
    index: "03",
    name: "Ripple",
    category: "SaaS — Social Publishing",
    tagline: "Write once. Publish everywhere.",
    description:
      "A social-media management platform where one post fans out to Facebook, Instagram, TikTok, YouTube, and Telegram — across multiple accounts per platform. Built as a multi-tenant SaaS with scheduled publishing and a composer that previews each network's constraints before you hit send.",
    highlights: [
      "One composer, five platforms, many accounts",
      "Cross-platform publishing via the Zernio API",
      "Multi-account workspaces with role-based access",
    ],
    tech: ["Next.js 16", "React 19", "Prisma", "PostgreSQL", "NextAuth v5", "Tailwind v4"],
    emblem: "ripple",
    note: "Personal build — archived, no public release",
  },
  {
    id: "encrypted-images",
    index: "04",
    name: "Encrypted Images",
    category: "Security — Government-Grade",
    tagline: "Photos that only the right eyes can open.",
    description:
      "An end-to-end encrypted photo-sharing platform built for government personnel. Every image is encrypted in the browser with AES-256-GCM before it ever leaves the device — the server only stores ciphertext. Decryption requires an exact 25-character code shared out-of-band, with a strict three-tier role model on top.",
    highlights: [
      "Client-side AES-256-GCM — zero-knowledge server",
      "scrypt key derivation, @noble cryptography",
      "Role hierarchy: owner, admin, employee",
      "English + Khmer, end to end",
    ],
    tech: ["Next.js 15", "Supabase", "@noble/ciphers", "Edge Functions", "Zod", "next-intl"],
    emblem: "cipher",
    note: "Built for a government workflow — shelved, deployment uncertain",
  },
  {
    id: "kh-track",
    index: "05",
    name: "KH-Track",
    category: "PWA — Micro-Commerce",
    tagline: "Faster than a notebook.",
    description:
      "A multi-tenant sales and inventory PWA for Cambodian micro-entrepreneurs — street vendors, market stalls, TikTok live sellers. Mobile-first and deliberately minimal: recording a sale has to be quicker than scribbling it in the paper notebook it replaces. Each business is isolated with row-level security.",
    highlights: [
      "Multi-tenant isolation via Postgres RLS",
      "Installable PWA, mobile-first flows",
      "Three roles with a built-in kill switch",
    ],
    tech: ["Next.js 16", "React 19", "Supabase", "Tailwind v4", "PWA"],
    emblem: "bars",
    note: "Personal build — archived, no public release",
  },
  {
    id: "drift",
    index: "06",
    name: "Drift",
    category: "POS — Nightlife",
    tagline: "A point of sale that keeps up after midnight.",
    description:
      "A point-of-sale system designed for the pace of a nightclub — bottle service, table management, and split bills handled at speed, in the dark, on touch screens. Built as a fast Vite + React app with an interface tuned for low light and high volume.",
    highlights: [
      "Touch-first ordering and table flow",
      "Dark, high-contrast UI for low-light venues",
      "Component system on shadcn/ui + Radix",
    ],
    tech: ["React", "Vite", "TypeScript", "shadcn/ui", "TanStack Query"],
    emblem: "disc",
    note: "Personal build — archived, no public release",
  },
  {
    id: "eleven-one",
    index: "07",
    name: "Eleven One Kitchen",
    category: "Hospitality — Client Work",
    tagline: "A healthy kitchen's home on the web.",
    description:
      "A mobile-first website for Eleven One Kitchen, a fresh-and-healthy Cambodian restaurant in Phnom Penh serving since 2014. Menu browsing built for phones first, QR codes that drop guests straight onto the right table's menu, and a visual language that matches the restaurant's fresh identity.",
    highlights: [
      "QR-code table menus",
      "Mobile-first menu and ordering flows",
      "Khmer + English typography system",
    ],
    tech: ["Next.js 16", "Tailwind v4", "TypeScript", "qrcode.react"],
    emblem: "bowl",
    note: "Built for a real Phnom Penh restaurant — archived, never shipped",
  },
  {
    id: "lanedash",
    index: "08",
    name: "LaneDash",
    category: "Game — Computer Vision",
    tagline: "Played with your body, not a controller.",
    description:
      "A motion-controlled 3D endless runner, built as my senior capstone with a three-person team. Your webcam is the controller: OpenCV and MediaPipe track your body — jump, crouch, lean to switch lanes — and stream every move to the Unity game over UDP in real time. A MET-based calorie system turns the run into a workout, personalized to your height and weight.",
    highlights: [
      "97% of user-testing players said they'd play again",
      "Python pose detection driving Unity gameplay over UDP — no sensors, no headset",
      "Jump, crouch, and lean detection with live calibration overlays",
      "MET-based calorie tracking personalized per player",
    ],
    tech: ["Unity", "C#", "Python", "OpenCV", "MediaPipe", "UDP"],
    emblem: "lanes",
    links: { github: "https://github.com/LytheanSem/LaneDash" },
  },
];

export const archive = [
  {
    name: "Car Analytics",
    desc: "Used-car market dashboard — React + Chart.js, drill-down brand views, still live on GitHub Pages.",
    href: "https://lytheansem.github.io/car-analytics",
    tag: "Live",
  },
  {
    name: "Inventory Management",
    desc: "Next.js 16 + Prisma dashboard — server actions, Zod validation, per-user row scoping.",
    href: "https://github.com/LytheanSem/inventory-management",
    tag: "GitHub",
  },
  {
    name: "Everything else",
    desc: "Course work, experiments, and the learning trail — all public on GitHub.",
    href: "https://github.com/LytheanSem?tab=repositories",
    tag: "Profile",
  },
];

export const skills = [
  {
    index: "01",
    title: "Frontend",
    items: ["React 19", "Next.js", "TypeScript", "Tailwind CSS", "Three.js / R3F", "shadcn/ui"],
  },
  {
    index: "02",
    title: "Backend",
    items: ["Node.js", "PostgreSQL", "Supabase", "Prisma / Drizzle", "tRPC", "MongoDB"],
  },
  {
    index: "03",
    title: "Craft",
    items: ["Offline-first PWAs", "Client-side crypto", "i18n (EN/KH)", "Unity + OpenCV", "Vercel", "CI/CD"],
  },
];

export const virtues = [
  {
    numeral: "I",
    title: "Sincerity",
    body: "Honest code. Readable, boring where it should be, and truthful about what it does — no clever tricks that lie to the next engineer.",
  },
  {
    numeral: "II",
    title: "Tempering",
    body: "Software is folded steel. I ship early, listen hard, and refine relentlessly — every real system I run has been beaten into shape by daily use.",
  },
  {
    numeral: "III",
    title: "Stillness",
    body: "Calm systems, calm engineer. Predictable deploys, defensive defaults, and software that keeps working quietly when the network doesn't.",
  },
];

export const site = {
  name: "Lythean Sem",
  alias: "Zen",
  role: "Full-Stack Engineer",
  location: "Phnom Penh, Cambodia",
  email: "hi@lytheansem.com",
  github: "https://github.com/LytheanSem",
  linkedin: "https://www.linkedin.com/in/lytheansem",
  resume: "/resume.pdf",
  domain: "lytheansem.com",
};
