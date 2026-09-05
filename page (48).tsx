"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass } from "@/components/ui";
import { useToast } from "@/components/toast";

type Route = { id: number; name: string; stopName: string | null; driverName: string | null; vehicleNumber: string | null; monthlyFee: number; monthsRequired: number };
const empty = { name: "", stopName: "", driverName: "", vehicleNumber: "", monthlyFee: "0", monthsRequired: "12" };

export default function TransportPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Route | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { const d = await fetch("/api/transport").then((r) => r.json()); setRows(d.routes || []); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(r: Route) { setEditing(r); setForm({ name: r.name, stopName: r.stopName || "", driverName: r.driverName || "", vehicleNumber: r.vehicleNumber || "", monthlyFee: String(r.monthlyFee), monthsRequired: String(r.monthsRequired) }); setOpen(true); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(editing ? `/api/transport/${editing.id}` : "/api/transport", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setOpen(false); toast(editing ? "Updated" : "Route added"); load(); } else toast("Could not save", "error");
  }
  async function remove(r: Route) {
    if (!confirm(`Delete route "${r.name}"?`)) return;
    const prev = rows; setRows((x) => x.filter((s) => s.id !== r.id));
    const res = await fetch(`/api/transport/${r.id}`, { method: "DELETE" });
    if (res.ok) toast("Deleted"); else { setRows(prev); toast("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader title="Transport Routes" subtitle="Route-wise fees. The account head defines how many months are billed for accurate calculation."
        action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ New route</button>} />

      {loading ? <TableSkeleton cols={4} /> : rows.length === 0 ? (
        <EmptyState icon="🚌" title="No routes yet" desc="Add a transport route with monthly fee and billing months."
          action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ Add route</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="animate-in rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">{r.name}</h3>
              <p className="text-sm text-slate-500">{r.stopName || "—"}</p>
              <div className="mt-3 space-y-1 text-sm text-slate-500">
                <p>Driver: {r.driverName || "—"}</p>
                <p>Vehicle: {r.vehicleNumber || "—"}</p>
                <p className="font-medium text-slate-800">₹/$ {r.monthlyFee} × {r.monthsRequired} mo = <b>{r.monthlyFee * r.monthsRequired}</b></p>
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => openEdit(r)} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                <button onClick={() => remove(r)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit route" : "New route"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Route name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stop name"><input className={inputClass} value={form.stopName} onChange={(e) => setForm({ ...form, stopName: e.target.value })} /></Field>
            <Field label="Vehicle number"><input className={inputClass} value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} /></Field>
            <Field label="Driver name"><input className={inputClass} value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} /></Field>
            <Field label="Monthly fee"><input type="number" min={0} className={inputClass} value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} /></Field>
            <Field label="Months required"><input type="number" min={1} max={12} className={inputClass} value={form.monthsRequired} onChange={(e) => setForm({ ...form, monthsRequired: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
