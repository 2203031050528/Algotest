"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, LayoutDashboard, LogOut, Settings, X } from "lucide-react";
import { auth } from "@/lib/auth";

const links = [
  {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard},
  {href:"/dashboard/strategies",label:"Strategies",icon:BookOpen},
  {href:"/dashboard/backtests",label:"Backtests",icon:BarChart3},
  {href:"/dashboard/instruments",label:"Instruments",icon:BookOpen},
];

export default function Sidebar({mobile=false,onNavigate}:{mobile?:boolean;onNavigate?:()=>void}) {
  const pathname=usePathname();
  const router=useRouter();

  const handleLogout = () => {
    auth.logout();
    if (onNavigate) onNavigate();
    router.push("/login");
  };

  return <aside className={`${mobile?"relative":"fixed"} inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white`}>
    <div className="flex h-16 items-center justify-between border-b px-5"><Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950 text-sm font-bold text-white">A</span><span className="font-bold">AlgoTest</span></Link>{mobile&&<button onClick={onNavigate} className="rounded-lg p-2 hover:bg-gray-100"><X size={19}/></button>}</div>
    <nav className="flex-1 space-y-1 p-3"><p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Workspace</p>
      {links.map(({href,label,icon:Icon})=>{const active=pathname===href||(href!=="/dashboard"&&pathname.startsWith(href));return <Link key={href} href={href} onClick={onNavigate} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active?"bg-gray-100 text-gray-950":"text-gray-600 hover:bg-gray-50"}`}><Icon size={18}/>{label}</Link>})}
      <p className="px-3 pb-2 pt-7 text-[11px] font-bold uppercase tracking-wider text-gray-400">Account</p>
      <Link href="#" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"><Settings size={18}/>Settings</Link>
    </nav>
    <div className="border-t p-3"><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600"><LogOut size={18}/>Logout</button></div>
  </aside>;
}