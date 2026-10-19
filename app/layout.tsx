import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#090D15",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: "StrangerLens — AI Website First-Impression Analyzer",
  description: "See your website through a stranger's eyes. AI-powered website first-impression clarity analyzer evaluating visitor clarity across five signals.",
  openGraph: {
    title: "StrangerLens — AI Website First-Impression Analyzer",
    description: "See your website through a stranger's eyes. AI-powered website first-impression clarity analyzer evaluating visitor clarity across five signals.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrangerLens — AI Website First-Impression Analyzer",
    description: "See your website through a stranger's eyes. AI-powered website first-impression clarity analyzer evaluating visitor clarity across five signals.",
  },
};

const earlyTheme = `(function(){try{
var v=localStorage.getItem("strangerlens-theme-v3");
var p=v==="dark"||v==="light"||v==="system"?v:"light";
var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.dataset.landingTheme=dark?"dark":"light";
}catch(e){document.documentElement.dataset.landingTheme="light";}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-landing-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: earlyTheme }} />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
