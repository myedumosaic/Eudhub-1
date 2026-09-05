import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { buildCsv, csvResponse, parseCsv } from "@/lib/csv";
import { STUDENT_TEXT_FIELDS, STUDENT_DATE_FIELDS, STUDENT_BOOL_FIELDS, buildStudentValues } from "@/lib/student-fields";

export const dynamic = "force-dynamic";

const HEADERS = [
  ...STUDENT_TEXT_FIELDS,
  ...STUDENT_DATE_FIELDS,
  ...STUDENT_BOOL_FIELDS,
  "className",
  "status",
];

// GET ?mode=template | export
export const GET = withAuth(async (user, req) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "template";

  if (mode === "template") {
    const sample: Record<string, unknown> = {};
    HEADERS.forEach((h) => (sample[h] = ""));
    sample.firstName = "John";
    sample.lastName = "Doe";
    sample.admissionNo = "ADM-1001";
    sample.className = "Algebra I · Period 2";
    sample.status = "active";
    return csvResponse("students-template.csv", buildCsv(HEADERS, [sample]));
  }

  // export
  const rows = await db
    .select()
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(eq(students.schoolId, user.schoolId));

  const mapped = rows.map((r) => {
    const s = r.students;
    const out: Record<string, unknown> = {};
    HEADERS.forEach((h) => {
      if (h === "className") out[h] = r.classes?.name ?? "";
      else out[h] = (s as Record<string, unknown>)[h] ?? "";
    });
    return out;
  });
  return csvResponse("students-export.csv", buildCsv(HEADERS, mapped));
});

// POST { csv } -> import
export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  const csv = body.csv as string;
  if (!csv) return Response.json({ error: "No CSV provided" }, { status: 400 });

  const records = parseCsv(csv);
  if (records.length === 0) return Response.json({ error: "No rows found" }, { status: 400 });

  // class name -> id map
  const classRows = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(eq(classes.schoolId, user.schoolId));
  const classMap = new Map(classRows.map((c) => [c.name.toLowerCase(), c.id]));

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (!rec.firstName || !rec.lastName) {
      errors.push(`Row ${i + 2}: missing firstName/lastName`);
      continue;
    }
    const values = buildStudentValues(rec);
    const classId = rec.className ? classMap.get(rec.className.toLowerCase()) ?? null : null;
    try {
      await db.insert(students).values({
        schoolId: user.schoolId,
        firstName: rec.firstName,
        lastName: rec.lastName,
        classId,
        ...values,
      });
      inserted++;
    } catch {
      errors.push(`Row ${i + 2}: failed to insert`);
    }
  }

  return Response.json({ ok: true, inserted, errorCount: errors.length, errors: errors.slice(0, 20) });
});
