import { db } from "@/db";
import { transportRoutes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const [row] = await db
    .update(transportRoutes)
    .set({
      name: body.name,
      stopName: body.stopName || null,
      driverName: body.driverName || null,
      vehicleNumber: body.vehicleNumber || null,
      monthlyFee: Number(body.monthlyFee) || 0,
      monthsRequired: Number(body.monthsRequired) || 12,
    })
    .where(and(eq(transportRoutes.id, Number(id)), eq(transportRoutes.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ route: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db
    .delete(transportRoutes)
    .where(and(eq(transportRoutes.id, Number(id)), eq(transportRoutes.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
