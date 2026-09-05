"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { Field, inputClass, TableSkeleton } from "@/components/ui";
import { useToast } from "@/components/toast";

type Settings = {
  academicYear: string;
  gradeScale: string;
  passingGrade: number;
  attendanceThreshold: number;
  currency: string;
  timezone: string;
  primaryColor: string;
  weekStart: string;
  logoEmoji: string;
};

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setForm(d.settings));
  }, []);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) toast("Settings saved");
    else toast("Could not save settings", "error");
  }

  if (!form) {
    return (
      <div>
        <PageHeader title="Customization" subtitle="Tailor the ERP to your school." />
        <TableSkeleton cols={2} rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Customization"
        subtitle="Tenant-wide settings that power grading, attendance, reports and future modules."
      />

      <form onSubmit={save} className="max-w-3xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Academic</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Academic year">
              <input className={inputClass} value={form.academicYear} onChange={(e) => set("academicYear", e.target.value)} />
            </Field>
            <Field label="Grade scale">
              <select className={inputClass} value={form.gradeScale} onChange={(e) => set("gradeScale", e.target.value)}>
                <option value="percentage">Percentage (0-100)</option>
                <option value="letter">Letter (A-F)</option>
                <option value="gpa">GPA (0-4.0)</option>
              </select>
            </Field>
            <Field label="Passing grade (%)">
              <input type="number" min={0} max={100} className={inputClass} value={form.passingGrade} onChange={(e) => set("passingGrade", Number(e.target.value))} />
            </Field>
            <Field label="Attendance threshold (%)">
              <input type="number" min={0} max={100} className={inputClass} value={form.attendanceThreshold} onChange={(e) => set("attendanceThreshold", Number(e.target.value))} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            These thresholds drive the <b>At-Risk Students</b> and <b>Honor Roll</b> reports.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Regional</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              <select className={inputClass} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {["USD", "EUR", "GBP", "INR", "AED", "NGN", "KES", "ZAR"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <select className={inputClass} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {["UTC", "America/New_York", "America/Chicago", "Europe/London", "Asia/Kolkata", "Asia/Dubai", "Africa/Lagos", "Asia/Tokyo"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Week starts on">
              <select className={inputClass} value={form.weekStart} onChange={(e) => set("weekStart", e.target.value)}>
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Branding</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School logo emoji">
              <input className={inputClass} maxLength={4} value={form.logoEmoji} onChange={(e) => set("logoEmoji", e.target.value)} />
            </Field>
            <Field label="Accent color">
              <select className={inputClass} value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)}>
                {["indigo", "blue", "emerald", "rose", "amber", "violet"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save customization"}
          </button>
        </div>
      </form>
    </div>
  );
}
