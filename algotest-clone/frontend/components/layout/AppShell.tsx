"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Menu, User } from "lucide-react";
import Sidebar from "./Sidebar";
import { auth } from "@/lib/auth";
import { getProfile, UserProfile } from "@/lib/auth-api";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const cached = auth.getUser();
    if (cached) setUser(cached);

    if (auth.isAuthenticated()) {
      getProfile()
        .then((profile) => {
          setUser(profile);
          auth.setUser(profile);
        })
        .catch(() => {});
    }

    const handler = () => setUser(auth.getUser());
    window.addEventListener("auth_user_changed", handler);
    return () => window.removeEventListener("auth_user_changed", handler);
  }, []);

  const initials = (
    (user?.first_name ? user.first_name[0] : "") +
    (user?.last_name ? user.last_name[0] : "") ||
    (user?.username ? user.username.slice(0, 2) : "TR")
  ).toUpperCase();

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Trader";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative h-full w-72 bg-white">
            <Sidebar mobile onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <main className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="hidden text-sm font-semibold lg:block">AlgoTest Platform</span>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/dashboard/broker"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100/70"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Landmark size={14} className="text-emerald-700" />
              <span className="font-mono">Dhan: 1113630741</span>
            </Link>

            <Link
              href="/dashboard/profile"
              title={`Logged in as ${displayName} (${user?.email || "User"})`}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 pr-3 text-xs font-medium text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 transition"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white uppercase shadow-sm">
                {initials}
              </div>
              <span className="hidden max-w-[120px] truncate sm:inline font-medium text-gray-800">
                {displayName}
              </span>
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}