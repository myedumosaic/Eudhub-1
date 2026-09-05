"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { TableSkeleton, EmptyState } from "@/components/ui";
import { useToast } from "@/components/toast";

type Teacher = { id: number; name: string; email: string; role: string };
type Row = { module: string; canView: boolean; canEntry: boolean; canEdit: boolean; canDelete: boolean };

export default function PermissionsPage() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [matrix, setMatrix] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/teachers").then((r) => r.json()).then((d) => {
      setTeachers(d.teachers || []);
      if (d.teachers?.[0]) setUserId(String(d.teachers[0].id));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingMatrix(true);
    fetch(`/api/permissions?userId=${userId}`).then((r) => r.json()).then((d) => {
      setMatrix(d.matrix || []);
    }).finally(() => setLoadingMatrix(false));
  }, [userId]);

  function toggle(i: number, key: keyof Row) {
    setMatrix((m) => m.map((r, idx) => (idx === i ? { ...r, [key]: !r[key] } : r)));
  }
  function setAll(i: number, val: boolean) {
    setMatrix((m) => m.map((r, idx) => (idx === i ? { ...r, canView: val, canEntry: val, canEdit: val, canDelete: val } : r)));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/permissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: Number(userId), matrix }),
    });
    setSaving(false);
    if (res.ok) toast("Permissions saved");
    else { const d = await res.json().catch(() => ({})); toast(d.error || "Save failed", "error"); }
  }

  if (loading) return (<div><PageHeader title="Permissions" subtitle="Checkbox access control." /><TableSkeleton cols={5} /></div>);

  return (
    <div>
      <PageHeader title="Permissions" subtitle="Grant View / Entry / Edit / Delete per module for each user."
        action={<button onClick={save} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save permissions"}</button>} />

      {teachers.length === 0 ? (
        <EmptyState icon="🔐" title="No users" desc="Invite team members to manage their permissions." />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
            </select>
          </div>

          {loadingMatrix ? <TableSkeleton cols={5} /> : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Module</th><th className="px-4 py-3 text-center">View</th><th className="px-4 py-3 text-center">Entry</th><th className="px-4 py-3 text-center">Edit</th><th className="px-4 py-3 text-center">Delete</th><th className="px-4 py-3 text-center">All</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrix.map((r, i) => (
                    <tr key={r.module} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium capitalize text-slate-800">{r.module}</td>
                      {(["canView", "canEntry", "canEdit", "canDelete"] as const).map((k) => (
                        <td key={k} className="px-4 py-3 text-center">
                          <input type="checkbox" checked={r[k]} onChange={() => toggle(i, k)} className="h-4 w-4 rounded border-slate-300" />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setAll(i, true)} className="mr-1 text-xs font-semibold text-indigo-600 hover:underline">All</button>
                        <button onClick={() => setAll(i, false)} className="text-xs font-semibold text-slate-400 hover:underline">None</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
