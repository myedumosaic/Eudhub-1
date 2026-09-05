"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type Assignment = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxPoints: number;
  status: string;
  classId: number;
  className: string | null;
  gradedCount: number;
};
type ClassOpt = { id: number; name: string };

const empty = { title: "", description: "", dueDate: "", maxPoints: "100", status: "open", classId: "" };

export default function AssignmentsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [a, c] = await Promise.all([
      fetch("/api/assignments").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
    ]);
    setRows(a.assignments || []);
    setClasses((c.classes || []).map((x: ClassOpt) => ({ id: x.id, name: x.name })));
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, classId: classes[0] ? String(classes[0].id) : "" });
    setModalOpen(true);
  }
  function openEdit(row: Assignment) {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description || "",
      dueDate: row.dueDate || "",
      maxPoints: String(row.maxPoints),
      status: row.status,
      classId: String(row.classId),
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/assignments/${editing.id}` : "/api/assignments";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      toast(editing ? "Assignment updated" : "Assignment created");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not save", "error");
    }
  }

  async function remove(row: Assignment) {
    if (!confirm(`Delete "${row.title}"? All grades will be lost.`)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== row.id));
    const res = await fetch(`/api/assignments/${row.id}`, { method: "DELETE" });
    if (res.ok) toast("Assignment deleted");
    else {
      setRows(prev);
      toast("Delete failed", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Create and track assignments across your classes."
        action={
          <button
            onClick={openCreate}
            disabled={classes.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            + New assignment
          </button>
        }
      />

      {loading ? (
        <TableSkeleton cols={4} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Create a class first"
          desc="Assignments belong to a class. Add a class to get started."
          action={
            <Link href="/dashboard/classes" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Go to classes
            </Link>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No assignments yet"
          desc="Create your first assignment to start grading."
          action={
            <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              + Create assignment
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.id} className="animate-in rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{row.title}</h3>
                  <p className="text-sm text-slate-500">{row.className}</p>
                </div>
                <Badge tone={row.status === "open" ? "green" : "slate"}>{row.status}</Badge>
              </div>
              {row.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{row.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>📅 {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "No due date"}</span>
                <span>⭐ {row.maxPoints} pts</span>
                <span>✅ {row.gradedCount} graded</span>
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/dashboard/gradebook?assignmentId=${row.id}`}
                  className="flex-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-center text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Grade
                </Link>
                <button onClick={() => openEdit(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Edit
                </button>
                <button onClick={() => remove(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit assignment" : "New assignment"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Description">
            <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Class">
              <select className={inputClass} value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Due date">
              <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <Field label="Max points">
              <input type="number" min={1} className={inputClass} value={form.maxPoints} onChange={(e) => setForm({ ...form, maxPoints: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save assignment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
