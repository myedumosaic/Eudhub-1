import { db } from "@/db";
import { students } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { buildStudentValues } from "@/lib/student-fields";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const values = buildStudentValues(body);
  const [row] = await db
    .update(students)
    .set(values)
    .where(and(eq(students.id, Number(id)), eq(students.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ student: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db
    .delete(students)
    .where(and(eq(students.id, Number(id)), eq(students.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
