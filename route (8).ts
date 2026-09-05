import { db } from "@/db";
import { classes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const [row] = await db
    .update(classes)
    .set({
      name: body.name,
      gradeLevel: body.gradeLevel || null,
      room: body.room || null,
      subject: body.subject || null,
      teacherId: body.teacherId ? Number(body.teacherId) : null,
    })
    .where(and(eq(classes.id, Number(id)), eq(classes.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ class: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db
    .delete(classes)
    .where(and(eq(classes.id, Number(id)), eq(classes.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
