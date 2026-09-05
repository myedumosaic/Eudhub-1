import { db } from "@/db";
import { assignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const [row] = await db
    .update(assignments)
    .set({
      classId: Number(body.classId),
      title: body.title,
      description: body.description || null,
      dueDate: body.dueDate || null,
      maxPoints: body.maxPoints ? Number(body.maxPoints) : 100,
      status: body.status || "open",
    })
    .where(and(eq(assignments.id, Number(id)), eq(assignments.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ assignment: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db
    .delete(assignments)
    .where(and(eq(assignments.id, Number(id)), eq(assignments.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
