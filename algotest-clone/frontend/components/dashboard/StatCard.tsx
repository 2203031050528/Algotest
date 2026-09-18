import type { LucideIcon } from "lucide-react";

export default function StatCard({title,value,subtitle,icon:Icon,positive=false}:{title:string;value:string;subtitle:string;icon:LucideIcon;positive?:boolean}) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-500">{title}</p><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><Icon size={18}/></span></div><p className="mt-4 text-2xl font-bold tracking-tight">{value}</p><p className={`mt-1 text-xs font-medium ${positive?"text-emerald-600":"text-gray-500"}`}>{subtitle}</p></div>;
}