"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open,setOpen] = useState(false);
  return <div className="min-h-screen bg-gray-50">
    <div className="hidden lg:block"><Sidebar/></div>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" onClick={()=>setOpen(false)} className="absolute inset-0 bg-black/40"/><div className="relative h-full w-72 bg-white"><Sidebar mobile onNavigate={()=>setOpen(false)}/></div></div>}
    <main className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white/90 px-4 backdrop-blur sm:px-6">
        <button onClick={()=>setOpen(true)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden" aria-label="Open menu"><Menu size={22}/></button>
        <span className="hidden text-sm font-semibold lg:block">AlgoTest Clone</span>
        <div className="ml-auto flex items-center gap-3"><span className="hidden text-sm text-gray-500 sm:block">Demo account</span><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-950 text-xs font-bold text-white">RJ</div></div>
      </header>
      <div className="mx-auto max-w-[1500px] p-4 sm:p-6">{children}</div>
    </main>
  </div>;
}