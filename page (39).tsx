"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { useToast } from "@/components/toast";

type Assignment = { id: number; title: string; maxPoints: number; className?: string | null };
type AssignmentOpt = { id: number; title: string; className: string | null };
type RosterRow = {
  studentId: number;
  firstName: string;
  lastName: string;
  gradeId: number | null;
  points: number | null;
  feedback: string | null;
};

function GradebookInner() {
  const toast = useToast();
  const params = useSearchParams();
  const initial = params.get("assignmentId") || "";
  const [assignments, setAssignments] = useState<AssignmentOpt[]>([]);
  const [selected, setSelected] = useState(initial);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/assignments")
      .then((r) => r.json())
      .then((d) => {
        setAssignments(d.assignments || []);
        if (!initial && d.assignments?.[0]) setSelected(String(d.assignments[0].id));
      });
  }, [initial]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/gradebook?assignmentId=${selected}`)
      .then((r) => r.json())
      .then((d) => {
        setAssignment(d.assignment || null);
        setRoster(d.roster || []);
      })
      .finally(() => setLoading(false));
  }, [selected]);

  function updateLocal(studentId: number, patch: Partial<RosterRow>) {
    setRoster((r) => r.map((x) => (x.studentId === studentId ? { ...x, ...patch } : x)));
  }

  async function saveGrade(row: RosterRow) {
    setSavingId(row.studentId);
    const res = await fetch("/api/gradebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: Number(selected),
        studentId: row.studentId,
        points: row.points,
        feedback: row.feedback,
      }),
    });
    setSavingId(null);
    if (res.ok) toast("Grade saved");
    else toast("Save failed", "error");
  }

  const graded = roster.filter((r) => r.points != null).length;
  const avg =
    graded > 0
      ? Math.round(
          (roster.reduce((s, r) => s + (r.points ?? 0), 0) / graded) * 10,
        ) / 10
      : null;

  return (
    <div>
      <PageHeader
        title="Gradebook"
        subtitle="Enter grades for an assignment. Changes save per row."
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No assignments to grade"
          desc="Create an assignment first, then grade your class here."
          action={
            <Link href="/dashboard/assignments" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Go to assignments
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="text-sm font-medium text-slate-600">Assignment</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="min-w-[240px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} {a.className ? `· ${a.className}` : ""}
                </option>
              ))}
            </select>
            {assignment && (
              <div className="ml-auto flex gap-6 text-sm">
                <span className="text-slate-500">
                  Max: <b className="text-slate-800">{assignment.maxPoints}</b>
                </span>
                <span className="text-slate-500">
                  Graded: <b className="text-slate-800">{graded}/{roster.length}</b>
                </span>
                <span className="text-slate-500">
                  Average: <b className="text-slate-800">{avg == null ? "—" : avg}</b>
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <TableSkeleton cols={3} />
          ) : roster.length === 0 ? (
            <EmptyState
              icon="🎓"
              title="No students in this class"
              desc="Add students to the class to start grading."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3 w-40">Points</th>
                    <th className="px-5 py-3">Feedback</th>
                    <th className="px-5 py-3 w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={row.points ?? ""}
                            min={0}
                            max={assignment?.maxPoints}
                            onChange={(e) =>
                              updateLocal(row.studentId, {
                                points: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                          <span className="text-xs text-slate-400">/ {assignment?.maxPoints}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          value={row.feedback ?? ""}
                          onChange={(e) => updateLocal(row.studentId, { feedback: e.target.value })}
                          placeholder="Optional feedback"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => saveGrade(row)}
                          disabled={savingId === row.studentId}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {savingId === row.studentId ? "…" : "Save"}
                        </button>
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

export default function GradebookPage() {
  return (
    <Suspense fallback={<TableSkeleton cols={3} />}>
      <GradebookInner />
    </Suspense>
  );
}
