import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://lytheansem.com",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://lytheansem.com/notes/vinmart",
      changeFrequency: "yearly",
      priority: 0.7,
    },
  ];
}
