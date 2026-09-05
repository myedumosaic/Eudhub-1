import { withAuth } from "@/lib/api";
import { buildReport, toCsv, REPORT_CATALOG } from "@/lib/reports";

export const dynamic = "force-dynamic";

// GET ?id=<reportId>&format=json|csv  (no id -> catalog)
export const GET = withAuth(async (user, req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") || "json";

  if (!id) {
    return Response.json({ catalog: REPORT_CATALOG });
  }

  const report = await buildReport(user.schoolId, id);

  if (format === "csv") {
    const csv = toCsv(report);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return Response.json({ report });
});
