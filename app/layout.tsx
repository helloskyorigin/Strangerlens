import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  icons: { icon: [{ url: "/strangerlens-mark.webp", type: "image/webp" }], apple: "/strangerlens-mark.webp" },
  title: "StrangerLens — See Your Website Through a Stranger's Eyes",
  description: "See what your website communicates to someone new. Find unclear messaging, evidence-backed recommendations, and a better place to start.",
  openGraph: {
    title: "StrangerLens — See Your Website Through a Stranger's Eyes",
    description: "See what your website communicates to someone new. Find unclear messaging, evidence-backed recommendations, and a better place to start.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrangerLens — See Your Website Through a Stranger's Eyes",
    description: "See what your website communicates to someone new. Find unclear messaging, evidence-backed recommendations, and a better place to start.",
  },
};

const earlyTheme = `(function(){try{
var v=localStorage.getItem("strangerlens-theme-v4");
var dark=v==="dark";
document.documentElement.dataset.landingTheme=dark?"dark":"light";document.documentElement.classList.toggle("dark",dark);
}catch(e){document.documentElement.dataset.landingTheme="light";document.documentElement.classList.remove("dark");}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-landing-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: earlyTheme }} />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
