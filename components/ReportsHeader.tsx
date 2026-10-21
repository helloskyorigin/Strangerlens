import React from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { LandingThemeSwitcher } from "@/components/landing/LandingThemeSwitcher";

export default function ReportsHeader() {
  return <header className="sticky top-0 z-30 border-b border-[#263044] bg-[#090D15]/95 backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between gap-2 px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
        <BrandMark className="h-8 w-8" />
        <span className="text-sm sm:text-xl">StrangerLens</span>
      </Link>
      <nav aria-label="Report navigation" className="flex items-center gap-2 text-xs font-medium sm:gap-5 sm:text-sm">
        <LandingThemeSwitcher compact />
        <Link href="/my-reports" aria-current="page" className="rounded text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">My Reports</Link>
        <Link href="/" className="rounded-full border border-[#263044] bg-[#171F2D] px-3 py-2 text-white hover:bg-[#263044] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">New Check</Link>
      </nav>
    </div>
  </header>;
}
