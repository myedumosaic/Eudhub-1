import { db } from "@/db";
import { academicSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  if (body.isActive) {
    await db
      .update(academicSessions)
      .set({ isActive: false })
      .where(eq(academicSessions.schoolId, user.schoolId));
  }
  const [row] = await db
    .update(academicSessions)
    .set({
      name: body.name,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      isActive: !!body.isActive,
    })
    .where(and(eq(academicSessions.id, Number(id)), eq(academicSessions.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ session: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db
    .delete(academicSessions)
    .where(and(eq(academicSessions.id, Number(id)), eq(academicSessions.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
