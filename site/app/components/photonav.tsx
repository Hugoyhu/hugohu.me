import Link from "next/link";
import AuthButton from "./auth-button";

const navItems = {
  "/photos": {
    name: "featured",
    newTab: false,
  },
  "/photos/collections": {
    name: "collections",
    newTab: false,
  },
  "/photos/trips": {
    name: "trips",
    newTab: false,
  },
};

export function PhotoNavbar() {
  return (
    <aside className="mb-16 tracking-tight">
      <div className="max-w-xl w-full mx-auto px-2 md:px-0">
        <div className="lg:sticky lg:top-20">
          <nav
            className="flex flex-row items-start justify-end w-full relative px-0 pb-0 fade overflow-x-auto whitespace-nowrap scroll-pr-6 md:relative"
            id="nav"
          >
            <div className="flex flex-row space-x-0 pr-0">
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
      </div>
    </aside>
  );
}
