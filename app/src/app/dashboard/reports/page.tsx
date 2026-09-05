"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/page-header";
import { EmptyState, TableSkeleton, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type CatalogItem = { id: string; name: string; icon: string; group: string; desc: string };
type ReportColumn = { key: string; label: string };
type Report = {
  id: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: { label: string; value: string }[];
};

export default function ReportsPage() {
  const toast = useToast();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setCatalog(d.catalog || []));
  }, []);

  async function run(id: string) {
    setSelected(id);
    setLoading(true);
    setReport(null);
    const d = await fetch(`/api/reports?id=${id}`).then((r) => r.json());
    setReport(d.report || null);
    setLoading(false);
  }

  function downloadCsv() {
    if (!selected) return;
    window.open(`/api/reports?id=${selected}&format=csv`, "_blank");
    toast("CSV export started");
  }

  function printReport() {
    window.print();
  }

  const groups = Array.from(new Set(catalog.map((c) => c.group)));

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate, preview, print, and export reports across every module."
        action={
          report && (
            <div className="flex gap-2 print:hidden">
              <button onClick={printReport} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                🖨 Print / PDF
              </button>
              <button onClick={downloadCsv} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                ⬇ Export CSV
              </button>
            </div>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Catalog */}
        <div className="space-y-5 print:hidden">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g}</p>
              <div className="space-y-2">
                {catalog
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => run(c.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                        selected === c.id
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <span className="text-xl">{c.icon}</span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{c.name}</span>
                        <span className="block text-xs text-slate-500">{c.desc}</span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div>
          {!selected ? (
            <EmptyState
              icon="📄"
              title="Choose a report"
              desc="Pick any report from the catalog to preview it here. You can then print it or export to CSV."
            />
          ) : loading ? (
            <TableSkeleton cols={5} rows={8} />
          ) : report ? (
            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-slate-900">{report.title}</h2>
                <p className="text-sm text-slate-500">{report.description}</p>
                {report.summary && report.summary.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.summary.map((s) => (
                      <Badge key={s.label} tone="indigo">
                        {s.label}: {s.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {report.rows.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400">
                  No data available for this report yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {report.columns.map((c) => (
                          <th key={c.key} className="px-5 py-3 whitespace-nowrap">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          {report.columns.map((c) => (
                            <td key={c.key} className="px-5 py-2.5 text-slate-700">
                              {row[c.key] == null || row[c.key] === "" ? "—" : String(row[c.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                {report.rows.length} row(s) · Generated {new Date().toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
