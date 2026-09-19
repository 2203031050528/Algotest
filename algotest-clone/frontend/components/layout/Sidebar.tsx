"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Database,
  Landmark,
  LayoutDashboard,
  LogOut,
  User,
  X,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { UserProfile } from "@/lib/auth-api";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/strategies", label: "Strategies", icon: BookOpen },
  { href: "/dashboard/backtests", label: "Backtests", icon: BarChart3 },
  { href: "/dashboard/market-data", label: "Market Data", icon: Database, badge: "Dhan" },
  { href: "/dashboard/instruments", label: "Instruments", icon: BookOpen },
  { href: "/dashboard/broker", label: "Broker (Dhan)", icon: Landmark, badge: "Live" },
];

export default function Sidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(auth.getUser());
    const handler = () => setUser(auth.getUser());
    window.addEventListener("auth_user_changed", handler);
    return () => window.removeEventListener("auth_user_changed", handler);
  }, []);

  const handleLogout = () => {
    auth.logout();
    if (onNavigate) onNavigate();
    router.push("/login");
  };

  const initials = (
    (user?.first_name ? user.first_name[0] : "") +
    (user?.last_name ? user.last_name[0] : "") ||
    (user?.username ? user.username.slice(0, 2) : "TR")
  ).toUpperCase();

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Trader";

  return (
    <aside
      className={`${
        mobile ? "relative" : "fixed"
      } inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white`}
    >
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950 text-sm font-bold text-white">
            A
          </span>
          <span className="font-bold">AlgoTest</span>
        </Link>
        {mobile && (
          <button
            onClick={onNavigate}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X size={19} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Workspace
        </p>
        {links.map(({ href, label, icon: Icon, badge }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gray-100 text-gray-950"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {badge}
                </span>
              )}
            </Link>
          );
        })}

        <p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Account
        </p>
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            pathname === "/dashboard/profile"
              ? "bg-gray-100 text-gray-950"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <User size={18} />
          <span>My Profile</span>
        </Link>
      </nav>

      {/* User profile bottom card */}
      <div className="border-t p-3 space-y-2">
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-gray-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white uppercase shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-gray-400">
              {user?.email || "Account details"}
            </p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}