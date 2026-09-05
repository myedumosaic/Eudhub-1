import { db } from "@/db";
import { assignments, classes, grades } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      maxPoints: assignments.maxPoints,
      status: assignments.status,
      classId: assignments.classId,
      className: classes.name,
      gradedCount: sql<number>`count(${grades.id})`.mapWith(Number),
    })
    .from(assignments)
    .leftJoin(classes, eq(assignments.classId, classes.id))
    .leftJoin(grades, eq(grades.assignmentId, assignments.id))
    .where(eq(assignments.schoolId, user.schoolId))
    .groupBy(assignments.id, classes.name)
    .orderBy(sql`${assignments.dueDate} desc nulls last`);
  return Response.json({ assignments: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.title || !body.classId)
    return Response.json({ error: "Title and class are required" }, { status: 400 });
  const [row] = await db
    .insert(assignments)
    .values({
      schoolId: user.schoolId,
      classId: Number(body.classId),
      title: body.title,
      description: body.description || null,
      dueDate: body.dueDate || null,
      maxPoints: body.maxPoints ? Number(body.maxPoints) : 100,
      status: body.status || "open",
    })
    .returning();
  return Response.json({ assignment: row });
});
