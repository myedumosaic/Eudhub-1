"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navGroups: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "🏠" }],
  },
  {
    title: "People",
    items: [
      { href: "/dashboard/students", label: "Students", icon: "🎓" },
      { href: "/dashboard/staff", label: "Staff", icon: "🧑‍🏫" },
    ],
  },
  {
    title: "Academics",
    items: [
      { href: "/dashboard/sessions", label: "Sessions", icon: "🗓️" },
      { href: "/dashboard/classes", label: "Classes", icon: "📚" },
      { href: "/dashboard/subjects", label: "Subjects", icon: "📖" },
      { href: "/dashboard/assignments", label: "Assignments", icon: "📝" },
      { href: "/dashboard/gradebook", label: "Gradebook", icon: "📊" },
      { href: "/dashboard/attendance", label: "Attendance", icon: "✅" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/dashboard/fees", label: "Fees", icon: "💳" },
      { href: "/dashboard/transport", label: "Transport", icon: "🚌" },
    ],
  },
  {
    title: "Communication",
    items: [{ href: "/dashboard/announcements", label: "Announcements", icon: "📣" }],
  },
  {
    title: "Admin",
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: "📄" },
      { href: "/dashboard/permissions", label: "Permissions", icon: "🔐" },
      { href: "/dashboard/settings", label: "Customization", icon: "⚙️" },
    ],
  },
];

export default function Sidebar({
  user,
}: {
  user: { name: string; title: string | null; schoolName: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
          S
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Scholarly</p>
          <p className="truncate text-xs text-slate-400">{user.schoolName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.title || "Teacher"}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
          >
            ⎋
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            S
          </div>
          <span className="font-bold">Scholarly</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        >
          ☰ Menu
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">{content}</div>
        </div>
      )}
    </>
  );
}
