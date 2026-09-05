import { db } from "@/db";
import { permissions, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const MODULES = [
  "students",
  "staff",
  "classes",
  "subjects",
  "assignments",
  "gradebook",
  "attendance",
  "fees",
  "transport",
  "sessions",
  "announcements",
  "reports",
];

// GET ?userId= -> permission matrix for that user (defaults filled in)
export const GET = withAuth(async (user, req) => {
  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId"));
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  // ensure the target user belongs to same tenant
  const target = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.schoolId, user.schoolId)))
    .limit(1);
  if (!target[0]) return Response.json({ error: "Not found" }, { status: 404 });

  const existing = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.userId, userId), eq(permissions.schoolId, user.schoolId)));
  const map = new Map(existing.map((p) => [p.module, p]));

  const matrix = MODULES.map((m) => {
    const p = map.get(m);
    return {
      module: m,
      canView: p?.canView ?? true,
      canEntry: p?.canEntry ?? false,
      canEdit: p?.canEdit ?? false,
      canDelete: p?.canDelete ?? false,
    };
  });
  return Response.json({ matrix });
});

// POST { userId, matrix:[{module,canView,canEntry,canEdit,canDelete}] }
export const POST = withAuth(async (user, req) => {
  if (user.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
  const body = await req.json();
  const userId = Number(body.userId);
  const matrix = body.matrix as {
    module: string;
    canView: boolean;
    canEntry: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }[];
  if (!userId || !Array.isArray(matrix))
    return Response.json({ error: "Invalid payload" }, { status: 400 });

  for (const row of matrix) {
    if (!MODULES.includes(row.module)) continue;
    const existing = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(and(eq(permissions.userId, userId), eq(permissions.module, row.module)))
      .limit(1);
    if (existing[0]) {
      await db
        .update(permissions)
        .set({
          canView: !!row.canView,
          canEntry: !!row.canEntry,
          canEdit: !!row.canEdit,
          canDelete: !!row.canDelete,
        })
        .where(eq(permissions.id, existing[0].id));
    } else {
      await db.insert(permissions).values({
        schoolId: user.schoolId,
        userId,
        module: row.module,
        canView: !!row.canView,
        canEntry: !!row.canEntry,
        canEdit: !!row.canEdit,
        canDelete: !!row.canDelete,
      });
    }
  }
  return Response.json({ ok: true });
});
