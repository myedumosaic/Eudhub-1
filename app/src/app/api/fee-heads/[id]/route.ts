import { db } from "@/db";
import { feeHeads } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const [row] = await db
    .update(feeHeads)
    .set({ name: body.name, amount: Number(body.amount) || 0, frequency: body.frequency || "monthly" })
    .where(and(eq(feeHeads.id, Number(id)), eq(feeHeads.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ feeHead: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db.delete(feeHeads).where(and(eq(feeHeads.id, Number(id)), eq(feeHeads.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
