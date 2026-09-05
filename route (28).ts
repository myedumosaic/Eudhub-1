import { db } from "@/db";
import { students } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

// POST { studentIds:[], toClassId, toSessionId, toSection }
export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  const ids: number[] = (body.studentIds || []).map(Number).filter(Boolean);
  if (ids.length === 0) return Response.json({ error: "No students selected" }, { status: 400 });

  const patch: Record<string, unknown> = { status: "active" };
  if (body.toClassId) patch.classId = Number(body.toClassId);
  if (body.toSessionId) patch.sessionId = Number(body.toSessionId);
  if (body.toSection !== undefined) patch.section = body.toSection || null;

  const updated = await db
    .update(students)
    .set(patch)
    .where(and(eq(students.schoolId, user.schoolId), inArray(students.id, ids)))
    .returning({ id: students.id });

  return Response.json({ ok: true, promoted: updated.length });
});
