import { db } from "@/db";
import { feeHeads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select()
    .from(feeHeads)
    .where(eq(feeHeads.schoolId, user.schoolId))
    .orderBy(feeHeads.name);
  return Response.json({ feeHeads: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.name) return Response.json({ error: "Name required" }, { status: 400 });
  const [row] = await db
    .insert(feeHeads)
    .values({
      schoolId: user.schoolId,
      name: body.name,
      amount: Number(body.amount) || 0,
      frequency: body.frequency || "monthly",
    })
    .returning();
  return Response.json({ feeHead: row });
});
