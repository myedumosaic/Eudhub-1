"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type ClassRow = {
  id: number;
  name: string;
  gradeLevel: string | null;
  room: string | null;
  subject: string | null;
  teacherId: number | null;
  teacherName: string | null;
  studentCount: number;
};

type Teacher = { id: number; name: string };

const empty = { name: "", gradeLevel: "", room: "", subject: "", teacherId: "" };

export default function ClassesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [c, t] = await Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
    ]);
    setRows(c.classes || []);
    setTeachers(t.teachers || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  }
  function openEdit(row: ClassRow) {
    setEditing(row);
    setForm({
      name: row.name,
      gradeLevel: row.gradeLevel || "",
      room: row.room || "",
      subject: row.subject || "",
      teacherId: row.teacherId ? String(row.teacherId) : "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/classes/${editing.id}` : "/api/classes";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      toast(editing ? "Class updated" : "Class created");
      load();
    } else {
      toast("Could not save class", "error");
    }
  }

  async function remove(row: ClassRow) {
    if (!confirm(`Delete "${row.name}"? Students will be unassigned.`)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== row.id)); // optimistic
    const res = await fetch(`/api/classes/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Class deleted");
    } else {
      setRows(prev);
      toast("Delete failed", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Organize your sections, subjects and rosters."
        action={
          <button
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New class
          </button>
        }
      />

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No classes yet"
          desc="Create your first class to start adding students and assignments."
          action={
            <button
              onClick={openCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              + Create a class
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="animate-in flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{row.name}</h3>
                  <p className="text-sm text-slate-500">{row.subject || "General"}</p>
                </div>
                <Badge tone="indigo">{row.studentCount} students</Badge>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-500">
                {row.gradeLevel && <p>Grade: {row.gradeLevel}</p>}
                {row.room && <p>Room: {row.room}</p>}
                <p>Teacher: {row.teacherName || "Unassigned"}</p>
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() => openEdit(row)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(row)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit class" : "New class"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Class name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Algebra I - Period 2"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Subject">
              <input
                className={inputClass}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Mathematics"
              />
            </Field>
            <Field label="Grade level">
              <input
                className={inputClass}
                value={form.gradeLevel}
                onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                placeholder="9"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room">
              <input
                className={inputClass}
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="204"
              />
            </Field>
            <Field label="Teacher">
              <select
                className={inputClass}
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">Me / unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save class"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
