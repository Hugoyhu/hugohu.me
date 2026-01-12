import "./global.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navbar } from "./components/nav";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "./components/footer";
import Providers from "./providers";
import { baseUrl } from "./sitemap";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Hugo Hu",
    template: "%s | Hugo Hu",
  },
  description: "Hugo Hu's Personal Website",
  openGraph: {
    title: "Hugo Hu",
    description: "Hugo Hu's Personal Website",
    url: baseUrl,
    siteName: "Hugo Hu",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cx(
        "text-black dark:text-white",
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      {/* antialiased max-w-xl mx-4 mt-8 lg:mx-auto overflow-x-hidden */}
      <body className="antialiased mx-4 mt-8 lg:mx-auto overflow-x-hidden">
        <Providers>
          <main className="flex-auto min-w-0 mt-6 flex flex-col">
            <Navbar />
            <div className="w-[50vw] mx-auto px-2 md:px-0">{children}</div>
            <Footer />
            <Analytics />
            <SpeedInsights />
          </main>
        </Providers>
      </body>
    </html>
  );
}
