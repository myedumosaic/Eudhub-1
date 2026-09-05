"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Modal, Field, inputClass, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import BulkTools from "@/components/bulk-tools";

type Student = Record<string, string | number | boolean | null> & {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  classId: number | null;
  className: string | null;
};
type ClassOpt = { id: number; name: string };
type SessionOpt = { id: number; name: string; isActive: boolean };
type SubjectOpt = { id: number; name: string };

const emptyForm: Record<string, string | boolean> = {
  admissionNo: "", penNo: "", apaarNo: "", rollNumber: "", section: "",
  firstName: "", middleName: "", lastName: "", gender: "", dateOfBirth: "",
  category: "", religion: "", caste: "", bloodGroup: "", mobileNumber: "", email: "",
  admissionDate: "", fatherName: "", fatherPhone: "", fatherOccupation: "",
  motherName: "", motherPhone: "", motherOccupation: "", guardianName: "", guardianPhone: "",
  currentAddress: "", permanentAddress: "", house: "", city: "", state: "",
  bankAccountNumber: "", bankName: "", ifscCode: "", aadhaarNo: "", samagraId: "",
  rte: false, hosteller: false, status: "active", classId: "", sessionId: "",
};

const TABS = ["Identity", "Parents", "Address", "Bank & IDs", "Enrollment"] as const;

