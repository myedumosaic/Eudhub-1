"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui";

type Dashboard = {
  stats: {
    students: number;
    classes: number;
    openAssignments: number;
    attendanceRate: number | null;
  };
  upcoming: { id: number; title: string; dueDate: string | null; className: string | null }[];
  recentAnnouncements: {
    id: number;
    title: string;
    body: string;
    createdAt: string;
    pinned: boolean;
  }[];
  perClass: { className: string; count: number }[];
};

export default function DashboardHome() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Students", key: "students", icon: "🎓", tone: "bg-indigo-50 text-indigo-600" },
    { label: "Classes", key: "classes", icon: "📚", tone: "bg-sky-50 text-sky-600" },
    { label: "Open assignments", key: "openAssignments", icon: "📝", tone: "bg-amber-50 text-amber-600" },
  ] as const;

  const maxCount = Math.max(1, ...(data?.perClass.map((p) => p.count) ?? [1]));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="A live snapshot of your classroom."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.key} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl text-lg ${c.tone}`}>
              {c.icon}
            </div>
            {loading ? (
              <div className="skeleton h-8 w-16 rounded" />
            ) : (
              <p className="text-3xl font-bold text-slate-900">{data?.stats[c.key]}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-600">
            ✅
          </div>
          {loading ? (
            <div className="skeleton h-8 w-16 rounded" />
          ) : (
            <p className="text-3xl font-bold text-slate-900">
              {data?.stats.attendanceRate == null ? "—" : `${data.stats.attendanceRate}%`}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-500">Attendance rate</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Students per class</h2>
          {loading ? (
            <div className="mt-6 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-6 w-full rounded" />
              ))}
            </div>
          ) : data && data.perClass.length > 0 ? (
            <div className="mt-6 space-y-4">
              {data.perClass.map((p) => (
                <div key={p.className} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-slate-600">
                    {p.className}
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-indigo-500 pr-2 text-xs font-semibold text-white transition-all"
                      style={{ width: `${Math.max(8, (p.count / maxCount) * 100)}%` }}
                    >
                      {p.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-400">No classes yet.</p>
          )}
        </div>

        {/* Upcoming */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Due soon</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : data && data.upcoming.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {data.upcoming.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <p className="font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-400">
                    {a.className} · {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Nothing due. Nice work! 🎉</p>
          )}
          <Link
            href="/dashboard/assignments"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline"
          >
            View all assignments →
          </Link>
        </div>
      </div>

      {/* Announcements */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent announcements</h2>
          <Link
            href="/dashboard/announcements"
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : data && data.recentAnnouncements.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.recentAnnouncements.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-100 p-4">
                <div className="mb-1 flex items-center gap-2">
                  {a.pinned && <Badge tone="amber">📌 Pinned</Badge>}
                  <p className="font-medium text-slate-800">{a.title}</p>
                </div>
                <p className="line-clamp-2 text-sm text-slate-500">{a.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
