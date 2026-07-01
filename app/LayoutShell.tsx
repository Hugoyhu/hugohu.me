"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { Navbar } from "./components/nav";
import Footer from "./components/footer";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInventory = pathname.startsWith("/inventory");

  const widthClasses = isInventory
    ? "w-[95vw] lg:w-[80vw]"
    : "w-[80vw] lg:w-[50vw]";

  return (
    <div className={`${widthClasses} mx-auto px-2 md:px-0`}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
