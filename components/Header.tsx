"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

const NAV_LINKS: NavLink[] = [
  { href: "/capsules/new", label: "New capsule" },
  { href: "/capsules", label: "All capsules" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-gray-900"
        >
          Capsule
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-6 text-sm">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "font-semibold text-gray-900 underline underline-offset-4"
                        : "text-gray-600 hover:text-gray-900"
                    }
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
