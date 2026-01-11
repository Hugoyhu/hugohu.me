import Link from "next/link";
import type { ProjectEntry } from "app/projects/data";

export function ProjectsList({ entries }: { entries: ProjectEntry[] }) {
  const sorted = [...entries].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {sorted.map((p) => (
        <article
          key={`${p.title}-${p.url}`}
          className="project-card rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        >
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt={p.title}
              className="w-full h-auto object-cover"
            />
          ) : null}

          <div className="p-4 space-y-2">
            <h3 className="text-lg font-medium tracking-tight">
              <Link
                href={p.url}
                className="underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                {p.title}
              </Link>
              {p.year ? (
                <span className="text-neutral-600 dark:text-neutral-400">{` | ${p.year}`}</span>
              ) : null}
            </h3>
            {p.description ? (
              <p className="text-neutral-700 dark:text-neutral-300">
                {p.description}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
