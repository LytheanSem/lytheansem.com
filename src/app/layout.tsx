import type { Metadata, Viewport } from "next";
import { Shippori_Mincho_B1, Zen_Kaku_Gothic_New, Geist_Mono } from "next/font/google";
import { site } from "@/data/portfolio";
import "./globals.css";

// preload:false keeps next/font from eagerly preloading every CJK subset
// slice of these Japanese-family fonts — only the latin slices ever render.
const shippori = Shippori_Mincho_B1({
  variable: "--font-shippori",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  preload: false,
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#070c14",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://lytheansem.com"),
  title: "Lythean Sem — Full-Stack Engineer in Phnom Penh",
  description:
    "Lythean Sem (Zen) — full-stack engineer in Phnom Penh, Cambodia. Calm, dependable software for real businesses: retail systems, SaaS platforms, and encrypted tools.",
  openGraph: {
    title: "Lythean Sem — Full-Stack Engineer",
    description:
      "Calm, dependable software for real businesses — built in Phnom Penh.",
    url: "https://lytheansem.com",
    siteName: "Lythean Sem",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lythean Sem — Full-Stack Engineer",
    description:
      "Calm, dependable software for real businesses — built in Phnom Penh.",
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  alternateName: site.alias,
  jobTitle: site.role,
  email: `mailto:${site.email}`,
  url: `https://${site.domain}`,
  sameAs: [site.github, site.linkedin],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Phnom Penh",
    addressCountry: "KH",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${shippori.variable} ${zenKaku.variable} ${geistMono.variable} antialiased`}
    >
      <body className="grain">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          // static, compile-time data; <-escape hardens against </script> breakout
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
