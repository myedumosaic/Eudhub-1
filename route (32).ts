import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      title: users.title,
      role: users.role,
    })
    .from(users)
    .where(eq(users.schoolId, user.schoolId))
    .orderBy(users.name);
  return Response.json({ teachers: rows });
});
