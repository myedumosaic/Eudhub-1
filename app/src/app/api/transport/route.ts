import { db } from "@/db";
import { transportRoutes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select()
    .from(transportRoutes)
    .where(eq(transportRoutes.schoolId, user.schoolId))
    .orderBy(transportRoutes.name);
  return Response.json({ routes: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.name) return Response.json({ error: "Name required" }, { status: 400 });
  const [row] = await db
    .insert(transportRoutes)
    .values({
      schoolId: user.schoolId,
      name: body.name,
      stopName: body.stopName || null,
      driverName: body.driverName || null,
      vehicleNumber: body.vehicleNumber || null,
      monthlyFee: Number(body.monthlyFee) || 0,
      monthsRequired: Number(body.monthsRequired) || 12,
    })
    .returning();
  return Response.json({ route: row });
});
