"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type Subject = { id: number; name: string; code: string | null; isElective: boolean };
const empty = { name: "", code: "", isElective: false };

export default function SubjectsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/subjects").then((r) => r.json());
    setRows(d.subjects || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(r: Subject) { setEditing(r); setForm({ name: r.name, code: r.code || "", isElective: r.isElective }); setOpen(true); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(editing ? `/api/subjects/${editing.id}` : "/api/subjects", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setOpen(false); toast(editing ? "Updated" : "Subject added"); load(); } else toast("Could not save", "error");
  }
  async function remove(r: Subject) {
    if (!confirm(`Delete ${r.name}?`)) return;
    const prev = rows; setRows((x) => x.filter((s) => s.id !== r.id));
    const res = await fetch(`/api/subjects/${r.id}`, { method: "DELETE" });
    if (res.ok) toast("Deleted"); else { setRows(prev); toast("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader title="Subjects" subtitle="Define subjects and electives students can be assigned (e.g. Grade 6-12 extra subjects)."
        action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ Add subject</button>} />

      {loading ? <TableSkeleton cols={3} /> : rows.length === 0 ? (
        <EmptyState icon="📖" title="No subjects yet" desc="Add subjects, then assign them per student from the Students module."
          action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ Add subject</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="animate-in rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{r.name}</h3>
                  {r.code && <p className="text-sm text-slate-500">{r.code}</p>}
                </div>
                {r.isElective && <Badge tone="amber">Elective</Badge>}
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => openEdit(r)} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                <button onClick={() => remove(r)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit subject" : "Add subject"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Subject name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Code"><input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH101" /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isElective} onChange={(e) => setForm({ ...form, isElective: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> This is an elective/extra subject</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
