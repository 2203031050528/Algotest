"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Key,
  Landmark,
  Mail,
  Save,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { getProfile, updateProfile, UserProfile } from "@/lib/auth-api";
import { dhanApi } from "@/lib/dhan-api";
import { DhanStatusResponse } from "@/types/dhan";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dhanStatus, setDhanStatus] = useState<DhanStatusResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Load from cache first
    const cached = auth.getUser();
    if (cached) {
      setProfile(cached);
      setFirstName(cached.first_name || "");
      setLastName(cached.last_name || "");
      setEmail(cached.email || "");
    }

    Promise.allSettled([getProfile(), dhanApi.getStatus()])
      .then(([profRes, dhanRes]) => {
        if (profRes.status === "fulfilled") {
          const user = profRes.value;
          setProfile(user);
          setFirstName(user.first_name || "");
          setLastName(user.last_name || "");
          setEmail(user.email || "");
          auth.setUser(user);
        }
        if (dhanRes.status === "fulfilled") {
          setDhanStatus(dhanRes.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const updated = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        email: email,
      });

      setProfile(updated);
      auth.setUser(updated);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> }; message?: string };
      const data = error?.response?.data;
      if (data) {
        const firstError = Object.values(data).flat().find((v) => typeof v === "string");
        setErrorMessage(String(firstError || "Failed to update profile."));
      } else {
        setErrorMessage(error?.message || "Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  const initials = (
    (firstName ? firstName[0] : "") +
    (lastName ? lastName[0] : "") ||
    (profile?.username ? profile.username.slice(0, 2) : "TR")
  ).toUpperCase();

  const joinedDate = profile?.date_joined
    ? new Date(profile.date_joined).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Active Trader";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings, personal details, and trading credentials
          </p>
        </div>

        {/* Profile Card Header */}
        <div className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-md">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile?.username || "Username"}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-500">{profile?.email || "user@example.com"}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> Member since: {joinedDate}
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-blue-500" /> Verified Account
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Edit Details Form */}
          <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Personal Details</h3>
            <p className="text-xs text-gray-500 mb-5">
              Update your personal information to personalize your trading experience
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Username (Identifier)
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Usernames cannot be changed once created.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Broker Integration Sidebar Card */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Landmark size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Dhan Broker</h4>
                  <p className="text-xs text-gray-500">Live trading link</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-gray-500">Status</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {dhanStatus?.connected ? "Connected" : "Configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-gray-500">Client ID</span>
                  <span className="font-mono font-medium text-gray-900">
                    {dhanStatus?.client_id || "1113630741"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Mode</span>
                  <span className="font-medium text-gray-900">Market Feed & Backtest</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Key size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Authentication</h4>
                  <p className="text-xs text-gray-500">JWT Token Session</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your session is secured using JWT authentication. Tokens are automatically refreshed
                upon expiration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
