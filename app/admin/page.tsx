import Link from "next/link";
export default function AdminPage() {
  return (
    <section>
      <h1 className="title font-semibold text-2xl tracking-tighter">Admin</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Authenticated.
      </p>

      <Link href="/admin/upload">Image Upload Page</Link>
    </section>
  );
}
