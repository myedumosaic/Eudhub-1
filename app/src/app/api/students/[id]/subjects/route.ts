import { db } from "@/db";
import { studentSubjects, subjects, students } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET -> assigned subject ids for the student
export const GET = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  const rows = await db
    .select({ subjectId: studentSubjects.subjectId })
    .from(studentSubjects)
    .where(and(eq(studentSubjects.studentId, Number(id)), eq(studentSubjects.schoolId, user.schoolId)));
  return Response.json({ subjectIds: rows.map((r) => r.subjectId) });
});

// PUT { subjectIds:[] } -> replace assignments
export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const studentId = Number(id);
  const body = await req.json();
  const ids: number[] = (body.subjectIds || []).map(Number).filter(Boolean);

  // verify ownership
  const owner = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)))
    .limit(1);
  if (!owner[0]) return Response.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(studentSubjects)
    .where(and(eq(studentSubjects.studentId, studentId), eq(studentSubjects.schoolId, user.schoolId)));

  if (ids.length > 0) {
    await db.insert(studentSubjects).values(
      ids.map((subjectId) => ({ schoolId: user.schoolId, studentId, subjectId })),
    );
  }
  return Response.json({ ok: true, count: ids.length });
});
