import { db } from "@/db";
import { announcements, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      authorId: announcements.authorId,
      authorName: users.name,
    })
    .from(announcements)
    .leftJoin(users, eq(announcements.authorId, users.id))
    .where(eq(announcements.schoolId, user.schoolId))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt));
  return Response.json({ announcements: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.title || !body.body)
    return Response.json({ error: "Title and body are required" }, { status: 400 });
  const [row] = await db
    .insert(announcements)
    .values({
      schoolId: user.schoolId,
      authorId: user.id,
      title: body.title,
      body: body.body,
      pinned: !!body.pinned,
    })
    .returning();
  return Response.json({ announcement: row });
});
