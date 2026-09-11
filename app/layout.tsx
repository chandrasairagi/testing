import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Hyderabad Rent — Real rental prices, mapped", template: "%s | Hyderabad Rent" },
  description: "Explore real rental prices, direct listings and flat seekers across Hyderabad.",
  openGraph: {
    title: "Hyderabad Rent",
    description: "Real Hyderabad rental prices, direct listings and flat seekers on one map.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<footer style={{display:"none"}}><Link href="/privacy">Privacy</Link></footer></body></html>;
}
