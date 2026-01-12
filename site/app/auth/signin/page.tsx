"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/admin",
    });
    setLoading(false);
    if (res?.ok) {
      window.location.href = "/admin";
    } else {
      setError("Invalid credentials");
    }
  }

  return (
    <section className="antialiased max-w-xl mx-4 mt-8 lg:mx-auto overflow-x-hidden">
      <h1 className="title font-semibold text-2xl tracking-tighter mb-4">
        Sign In
      </h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 max-w-sm">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
            required
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-500" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </section>
  );
}
