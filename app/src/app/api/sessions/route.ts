import { db } from "@/db";
import { academicSessions } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select()
    .from(academicSessions)
    .where(eq(academicSessions.schoolId, user.schoolId))
    .orderBy(desc(academicSessions.isActive), desc(academicSessions.name));
  return Response.json({ sessions: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.name) return Response.json({ error: "Name required" }, { status: 400 });
  if (body.isActive) {
    await db
      .update(academicSessions)
      .set({ isActive: false })
      .where(eq(academicSessions.schoolId, user.schoolId));
  }
  const [row] = await db
    .insert(academicSessions)
    .values({
      schoolId: user.schoolId,
      name: body.name,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      isActive: !!body.isActive,
    })
    .returning();
  return Response.json({ session: row });
});
