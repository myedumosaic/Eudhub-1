"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type Announcement = {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorName: string | null;
};

const empty = { title: "", body: "", pinned: false };

export default function AnnouncementsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/announcements").then((r) => r.json());
    setRows(d.announcements || []);
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
  function openEdit(row: Announcement) {
    setEditing(row);
    setForm({ title: row.title, body: row.body, pinned: row.pinned });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/announcements/${editing.id}` : "/api/announcements";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      toast(editing ? "Announcement updated" : "Announcement posted");
      load();
    } else {
      toast("Could not save", "error");
    }
  }

  async function remove(row: Announcement) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== row.id));
    const res = await fetch(`/api/announcements/${row.id}`, { method: "DELETE" });
    if (res.ok) toast("Announcement deleted");
    else {
      setRows(prev);
      toast("Delete failed", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Keep your school team informed."
        action={
          <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
            + New announcement
          </button>
        }
      />

      {loading ? (
        <TableSkeleton cols={2} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="📣"
          title="No announcements yet"
          desc="Post your first announcement to keep everyone in the loop."
          action={
            <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              + Post announcement
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="animate-in rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {row.pinned && <Badge tone="amber">📌 Pinned</Badge>}
                  <h3 className="font-semibold text-slate-900">{row.title}</h3>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(row)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Edit
                  </button>
                  <button onClick={() => remove(row)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{row.body}</p>
              <p className="mt-3 text-xs text-slate-400">
                {row.authorName || "Someone"} · {new Date(row.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit announcement" : "New announcement"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Message">
            <textarea className={inputClass} rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            Pin to top
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
