import { db } from "@/db";
import { subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.schoolId, user.schoolId))
    .orderBy(subjects.name);
  return Response.json({ subjects: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.name) return Response.json({ error: "Name required" }, { status: 400 });
  const [row] = await db
    .insert(subjects)
    .values({
      schoolId: user.schoolId,
      name: body.name,
      code: body.code || null,
      isElective: !!body.isElective,
    })
    .returning();
  return Response.json({ subject: row });
});
