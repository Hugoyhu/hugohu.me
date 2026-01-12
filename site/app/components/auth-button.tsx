"use client";

import { useSession, signOut } from "next-auth/react";

export default function AuthButton() {
  const { status } = useSession();
  if (status !== "authenticated") return null;

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1"
      aria-label="Log out"
    >
      log out
    </button>
  );
}
