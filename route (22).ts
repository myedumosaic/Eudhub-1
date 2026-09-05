import { db } from "@/db";
import { staff } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { buildStaffValues } from "@/lib/staff-fields";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const values = buildStaffValues(body);
  const [row] = await db
    .update(staff)
    .set(values)
    .where(and(eq(staff.id, Number(id)), eq(staff.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ staff: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db.delete(staff).where(and(eq(staff.id, Number(id)), eq(staff.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
