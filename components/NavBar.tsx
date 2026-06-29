"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "Home" },
  { href: "/transactions", label: "Records", short: "Records" },
  { href: "/add", label: "Add", short: "Add" },
  { href: "/reports", label: "Reports", short: "Reports" },
];

export default function NavBar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">
              <span aria-hidden="true" className="text-[10px] font-normal opacity-70">♪</span>{" "}
              Music Tax Tracker{" "}
              <span aria-hidden="true" className="text-[10px] font-normal opacity-70">♪</span>
            </p>
            <p className="text-sm text-slate-500">{displayName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center text-xs font-semibold ${
                  active ? "text-brand-700" : "text-slate-500"
                }`}
              >
                {item.short}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="hidden border-b border-slate-200 bg-white lg:block">
        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 px-5 py-4 text-sm font-semibold transition ${
                  active
                    ? "border-brand-700 text-brand-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
