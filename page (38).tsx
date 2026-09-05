"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type Invoice = {
  id: number; studentId: number; studentName: string; title: string;
  baseAmount: number; transportFee: number; siblingDiscount: number; otherDiscount: number;
  fine: number; amountPaid: number; net: number; dueDate: string | null; status: string;
};
type FeeHead = { id: number; name: string; amount: number; frequency: string };
type Route = { id: number; name: string; monthlyFee: number; monthsRequired: number };
type StudentOpt = { id: number; firstName: string; lastName: string };

const emptyInv = { studentId: "", title: "", baseAmount: "0", transportFee: "0", siblingDiscount: "0", otherDiscount: "0", fine: "0", amountPaid: "0", dueDate: "", note: "" };

export default function FeesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"invoices" | "heads">("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [invOpen, setInvOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Invoice | null>(null);
  const [invForm, setInvForm] = useState(emptyInv);
  const [saving, setSaving] = useState(false);

  const [headOpen, setHeadOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<FeeHead | null>(null);
  const [headForm, setHeadForm] = useState({ name: "", amount: "0", frequency: "monthly" });

  async function load() {
    const [i, h, r, s] = await Promise.all([
      fetch("/api/fees").then((x) => x.json()),
      fetch("/api/fee-heads").then((x) => x.json()),
      fetch("/api/transport").then((x) => x.json()),
      fetch("/api/students").then((x) => x.json()),
    ]);
    setInvoices(i.invoices || []);
    setHeads(h.feeHeads || []);
    setRoutes(r.routes || []);
    setStudents((s.students || []).map((x: StudentOpt) => ({ id: x.id, firstName: x.firstName, lastName: x.lastName })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const net = useMemo(() => {
    const n = (k: string) => Number(invForm[k as keyof typeof invForm]) || 0;
    return n("baseAmount") + n("transportFee") + n("fine") - n("siblingDiscount") - n("otherDiscount") - n("amountPaid");
  }, [invForm]);

  function openCreateInv() { setEditingInv(null); setInvForm(emptyInv); setInvOpen(true); }
  function openEditInv(r: Invoice) {
    setEditingInv(r);
    setInvForm({
      studentId: String(r.studentId), title: r.title, baseAmount: String(r.baseAmount),
      transportFee: String(r.transportFee), siblingDiscount: String(r.siblingDiscount),
      otherDiscount: String(r.otherDiscount), fine: String(r.fine), amountPaid: String(r.amountPaid),
      dueDate: r.dueDate || "", note: "",
    });
    setInvOpen(true);
  }
  async function saveInv(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(editingInv ? `/api/fees/${editingInv.id}` : "/api/fees", {
      method: editingInv ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invForm),
    });
    setSaving(false);
    if (res.ok) { setInvOpen(false); toast(editingInv ? "Invoice updated" : "Invoice created"); load(); }
    else { const d = await res.json().catch(() => ({})); toast(d.error || "Could not save", "error"); }
  }
  async function removeInv(r: Invoice) {
    if (!confirm(`Delete invoice for ${r.studentName}?`)) return;
    const prev = invoices; setInvoices((x) => x.filter((i) => i.id !== r.id));
    const res = await fetch(`/api/fees/${r.id}`, { method: "DELETE" });
    if (res.ok) toast("Deleted"); else { setInvoices(prev); toast("Delete failed", "error"); }
  }

  function applyRoute(routeId: string) {
    const route = routes.find((r) => String(r.id) === routeId);
    if (route) setInvForm((f) => ({ ...f, transportFee: String(route.monthlyFee * route.monthsRequired) }));
  }

  function openCreateHead() { setEditingHead(null); setHeadForm({ name: "", amount: "0", frequency: "monthly" }); setHeadOpen(true); }
  function openEditHead(h: FeeHead) { setEditingHead(h); setHeadForm({ name: h.name, amount: String(h.amount), frequency: h.frequency }); setHeadOpen(true); }
  async function saveHead(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editingHead ? `/api/fee-heads/${editingHead.id}` : "/api/fee-heads", {
      method: editingHead ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(headForm),
    });
    if (res.ok) { setHeadOpen(false); toast("Saved"); load(); } else toast("Could not save", "error");
  }
  async function removeHead(h: FeeHead) {
    if (!confirm(`Delete fee head "${h.name}"?`)) return;
    const prev = heads; setHeads((x) => x.filter((i) => i.id !== h.id));
    const res = await fetch(`/api/fee-heads/${h.id}`, { method: "DELETE" });
    if (res.ok) toast("Deleted"); else { setHeads(prev); toast("Delete failed", "error"); }
  }

  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + Math.max(0, i.net), 0);
  const tone = (s: string) => (s === "paid" ? "green" : s === "partial" ? "amber" : "rose");

  return (
    <div>
      <PageHeader title="Fees" subtitle="Fee heads, discounts (incl. sibling), fines, and transport — with accurate net calculation."
        action={tab === "invoices"
          ? <button onClick={openCreateInv} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ New invoice</button>
          : <button onClick={openCreateHead} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ New fee head</button>} />

      <div className="mb-5 flex gap-2">
        {(["invoices", "heads"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {t === "invoices" ? "Invoices" : "Fee heads"}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <>
          {!loading && invoices.length > 0 && (
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Invoices</p><p className="text-2xl font-bold">{invoices.length}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Collected</p><p className="text-2xl font-bold text-emerald-600">{totalCollected}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Outstanding</p><p className="text-2xl font-bold text-rose-600">{totalOutstanding}</p></div>
            </div>
          )}
          {loading ? <TableSkeleton cols={5} /> : invoices.length === 0 ? (
            <EmptyState icon="💳" title="No invoices yet" desc="Create an invoice with discounts, fines and transport fees."
              action={<button onClick={openCreateInv} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ New invoice</button>} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Base+Trans+Fine</th><th className="px-4 py-3">Discounts</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Net due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-900">{r.studentName}</td>
                        <td className="px-4 py-3 text-slate-600">{r.title}</td>
                        <td className="px-4 py-3 text-slate-600">{r.baseAmount}+{r.transportFee}+{r.fine}</td>
                        <td className="px-4 py-3 text-slate-600">{r.siblingDiscount + r.otherDiscount}</td>
                        <td className="px-4 py-3 text-slate-600">{r.amountPaid}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.net}</td>
                        <td className="px-4 py-3"><Badge tone={tone(r.status)}>{r.status}</Badge></td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openEditInv(r)} className="mr-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                          <button onClick={() => removeInv(r)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "heads" && (
        loading ? <TableSkeleton cols={3} /> : heads.length === 0 ? (
          <EmptyState icon="🧾" title="No fee heads" desc="Define reusable fee heads (tuition, admission, exam, etc.)."
            action={<button onClick={openCreateHead} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ New fee head</button>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {heads.map((h) => (
              <div key={h.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between"><h3 className="font-semibold">{h.name}</h3><Badge tone="indigo">{h.frequency}</Badge></div>
                <p className="mt-2 text-2xl font-bold">{h.amount}</p>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <button onClick={() => openEditHead(h)} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                  <button onClick={() => removeHead(h)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Invoice modal */}
      <Modal open={invOpen} onClose={() => setInvOpen(false)} title={editingInv ? "Edit invoice" : "New invoice"}>
        <form onSubmit={saveInv} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Student"><select className={inputClass} value={invForm.studentId} onChange={(e) => setInvForm({ ...invForm, studentId: e.target.value })} required disabled={!!editingInv}><option value="">Select…</option>{students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></Field>
            <Field label="Title"><input className={inputClass} value={invForm.title} onChange={(e) => setInvForm({ ...invForm, title: e.target.value })} placeholder="Term 1 fees" required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Base amount"><input type="number" className={inputClass} value={invForm.baseAmount} onChange={(e) => setInvForm({ ...invForm, baseAmount: e.target.value })} /></Field>
            <Field label="Apply transport route">
              <select className={inputClass} onChange={(e) => applyRoute(e.target.value)}><option value="">Select route…</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.monthlyFee}×{r.monthsRequired})</option>)}</select>
            </Field>
            <Field label="Transport fee"><input type="number" className={inputClass} value={invForm.transportFee} onChange={(e) => setInvForm({ ...invForm, transportFee: e.target.value })} /></Field>
            <Field label="Sibling discount"><input type="number" className={inputClass} value={invForm.siblingDiscount} onChange={(e) => setInvForm({ ...invForm, siblingDiscount: e.target.value })} /></Field>
            <Field label="Other discount"><input type="number" className={inputClass} value={invForm.otherDiscount} onChange={(e) => setInvForm({ ...invForm, otherDiscount: e.target.value })} /></Field>
            <Field label="Fine"><input type="number" className={inputClass} value={invForm.fine} onChange={(e) => setInvForm({ ...invForm, fine: e.target.value })} /></Field>
            <Field label="Amount paid"><input type="number" className={inputClass} value={invForm.amountPaid} onChange={(e) => setInvForm({ ...invForm, amountPaid: e.target.value })} /></Field>
            <Field label="Due date"><input type="date" className={inputClass} value={invForm.dueDate} onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} /></Field>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <span className="text-slate-500">Net due: </span>
            <span className={`text-lg font-bold ${net <= 0 ? "text-emerald-600" : "text-slate-900"}`}>{net}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setInvOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save invoice"}</button>
          </div>
        </form>
      </Modal>

      {/* Fee head modal */}
      <Modal open={headOpen} onClose={() => setHeadOpen(false)} title={editingHead ? "Edit fee head" : "New fee head"}>
        <form onSubmit={saveHead} className="space-y-4">
          <Field label="Name"><input className={inputClass} value={headForm.name} onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount"><input type="number" className={inputClass} value={headForm.amount} onChange={(e) => setHeadForm({ ...headForm, amount: e.target.value })} /></Field>
            <Field label="Frequency"><select className={inputClass} value={headForm.frequency} onChange={(e) => setHeadForm({ ...headForm, frequency: e.target.value })}><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="one-time">One-time</option></select></Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setHeadOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
