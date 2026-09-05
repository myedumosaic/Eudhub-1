"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { useToast } from "@/components/toast";

type ClassOpt = { id: number; name: string };
type RosterRow = {
  studentId: number;
  firstName: string;
  lastName: string;
  recordId: number | null;
  present: boolean | null;
  note: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.classes || []).map((c: ClassOpt) => ({ id: c.id, name: c.name }));
        setClasses(list);
        if (list[0]) setClassId(String(list[0].id));
      });
  }, []);

  useEffect(() => {
    if (!classId || !date) return;
    setLoading(true);
    fetch(`/api/attendance?classId=${classId}&date=${date}`)
      .then((r) => r.json())
      .then((d) =>
        setRoster(
          (d.roster || []).map((r: RosterRow) => ({
            ...r,
            present: r.present == null ? true : r.present,
          })),
        ),
      )
      .finally(() => setLoading(false));
  }, [classId, date]);

  async function mark(row: RosterRow, present: boolean) {
    const prev = roster;
    setRoster((r) => r.map((x) => (x.studentId === row.studentId ? { ...x, present } : x))); // optimistic
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: Number(classId), studentId: row.studentId, date, present, note: row.note }),
    });
    if (!res.ok) {
      setRoster(prev);
      toast("Could not save", "error");
    }
  }

  async function markAll(present: boolean) {
    setSavingAll(true);
    setRoster((r) => r.map((x) => ({ ...x, present })));
    await Promise.all(
      roster.map((row) =>
        fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: Number(classId), studentId: row.studentId, date, present, note: row.note }),
        }),
      ),
    );
    setSavingAll(false);
    toast(present ? "Everyone marked present" : "Everyone marked absent");
  }

  const presentCount = roster.filter((r) => r.present).length;

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Take daily attendance for a class." />

      {classes.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Create a class first"
          desc="Attendance is taken per class. Add a class to begin."
          action={
            <Link href="/dashboard/classes" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Go to classes
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            {roster.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Present: <b className="text-slate-800">{presentCount}/{roster.length}</b>
                </span>
                <button onClick={() => markAll(true)} disabled={savingAll} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  All present
                </button>
                <button onClick={() => markAll(false)} disabled={savingAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  All absent
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <TableSkeleton cols={2} />
          ) : roster.length === 0 ? (
            <EmptyState icon="🎓" title="No students in this class" desc="Add students to this class to take attendance." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3 text-center w-64">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => mark(row, true)}
                            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                              row.present ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => mark(row, false)}
                            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                              row.present === false ? "bg-rose-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Absent
                          </button>
                        </div>
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
