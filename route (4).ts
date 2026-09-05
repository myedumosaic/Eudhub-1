import { db } from "@/db";
import { attendance, students, classes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET ?classId=&date= -> roster with attendance status
export const GET = withAuth(async (user, req) => {
  const { searchParams } = new URL(req.url);
  const classId = Number(searchParams.get("classId"));
  const date = searchParams.get("date");
  if (!classId || !date) return Response.json({ error: "classId and date required" }, { status: 400 });

  const roster = await db
    .select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      recordId: attendance.id,
      present: attendance.present,
      note: attendance.note,
    })
    .from(students)
    .leftJoin(
      attendance,
      and(
        eq(attendance.studentId, students.id),
        eq(attendance.classId, classId),
        eq(attendance.date, date),
      ),
    )
    .where(and(eq(students.classId, classId), eq(students.schoolId, user.schoolId)))
    .orderBy(students.lastName, students.firstName);

  return Response.json({ roster });
});

// POST { classId, studentId, date, present, note } -> upsert
export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  const classId = Number(body.classId);
  const studentId = Number(body.studentId);
  const date = body.date;
  if (!classId || !studentId || !date)
    return Response.json({ error: "Missing fields" }, { status: 400 });

  const existing = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.classId, classId),
        eq(attendance.studentId, studentId),
        eq(attendance.date, date),
        eq(attendance.schoolId, user.schoolId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const [row] = await db
      .update(attendance)
      .set({ present: !!body.present, note: body.note || null })
      .where(eq(attendance.id, existing[0].id))
      .returning();
    return Response.json({ record: row });
  }

  const [row] = await db
    .insert(attendance)
    .values({
      schoolId: user.schoolId,
      classId,
      studentId,
      date,
      present: !!body.present,
      note: body.note || null,
    })
    .returning();
  return Response.json({ record: row });
});
