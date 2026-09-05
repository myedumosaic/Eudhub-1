import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const features = [
    { icon: "🏫", title: "Multi-tenant", desc: "Every school gets its own isolated, secure workspace." },
    { icon: "👩‍🏫", title: "Classes & Students", desc: "Organize rosters, sections and enrollment in seconds." },
    { icon: "📝", title: "Gradebook", desc: "Create assignments and grade the whole class fast." },
    { icon: "✅", title: "Attendance", desc: "Take daily attendance with one tap per student." },
    { icon: "📊", title: "Live dashboard", desc: "See student counts, attendance rate and what's due." },
    { icon: "📣", title: "Announcements", desc: "Keep your team in the loop with pinned notices." },
  ];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            S
          </div>
          <span className="text-lg font-bold tracking-tight">Scholarly</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-10 py-16 md:grid-cols-2">
          <div className="animate-in">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              Multi-tenant School ERP
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              The teacher toolkit that makes school admin{" "}
              <span className="text-indigo-600">effortless</span>.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600">
              Manage classes, students, grades and attendance from one polished
              dashboard. Built for teachers, ready for your whole school.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Create your school
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Try the demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Demo login: <span className="font-mono font-semibold">ada@oakridge.edu</span> / <span className="font-mono font-semibold">password123</span>
            </p>
          </div>

          <div className="animate-in rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Good morning,</p>
                <p className="font-semibold">Ms. Ada Lovelace</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                94% attendance
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: "Students", v: "128" },
                { k: "Classes", v: "6" },
                { k: "Due soon", v: "4" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{s.v}</p>
                  <p className="text-xs text-slate-500">{s.k}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {["Algebra I — Quiz 3 due Fri", "Biology — Lab report graded", "Homeroom — Attendance taken"].map(
                (t) => (
                  <div key={t} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-sm">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    {t}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Scholarly. A multi-tenant school ERP demo.
      </footer>
    </div>
  );
}
