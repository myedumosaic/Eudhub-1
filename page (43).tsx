"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type Session = { id: number; name: string; startDate: string | null; endDate: string | null; isActive: boolean };
const empty = { name: "", startDate: "", endDate: "", isActive: false };

export default function SessionsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/sessions").then((r) => r.json());
    setRows(d.sessions || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(r: Session) {
    setEditing(r);
    setForm({ name: r.name, startDate: r.startDate || "", endDate: r.endDate || "", isActive: r.isActive });
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(editing ? `/api/sessions/${editing.id}` : "/api/sessions", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setOpen(false); toast(editing ? "Session updated" : "Session created"); load(); }
    else toast("Could not save", "error");
  }
  async function remove(r: Session) {
    if (!confirm(`Delete session "${r.name}"?`)) return;
    const prev = rows; setRows((x) => x.filter((s) => s.id !== r.id));
    const res = await fetch(`/api/sessions/${r.id}`, { method: "DELETE" });
    if (res.ok) toast("Deleted"); else { setRows(prev); toast("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader title="Academic Sessions" subtitle="Create year-wise sessions. Data is arranged session-wise across the ERP."
        action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ New session</button>} />

      {loading ? <TableSkeleton cols={4} /> : rows.length === 0 ? (
        <EmptyState icon="🗓️" title="No sessions yet" desc="Create an academic session (e.g. 2026-2027) to organize students and fees."
          action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ Create session</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="animate-in rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900">{r.name}</h3>
                {r.isActive && <Badge tone="green">Active</Badge>}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {r.startDate ? new Date(r.startDate).toLocaleDateString() : "—"} → {r.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}
              </p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => openEdit(r)} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                <button onClick={() => remove(r)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit session" : "New session"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Session name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2026-2027" required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date"><input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="End date"><input type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Set as active session</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
