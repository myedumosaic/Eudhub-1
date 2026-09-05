import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { buildCsv, csvResponse, parseCsv } from "@/lib/csv";
import { STAFF_TEXT_FIELDS, STAFF_DATE_FIELDS, buildStaffValues } from "@/lib/staff-fields";

export const dynamic = "force-dynamic";

const HEADERS = [...STAFF_TEXT_FIELDS, ...STAFF_DATE_FIELDS, "status"];

export const GET = withAuth(async (user, req) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "template";

  if (mode === "template") {
    const sample: Record<string, unknown> = {};
    HEADERS.forEach((h) => (sample[h] = ""));
    sample.firstName = "Jane";
    sample.lastName = "Smith";
    sample.designation = "Teacher";
    sample.department = "Science";
    sample.status = "active";
    return csvResponse("staff-template.csv", buildCsv(HEADERS, [sample]));
  }

  const rows = await db.select().from(staff).where(eq(staff.schoolId, user.schoolId));
  const mapped = rows.map((s) => {
    const out: Record<string, unknown> = {};
    HEADERS.forEach((h) => (out[h] = (s as Record<string, unknown>)[h] ?? ""));
    return out;
  });
  return csvResponse("staff-export.csv", buildCsv(HEADERS, mapped));
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  const csv = body.csv as string;
  if (!csv) return Response.json({ error: "No CSV provided" }, { status: 400 });
  const records = parseCsv(csv);
  let inserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (!rec.firstName || !rec.lastName) {
      errors.push(`Row ${i + 2}: missing name`);
      continue;
    }
    try {
      await db.insert(staff).values({
        schoolId: user.schoolId,
        firstName: rec.firstName,
        lastName: rec.lastName,
        ...buildStaffValues(rec),
      });
      inserted++;
    } catch {
      errors.push(`Row ${i + 2}: failed`);
    }
  }
  return Response.json({ ok: true, inserted, errorCount: errors.length, errors: errors.slice(0, 20) });
});
