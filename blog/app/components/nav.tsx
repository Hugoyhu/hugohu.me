import Link from "next/link";

const navItems = {
  "/": {
    name: "home",
    newTab: false,
  },
  "/projects": {
    name: "projects",
    newTab: false,
  },
  "/media/Resume.pdf": {
    name: "resume",
    newTab: true,
  },
  "https://photography.hugohu.me": {
    name: "photography",
    newTab: true,
  },
};

export function Navbar() {
  return (
    <aside className="-ml-[8px] mb-16 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <nav
          className="flex flex-row items-start justify-end w-full relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
        >
          <div className="flex flex-row space-x-0 pr-10">
            {Object.entries(navItems).map(([path, { name, newTab }]) => {
              return (
                <Link
                  key={path}
                  href={path}
                  target={newTab ? "_blank" : undefined}
                  rel={newTab ? "noopener noreferrer" : undefined}
                  className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1"
                >
                  {name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}
