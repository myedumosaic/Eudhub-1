import { db } from "@/db";
import { assignments, students, grades, classes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET ?assignmentId=  -> roster with existing grades
export const GET = withAuth(async (user, req) => {
  const { searchParams } = new URL(req.url);
  const assignmentId = Number(searchParams.get("assignmentId"));
  if (!assignmentId) return Response.json({ error: "assignmentId required" }, { status: 400 });

  const [assignment] = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.schoolId, user.schoolId)))
    .limit(1);
  if (!assignment) return Response.json({ error: "Not found" }, { status: 404 });

  const roster = await db
    .select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      gradeId: grades.id,
      points: grades.points,
      feedback: grades.feedback,
    })
    .from(students)
    .leftJoin(
      grades,
      and(eq(grades.studentId, students.id), eq(grades.assignmentId, assignmentId)),
    )
    .where(eq(students.classId, assignment.classId))
    .orderBy(students.lastName, students.firstName);

  return Response.json({ assignment, roster });
});

// POST { assignmentId, studentId, points, feedback } -> upsert grade
export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  const assignmentId = Number(body.assignmentId);
  const studentId = Number(body.studentId);
  if (!assignmentId || !studentId)
    return Response.json({ error: "Missing ids" }, { status: 400 });

  const points =
    body.points === "" || body.points == null ? null : Number(body.points);

  const existing = await db
    .select()
    .from(grades)
    .where(
      and(
        eq(grades.assignmentId, assignmentId),
        eq(grades.studentId, studentId),
        eq(grades.schoolId, user.schoolId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const [row] = await db
      .update(grades)
      .set({ points, feedback: body.feedback || null })
      .where(eq(grades.id, existing[0].id))
      .returning();
    return Response.json({ grade: row });
  }

  const [row] = await db
    .insert(grades)
    .values({
      schoolId: user.schoolId,
      assignmentId,
      studentId,
      points,
      feedback: body.feedback || null,
    })
    .returning();
  return Response.json({ grade: row });
});
