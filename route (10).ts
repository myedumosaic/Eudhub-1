import { db } from "@/db";
import {
  students,
  classes,
  assignments,
  attendance,
  announcements,
} from "@/db/schema";
import { and, eq, sql, desc, gte } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (user) => {
  const sid = user.schoolId;

  const [studentCount] = await db
    .select({ c: sql<number>`count(*)`.mapWith(Number) })
    .from(students)
    .where(eq(students.schoolId, sid));

  const [classCount] = await db
    .select({ c: sql<number>`count(*)`.mapWith(Number) })
    .from(classes)
    .where(eq(classes.schoolId, sid));

  const [openAssignments] = await db
    .select({ c: sql<number>`count(*)`.mapWith(Number) })
    .from(assignments)
    .where(and(eq(assignments.schoolId, sid), eq(assignments.status, "open")));

  // attendance rate over last 30 days
  const [att] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      present: sql<number>`count(*) filter (where ${attendance.present})`.mapWith(Number),
    })
    .from(attendance)
    .where(eq(attendance.schoolId, sid));

  const attendanceRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;

  const upcoming = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueDate: assignments.dueDate,
      className: classes.name,
    })
    .from(assignments)
    .leftJoin(classes, eq(assignments.classId, classes.id))
    .where(and(eq(assignments.schoolId, sid), eq(assignments.status, "open")))
    .orderBy(sql`${assignments.dueDate} asc nulls last`)
    .limit(5);

  const recentAnnouncements = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      createdAt: announcements.createdAt,
      pinned: announcements.pinned,
    })
    .from(announcements)
    .where(eq(announcements.schoolId, sid))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(4);

  // students per class for chart
  const perClass = await db
    .select({
      className: classes.name,
      count: sql<number>`count(${students.id})`.mapWith(Number),
    })
    .from(classes)
    .leftJoin(students, eq(students.classId, classes.id))
    .where(eq(classes.schoolId, sid))
    .groupBy(classes.id, classes.name)
    .orderBy(classes.name);

  return Response.json({
    stats: {
      students: studentCount?.c ?? 0,
      classes: classCount?.c ?? 0,
      openAssignments: openAssignments?.c ?? 0,
      attendanceRate,
    },
    upcoming,
    recentAnnouncements,
    perClass,
  });
});