export default function StudentsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [sessions, setSessions] = useState<SessionOpt[]>([]);
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Identity");
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promote, setPromote] = useState({ toClassId: "", toSessionId: "", toSection: "" });
  const [subjModal, setSubjModal] = useState<Student | null>(null);
  const [subjIds, setSubjIds] = useState<number[]>([]);

  async function load() {
    const [s, c, se, sub] = await Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ]);
    setRows(s.students || []);
    setClasses((c.classes || []).map((x: ClassOpt) => ({ id: x.id, name: x.name })));
    setSessions(se.sessions || []);
    setSubjects(sub.subjects || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        String(r.admissionNo || "").toLowerCase().includes(q) ||
        String(r.className || "").toLowerCase().includes(q);
      const matchesS = !statusFilter || r.status === statusFilter;
      return matchesQ && matchesS;
    });
  }, [rows, query, statusFilter]);

  function set(k: string, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openCreate() {
    setEditing(null);
    const activeSession = sessions.find((s) => s.isActive);
    setForm({ ...emptyForm, sessionId: activeSession ? String(activeSession.id) : "" });
    setTab("Identity");
    setModalOpen(true);
  }
  function openEdit(row: Student) {
    setEditing(row);
    const f: Record<string, string | boolean> = { ...emptyForm };
    Object.keys(emptyForm).forEach((k) => {
      const v = row[k];
      if (typeof emptyForm[k] === "boolean") f[k] = !!v;
      else f[k] = v == null ? "" : String(v);
    });
    setForm(f);
    setTab("Identity");
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/students/${editing.id}` : "/api/students";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      toast(editing ? "Student updated" : "Student enrolled");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not save", "error");
    }
  }

  async function remove(row: Student) {
    if (!confirm(`Delete ${row.firstName} ${row.lastName}? This is permanent.`)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== row.id));
    const res = await fetch(`/api/students/${row.id}`, { method: "DELETE" });
    if (res.ok) toast("Student deleted");
    else {
      setRows(prev);
      toast("Delete failed", "error");
    }
  }

  async function setDropout(row: Student) {
    if (!confirm(`Mark ${row.firstName} ${row.lastName} as dropout?`)) return;
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, status: "dropout" } : x)));
    await fetch(`/api/students/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, status: "dropout" }),
    });
    toast("Marked as dropout");
    load();
  }

  function toggleSelect(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function runPromote(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/students/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: selected, ...promote }),
    });
    if (res.ok) {
      const d = await res.json();
      toast(`Promoted ${d.promoted} student(s)`);
      setPromoteOpen(false);
      setSelected([]);
      load();
    } else toast("Promotion failed", "error");
  }

  async function openSubjects(row: Student) {
    setSubjModal(row);
    const d = await fetch(`/api/students/${row.id}/subjects`).then((r) => r.json());
    setSubjIds(d.subjectIds || []);
  }
  async function saveSubjects() {
    if (!subjModal) return;
    const res = await fetch(`/api/students/${subjModal.id}/subjects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectIds: subjIds }),
    });
    if (res.ok) {
      toast("Subjects updated");
      setSubjModal(null);
    } else toast("Could not save", "error");
  }

  const statusTone = (s: string) =>
    s === "active" ? "green" : s === "dropout" ? "rose" : s === "graduated" ? "indigo" : "slate";

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Full enrollment records — session-wise, with bulk tools and promotion."
        action={
          <div className="flex flex-wrap gap-2">
            <BulkTools base="/api/students/bulk" label="students" onImported={load} />
            <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              + Enroll student
            </button>
          </div>
        }
      />

      {!loading && rows.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, admission no, class…"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active (studying)</option>
            <option value="promoted">Promoted</option>
            <option value="dropout">Dropout</option>
            <option value="graduated">Graduated</option>
            <option value="inactive">Inactive</option>
          </select>
          {selected.length > 0 && (
            <button onClick={() => setPromoteOpen(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              ⬆ Promote {selected.length} selected
            </button>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="🎓"
          title="No students yet"
          desc="Enroll your first student or bulk import from a CSV template."
          action={
            <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              + Enroll student
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3">Adm. No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Class / Sec</th>
                  <th className="px-4 py-3">Father</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} className="h-4 w-4 rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{String(row.admissionNo || "—")}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.firstName} {String(row.middleName || "")} {row.lastName}</p>
                      {row.mobileNumber ? <p className="text-xs text-slate-400">{String(row.mobileNumber)}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.className || "—"} {row.section ? `· ${row.section}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{String(row.fatherName || "—")}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openSubjects(row)} className="mr-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Subjects</button>
                      <button onClick={() => openEdit(row)} className="mr-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                      {row.status !== "dropout" && (
                        <button onClick={() => setDropout(row)} className="mr-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50">Dropout</button>
                      )}
                      <button onClick={() => remove(row)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No students match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrollment modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit student" : "Enroll student"}>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-100">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <form onSubmit={save} className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {tab === "Identity" && (
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Admission No" k="admissionNo" form={form} set={set} />
              <Inp label="PEN No" k="penNo" form={form} set={set} />
              <Inp label="APAAR No" k="apaarNo" form={form} set={set} />
              <Inp label="Roll Number" k="rollNumber" form={form} set={set} />
              <Inp label="First Name *" k="firstName" form={form} set={set} required />
              <Inp label="Middle Name" k="middleName" form={form} set={set} />
              <Inp label="Last Name *" k="lastName" form={form} set={set} required />
              <Field label="Gender"><select className={inputClass} value={String(form.gender)} onChange={(e) => set("gender", e.target.value)}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
              <Inp label="Date of Birth" k="dateOfBirth" form={form} set={set} type="date" />
              <Inp label="Category" k="category" form={form} set={set} />
              <Inp label="Religion" k="religion" form={form} set={set} />
              <Inp label="Caste" k="caste" form={form} set={set} />
              <Inp label="Blood Group" k="bloodGroup" form={form} set={set} />
              <Inp label="Mobile Number" k="mobileNumber" form={form} set={set} />
              <Inp label="Email" k="email" form={form} set={set} type="email" />
              <Inp label="Admission Date" k="admissionDate" form={form} set={set} type="date" />
            </div>
          )}
          {tab === "Parents" && (
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Father Name" k="fatherName" form={form} set={set} />
              <Inp label="Father Phone" k="fatherPhone" form={form} set={set} />
              <Inp label="Father Occupation" k="fatherOccupation" form={form} set={set} />
              <Inp label="Mother Name" k="motherName" form={form} set={set} />
              <Inp label="Mother Phone" k="motherPhone" form={form} set={set} />
              <Inp label="Mother Occupation" k="motherOccupation" form={form} set={set} />
              <Inp label="Guardian Name" k="guardianName" form={form} set={set} />
              <Inp label="Guardian Phone" k="guardianPhone" form={form} set={set} />
            </div>
          )}
          {tab === "Address" && (
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Current Address" k="currentAddress" form={form} set={set} full />
              <Inp label="Permanent Address" k="permanentAddress" form={form} set={set} full />
              <Inp label="House" k="house" form={form} set={set} />
              <Inp label="City" k="city" form={form} set={set} />
              <Inp label="State" k="state" form={form} set={set} />
            </div>
          )}
          {tab === "Bank & IDs" && (
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Bank Account Number" k="bankAccountNumber" form={form} set={set} />
              <Inp label="Bank Name" k="bankName" form={form} set={set} />
              <Inp label="IFSC Code" k="ifscCode" form={form} set={set} />
              <Inp label="Aadhaar No" k="aadhaarNo" form={form} set={set} />
              <Inp label="Samagra Id" k="samagraId" form={form} set={set} />
            </div>
          )}
          {tab === "Enrollment" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Session"><select className={inputClass} value={String(form.sessionId)} onChange={(e) => set("sessionId", e.target.value)}><option value="">—</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isActive ? " (active)" : ""}</option>)}</select></Field>
              <Field label="Class"><select className={inputClass} value={String(form.classId)} onChange={(e) => set("classId", e.target.value)}><option value="">Unassigned</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Inp label="Section" k="section" form={form} set={set} />
              <Field label="Status"><select className={inputClass} value={String(form.status)} onChange={(e) => set("status", e.target.value)}><option value="active">Active (studying)</option><option value="promoted">Promoted</option><option value="dropout">Dropout</option><option value="graduated">Graduated</option><option value="inactive">Inactive</option></select></Field>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.rte} onChange={(e) => set("rte", e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> RTE student</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.hosteller} onChange={(e) => set("hosteller", e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Hosteller</label>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save student"}</button>
          </div>
        </form>
      </Modal>

      {/* Promotion modal */}
      <Modal open={promoteOpen} onClose={() => setPromoteOpen(false)} title={`Promote ${selected.length} student(s)`}>
        <form onSubmit={runPromote} className="space-y-4">
          <p className="text-sm text-slate-500">Move selected students to the next class/session. Their existing records are preserved.</p>
          <Field label="To session"><select className={inputClass} value={promote.toSessionId} onChange={(e) => setPromote({ ...promote, toSessionId: e.target.value })}><option value="">Keep current</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="To class"><select className={inputClass} value={promote.toClassId} onChange={(e) => setPromote({ ...promote, toClassId: e.target.value })}><option value="">Keep current</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="To section"><input className={inputClass} value={promote.toSection} onChange={(e) => setPromote({ ...promote, toSection: e.target.value })} placeholder="Optional" /></Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPromoteOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Promote</button>
          </div>
        </form>
      </Modal>

      {/* Subjects modal */}
      <Modal open={!!subjModal} onClose={() => setSubjModal(null)} title={`Assign subjects — ${subjModal?.firstName ?? ""}`}>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects defined yet. Add subjects in the Subjects module first.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                  <input type="checkbox" checked={subjIds.includes(s.id)} onChange={(e) => setSubjIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))} className="h-4 w-4 rounded border-slate-300" />
                  {s.name}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSubjModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={saveSubjects} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save subjects</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Inp({
  label, k, form, set, type = "text", required, full,
}: {
  label: string; k: string; form: Record<string, string | boolean>; set: (k: string, v: string) => void; type?: string; required?: boolean; full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Field label={label}>
        <input className={inputClass} type={type} required={required} value={String(form[k] ?? "")} onChange={(e) => set(k, e.target.value)} />
      </Field>
    </div>
  );
}
