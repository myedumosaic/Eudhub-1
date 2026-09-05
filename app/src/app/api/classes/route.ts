import { db } from "@/db";
import { classes, students, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      gradeLevel: classes.gradeLevel,
      room: classes.room,
      subject: classes.subject,
      teacherId: classes.teacherId,
      teacherName: users.name,
      studentCount: sql<number>`count(distinct ${students.id})`.mapWith(Number),
    })
    .from(classes)
    .leftJoin(users, eq(classes.teacherId, users.id))
    .leftJoin(students, eq(students.classId, classes.id))
    .where(eq(classes.schoolId, user.schoolId))
    .groupBy(classes.id, users.name)
    .orderBy(classes.name);
  return Response.json({ classes: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.name) return Response.json({ error: "Name is required" }, { status: 400 });
  const [row] = await db
    .insert(classes)
    .values({
      schoolId: user.schoolId,
      name: body.name,
      gradeLevel: body.gradeLevel || null,
      room: body.room || null,
      subject: body.subject || null,
      teacherId: body.teacherId ? Number(body.teacherId) : user.id,
    })
    .returning();
  return Response.json({ class: row });
});
