import { db } from "@/db";
import { announcements } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const [row] = await db
    .update(announcements)
    .set({
      title: body.title,
      body: body.body,
      pinned: !!body.pinned,
    })
    .where(and(eq(announcements.id, Number(id)), eq(announcements.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ announcement: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db
    .delete(announcements)
    .where(and(eq(announcements.id, Number(id)), eq(announcements.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
