"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import BulkTools from "@/components/bulk-tools";

type Staff = Record<string, string | null> & { id: number; firstName: string; lastName: string; status: string };

const empty: Record<string, string> = {
  enrollmentNo: "", joiningDate: "", designation: "", firstName: "", middleName: "", lastName: "",
  gender: "", dateOfBirth: "", department: "", bloodGroup: "", mobileNumber: "", email: "",
  fatherName: "", spouseName: "", currentAddress: "", permanentAddress: "",
  bankAccountNumber: "", bankName: "", ifscCode: "", aadhaarNo: "", status: "active",
};

export default function StaffPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/staff").then((r) => r.json());
    setRows(d.staff || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => `${r.firstName} ${r.lastName} ${r.designation ?? ""} ${r.department ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(r: Staff) {
    setEditing(r);
    const f = { ...empty };
    Object.keys(empty).forEach((k) => (f[k] = r[k] == null ? "" : String(r[k])));
    setForm(f); setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(editing ? `/api/staff/${editing.id}` : "/api/staff", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setOpen(false); toast(editing ? "Staff updated" : "Staff added"); load(); }
    else toast("Could not save", "error");
  }
  async function remove(r: Staff) {
    if (!confirm(`Delete ${r.firstName} ${r.lastName}?`)) return;
    const prev = rows; setRows((x) => x.filter((s) => s.id !== r.id));
    const res = await fetch(`/api/staff/${r.id}`, { method: "DELETE" });
    if (res.ok) toast("Deleted"); else { setRows(prev); toast("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader title="Staff" subtitle="Human resource records with bulk import/export."
        action={<div className="flex flex-wrap gap-2"><BulkTools base="/api/staff/bulk" label="staff" onImported={load} /><button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ Add staff</button></div>} />

      {!loading && rows.length > 0 && (
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff…" className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      )}

      {loading ? <TableSkeleton cols={5} /> : rows.length === 0 ? (
        <EmptyState icon="🧑‍🏫" title="No staff yet" desc="Add staff members or bulk import from a CSV."
          action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ Add staff</button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Enroll No</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-600">{r.enrollmentNo || "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.designation || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.mobileNumber || "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(r)} className="mr-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                      <button onClick={() => remove(r)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit staff" : "Add staff"}>
        <form onSubmit={save} className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <F label="Enrollment No" k="enrollmentNo" form={form} set={set} />
            <F label="Joining Date" k="joiningDate" form={form} set={set} type="date" />
            <F label="First Name *" k="firstName" form={form} set={set} required />
            <F label="Middle Name" k="middleName" form={form} set={set} />
            <F label="Last Name *" k="lastName" form={form} set={set} required />
            <Field label="Gender"><select className={inputClass} value={form.gender} onChange={(e) => set("gender", e.target.value)}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
            <F label="Date of Birth" k="dateOfBirth" form={form} set={set} type="date" />
            <F label="Designation" k="designation" form={form} set={set} />
            <F label="Department" k="department" form={form} set={set} />
            <F label="Blood Group" k="bloodGroup" form={form} set={set} />
            <F label="Mobile Number" k="mobileNumber" form={form} set={set} />
            <F label="Email" k="email" form={form} set={set} type="email" />
            <F label="Father Name" k="fatherName" form={form} set={set} />
            <F label="Spouse Name" k="spouseName" form={form} set={set} />
            <F label="Current Address" k="currentAddress" form={form} set={set} />
            <F label="Permanent Address" k="permanentAddress" form={form} set={set} />
            <F label="Bank Account Number" k="bankAccountNumber" form={form} set={set} />
            <F label="Bank Name" k="bankName" form={form} set={set} />
            <F label="IFSC Code" k="ifscCode" form={form} set={set} />
            <F label="Aadhaar No" k="aadhaarNo" form={form} set={set} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function F({ label, k, form, set, type = "text", required }: { label: string; k: string; form: Record<string, string>; set: (k: string, v: string) => void; type?: string; required?: boolean }) {
  return <Field label={label}><input className={inputClass} type={type} required={required} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></Field>;
}
