"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui";
import { useToast } from "@/components/toast";

// Reusable bulk import/export + template download tool for any module.
export default function BulkTools({
  base,
  label,
  onImported,
}: {
  base: string; // e.g. "/api/students/bulk"
  label: string; // e.g. "students"
  onImported: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errorCount: number; errors: string[] } | null>(null);

  function download(mode: string, filename: string) {
    window.open(`${base}?mode=${mode}`, "_blank");
    toast(`${filename} download started`);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ""));
    reader.readAsText(file);
  }

  async function runImport() {
    if (!csv.trim()) {
      toast("Paste or upload CSV first", "error");
      return;
    }
    setBusy(true);
    setResult(null);
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setResult(data);
      toast(`Imported ${data.inserted} ${label}`);
      onImported();
    } else {
      toast(data.error || "Import failed", "error");
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => download("template", "Template")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬇ Template
        </button>
        <button
          onClick={() => download("export", "Export")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬇ Export all
        </button>
        <button
          onClick={() => {
            setResult(null);
            setCsv("");
            setOpen(true);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬆ Bulk import
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Bulk import ${label}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Download the template, fill it in, then upload the CSV or paste its contents below.
            Column headers must match the template.
          </p>
          <div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
          </div>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={6}
            placeholder="firstName,lastName,..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {result && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-emerald-700">✓ Imported {result.inserted} row(s)</p>
              {result.errorCount > 0 && (
                <div className="mt-1 text-rose-600">
                  <p>{result.errorCount} error(s):</p>
                  <ul className="ml-4 list-disc text-xs">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={runImport}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
