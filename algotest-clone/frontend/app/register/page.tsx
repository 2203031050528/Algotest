"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { register } from "@/lib/auth-api";

export default function RegisterPage() {

  const router = useRouter();

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [passwordConfirm, setPasswordConfirm] =
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

    if (password !== passwordConfirm) {

      setError(
        "Passwords do not match."
      );

      return;
    }

    setLoading(true);

    try {

      await register({
        username,
        email,
        password,
        password_confirm:
          passwordConfirm,
      });

      router.push("/login");

    } catch (err: unknown) {

      const error = err as { message?: string; response?: { data?: Record<string, unknown> } };
      const data =
        error?.response?.data;

      if (data) {

        const firstError =
          Object.values(data)
            .flat()
            .find(
              (value) =>
                typeof value === "string"
            );

        setError(
          String(
            firstError ||
            "Registration failed."
          )
        );

      } else {

        setError(
          error?.message
            ? `Unable to connect to server (${error.message}). Please ensure the backend is reachable and CORS/API URL are configured.`
            : "Unable to connect to server. Please ensure the backend is reachable and CORS/API URL are configured."
        );


      }

    } finally {

      setLoading(false);

    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">

      <div className="w-full max-w-md">

        <div className="mb-8 text-center">

          <h1 className="text-3xl font-bold text-white">
            Create your account
          </h1>

          <p className="mt-2 text-slate-400">
            Start building and testing strategies
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
                placeholder="Choose username"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm text-slate-300">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="you@example.com"
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
                minLength={8}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="Minimum 8 characters"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm text-slate-300">
                Confirm password
              </label>

              <input
                type="password"
                value={passwordConfirm}
                onChange={(event) =>
                  setPasswordConfirm(
                    event.target.value
                  )
                }
                required
                minLength={8}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="Repeat your password"
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating account..."
                : "Create account"}
            </button>

          </div>

          <p className="mt-6 text-center text-sm text-slate-400">

            Already have an account?{" "}

            <a
              href="/login"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Sign in
            </a>

          </p>

        </form>

      </div>

    </main>
  );
}