import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { buildStaffValues } from "@/lib/staff-fields";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.schoolId, user.schoolId))
    .orderBy(staff.lastName, staff.firstName);
  return Response.json({ staff: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.firstName || !body.lastName)
    return Response.json({ error: "First and last name required" }, { status: 400 });
  const values = buildStaffValues(body);
  const [row] = await db
    .insert(staff)
    .values({ schoolId: user.schoolId, firstName: body.firstName, lastName: body.lastName, ...values })
    .returning();
  return Response.json({ staff: row });
});
