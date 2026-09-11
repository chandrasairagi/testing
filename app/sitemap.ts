import type { MetadataRoute } from "next";

const localities = ["gachibowli","kondapur","madhapur","hitec-city","financial-district","kokapet","manikonda","nallagandla"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...localities.map(locality => ({ url: `${base}/rent/${locality}`, changeFrequency: "daily" as const, priority: 0.8 }))
  ];
}
