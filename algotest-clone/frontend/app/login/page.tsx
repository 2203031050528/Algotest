"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/lib/auth-api";
import { auth } from "@/lib/auth";

export default function LoginPage() {

  const router = useRouter();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setError("");
    setLoading(true);

    try {

      const data = await login({
        username,
        password,
      });

      auth.setTokens(
        data.access,
        data.refresh
      );

      router.push("/dashboard");

    } catch (err: unknown) {

      const error = err as { message?: string; response?: { data?: { detail?: string } } };
      const message =
        error?.response?.data?.detail ||
        (error?.response
          ? "Invalid username or password."
          : `Unable to connect to server (${error?.message || "network error"}). Please ensure backend is reachable and CORS/API URL are configured.`);


      setError(message);

    } finally {

      setLoading(false);

    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">

      <div className="w-full max-w-md">

        <div className="mb-8 text-center">

          <h1 className="text-3xl font-bold text-white">
            AlgoTest Clone
          </h1>

          <p className="mt-2 text-slate-400">
            Login to your trading dashboard
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >

          {error && (
            <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-5">

            <div>

              <label className="mb-2 block text-sm text-slate-300">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="Enter username"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm text-slate-300">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="Enter password"
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>

          </div>

          <p className="mt-6 text-center text-sm text-slate-400">

            Don&apos;t have an account?{" "}

            <a
              href="/register"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Create account
            </a>

          </p>

        </form>

      </div>

    </main>
  );
}