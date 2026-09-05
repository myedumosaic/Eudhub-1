import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

async function ensureSettings(schoolId: number) {
  const existing = await db.select().from(settings).where(eq(settings.schoolId, schoolId)).limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db.insert(settings).values({ schoolId }).returning();
  return row;
}

export const GET = withAuth(async (user) => {
  const row = await ensureSettings(user.schoolId);
  return Response.json({ settings: row });
});

export const PUT = withAuth(async (user, req) => {
  await ensureSettings(user.schoolId);
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  const fields = [
    "academicYear",
    "gradeScale",
    "passingGrade",
    "attendanceThreshold",
    "currency",
    "timezone",
    "primaryColor",
    "weekStart",
    "logoEmoji",
    "featureFlags",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f];
  }
  if (allowed.passingGrade !== undefined) allowed.passingGrade = Number(allowed.passingGrade);
  if (allowed.attendanceThreshold !== undefined)
    allowed.attendanceThreshold = Number(allowed.attendanceThreshold);
  allowed.updatedAt = new Date();

  const [row] = await db
    .update(settings)
    .set(allowed)
    .where(eq(settings.schoolId, user.schoolId))
    .returning();
  return Response.json({ settings: row });
});
