import { db } from "@/db";
import { subjects } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const [row] = await db
    .update(subjects)
    .set({ name: body.name, code: body.code || null, isElective: !!body.isElective })
    .where(and(eq(subjects.id, Number(id)), eq(subjects.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ subject: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db.delete(subjects).where(and(eq(subjects.id, Number(id)), eq(subjects.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
