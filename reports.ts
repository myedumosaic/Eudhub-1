import { db } from "@/db";
import {
  students,
  classes,
  assignments,
  grades,
  attendance,
  settings as settingsTable,
  feeInvoices,
  staff,
  transportRoutes,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export type ReportColumn = { key: string; label: string };
export type ReportResult = {
  id: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: { label: string; value: string }[];
};

export const REPORT_CATALOG = [
  { id: "student-roster", name: "Student Roster", icon: "🎓", group: "Students", desc: "All students with class, guardian, and status." },
  { id: "class-summary", name: "Class Summary", icon: "📚", group: "Classes", desc: "Each class with enrollment, teacher, and averages." },
  { id: "gradebook-report", name: "Gradebook Report", icon: "📊", group: "Academics", desc: "Per-student grade averages across assignments." },
  { id: "assignment-status", name: "Assignment Status", icon: "📝", group: "Academics", desc: "Every assignment with grading progress." },
  { id: "attendance-summary", name: "Attendance Summary", icon: "✅", group: "Attendance", desc: "Attendance rate per student." },
  { id: "attendance-by-class", name: "Attendance by Class", icon: "🏫", group: "Attendance", desc: "Attendance rate aggregated per class." },
  { id: "at-risk-students", name: "At-Risk Students", icon: "⚠️", group: "Insights", desc: "Students below passing grade or attendance thresholds." },
  { id: "honor-roll", name: "Honor Roll", icon: "🏆", group: "Insights", desc: "Top performing students by grade average." },
  { id: "guardian-contacts", name: "Guardian Contact Sheet", icon: "📇", group: "Students", desc: "Guardian names and phone numbers for outreach." },
  { id: "enrollment-trend", name: "Enrollment by Status", icon: "📈", group: "Insights", desc: "Student counts grouped by status." },
  { id: "fee-collection", name: "Fee Collection", icon: "💳", group: "Finance", desc: "Per-invoice paid vs. net due with status." },
  { id: "fee-defaulters", name: "Fee Defaulters", icon: "⚠️", group: "Finance", desc: "Students with outstanding balances." },
  { id: "staff-directory", name: "Staff Directory", icon: "🧑‍🏫", group: "Staff", desc: "All staff with designation and contact." },
  { id: "dropout-report", name: "Dropout Report", icon: "🚪", group: "Students", desc: "Students marked as dropout." },
  { id: "transport-routes", name: "Transport Routes", icon: "🚌", group: "Finance", desc: "Routes with computed total transport fee." },
] as const;

export type ReportId = (typeof REPORT_CATALOG)[number]["id"];

async function getThresholds(schoolId: number) {
  const s = await db.select().from(settingsTable).where(eq(settingsTable.schoolId, schoolId)).limit(1);
  return {
    passingGrade: s[0]?.passingGrade ?? 60,
    attendanceThreshold: s[0]?.attendanceThreshold ?? 75,
  };
}

export async function buildReport(schoolId: number, id: string): Promise<ReportResult> {
  switch (id) {
    case "student-roster": {
      const rows = await db
        .select({
          name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          className: classes.name,
          email: students.email,
          guardian: students.guardianName,
          phone: students.guardianPhone,
          status: students.status,
          enrolled: students.enrollmentDate,
        })
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .where(eq(students.schoolId, schoolId))
        .orderBy(students.lastName, students.firstName);
      return {
        id,
        title: "Student Roster",
        description: "Complete list of enrolled students.",
        columns: [
          { key: "name", label: "Student" },
          { key: "className", label: "Class" },
          { key: "email", label: "Email" },
          { key: "guardian", label: "Guardian" },
          { key: "phone", label: "Phone" },
          { key: "status", label: "Status" },
          { key: "enrolled", label: "Enrolled" },
        ],
        rows,
        summary: [{ label: "Total students", value: String(rows.length) }],
      };
    }

    case "class-summary": {
      const rows = await db
        .select({
          className: classes.name,
          subject: classes.subject,
          grade: classes.gradeLevel,
          room: classes.room,
          studentCount: sql<number>`count(distinct ${students.id})`.mapWith(Number),
        })
        .from(classes)
        .leftJoin(students, eq(students.classId, classes.id))
        .where(eq(classes.schoolId, schoolId))
        .groupBy(classes.id)
        .orderBy(classes.name);
      return {
        id,
        title: "Class Summary",
        description: "Enrollment and details for each class.",
        columns: [
          { key: "className", label: "Class" },
          { key: "subject", label: "Subject" },
          { key: "grade", label: "Grade" },
          { key: "room", label: "Room" },
          { key: "studentCount", label: "Students" },
        ],
        rows,
        summary: [
          { label: "Classes", value: String(rows.length) },
          { label: "Total enrolled", value: String(rows.reduce((s, r) => s + (r.studentCount || 0), 0)) },
        ],
      };
    }

    case "gradebook-report": {
      const rows = await db
        .select({
          name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          className: classes.name,
          graded: sql<number>`count(${grades.id})`.mapWith(Number),
          avgPercent: sql<number>`coalesce(round(avg(${grades.points}::decimal / nullif(${assignments.maxPoints},0) * 100), 1), 0)`.mapWith(Number),
        })
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .leftJoin(grades, eq(grades.studentId, students.id))
        .leftJoin(assignments, eq(grades.assignmentId, assignments.id))
        .where(eq(students.schoolId, schoolId))
        .groupBy(students.id, classes.name)
        .orderBy(sql`avgPercent desc nulls last`);
      return {
        id,
        title: "Gradebook Report",
        description: "Average grade percentage per student.",
        columns: [
          { key: "name", label: "Student" },
          { key: "className", label: "Class" },
          { key: "graded", label: "Graded items" },
          { key: "avgPercent", label: "Average %" },
        ],
        rows,
      };
    }

    case "assignment-status": {
      const rows = await db
        .select({
          title: assignments.title,
          className: classes.name,
          due: assignments.dueDate,
          maxPoints: assignments.maxPoints,
          status: assignments.status,
          graded: sql<number>`count(${grades.id})`.mapWith(Number),
        })
        .from(assignments)
        .leftJoin(classes, eq(assignments.classId, classes.id))
        .leftJoin(grades, eq(grades.assignmentId, assignments.id))
        .where(eq(assignments.schoolId, schoolId))
        .groupBy(assignments.id, classes.name)
        .orderBy(sql`${assignments.dueDate} desc nulls last`);
      return {
        id,
        title: "Assignment Status",
        description: "Grading progress for each assignment.",
        columns: [
          { key: "title", label: "Assignment" },
          { key: "className", label: "Class" },
          { key: "due", label: "Due" },
          { key: "maxPoints", label: "Max pts" },
          { key: "graded", label: "Graded" },
          { key: "status", label: "Status" },
        ],
        rows,
      };
    }

    case "attendance-summary": {
      const rows = await db
        .select({
          name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          className: classes.name,
          totalDays: sql<number>`count(${attendance.id})`.mapWith(Number),
          present: sql<number>`count(*) filter (where ${attendance.present})`.mapWith(Number),
          rate: sql<number>`coalesce(round(count(*) filter (where ${attendance.present})::decimal / nullif(count(${attendance.id}),0) * 100), 0)`.mapWith(Number),
        })
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .leftJoin(attendance, eq(attendance.studentId, students.id))
        .where(eq(students.schoolId, schoolId))
        .groupBy(students.id, classes.name)
        .orderBy(sql`rate asc`);
      return {
        id,
        title: "Attendance Summary",
        description: "Attendance rate per student.",
        columns: [
          { key: "name", label: "Student" },
          { key: "className", label: "Class" },
          { key: "totalDays", label: "Days recorded" },
          { key: "present", label: "Present" },
          { key: "rate", label: "Rate %" },
        ],
        rows,
      };
    }

    case "attendance-by-class": {
      const rows = await db
        .select({
          className: classes.name,
          records: sql<number>`count(${attendance.id})`.mapWith(Number),
          present: sql<number>`count(*) filter (where ${attendance.present})`.mapWith(Number),
          rate: sql<number>`coalesce(round(count(*) filter (where ${attendance.present})::decimal / nullif(count(${attendance.id}),0) * 100), 0)`.mapWith(Number),
        })
        .from(classes)
        .leftJoin(attendance, eq(attendance.classId, classes.id))
        .where(eq(classes.schoolId, schoolId))
        .groupBy(classes.id)
        .orderBy(classes.name);
      return {
        id,
        title: "Attendance by Class",
        description: "Aggregated attendance rate per class.",
        columns: [
          { key: "className", label: "Class" },
          { key: "records", label: "Records" },
          { key: "present", label: "Present" },
          { key: "rate", label: "Rate %" },
        ],
        rows,
      };
    }

    case "at-risk-students": {
      const { passingGrade, attendanceThreshold } = await getThresholds(schoolId);
      const gradeRows = await db
        .select({
          id: students.id,
          name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          className: classes.name,
          avgPercent: sql<number>`coalesce(round(avg(${grades.points}::decimal / nullif(${assignments.maxPoints},0) * 100), 1), 0)`.mapWith(Number),
        })
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .leftJoin(grades, eq(grades.studentId, students.id))
        .leftJoin(assignments, eq(grades.assignmentId, assignments.id))
        .where(eq(students.schoolId, schoolId))
        .groupBy(students.id, classes.name);
      const attRows = await db
        .select({
          id: students.id,
          attendanceRate: sql<number>`coalesce(round(count(*) filter (where ${attendance.present})::decimal / nullif(count(${attendance.id}),0) * 100), 100)`.mapWith(Number),
        })
        .from(students)
        .leftJoin(attendance, eq(attendance.studentId, students.id))
        .where(eq(students.schoolId, schoolId))
        .groupBy(students.id);
      const attMap = new Map(attRows.map((a) => [a.id, Number(a.attendanceRate)]));
      const all = gradeRows.map((r) => ({
        name: r.name,
        className: r.className,
        avgPercent: r.avgPercent,
        attendanceRate: attMap.get(r.id) ?? 100,
      }));
      const rows = all
        .filter((r) => Number(r.avgPercent) < passingGrade || Number(r.attendanceRate) < attendanceThreshold)
        .map((r) => ({
          ...r,
          concern:
            Number(r.avgPercent) < passingGrade && Number(r.attendanceRate) < attendanceThreshold
              ? "Grades + Attendance"
              : Number(r.avgPercent) < passingGrade
                ? "Grades"
                : "Attendance",
        }))
        .sort((a, b) => Number(a.avgPercent) - Number(b.avgPercent));
      return {
        id,
        title: "At-Risk Students",
        description: `Below ${passingGrade}% grade or ${attendanceThreshold}% attendance.`,
        columns: [
          { key: "name", label: "Student" },
          { key: "className", label: "Class" },
          { key: "avgPercent", label: "Avg %" },
          { key: "attendanceRate", label: "Attend %" },
          { key: "concern", label: "Concern" },
        ],
        rows,
        summary: [{ label: "At-risk students", value: String(rows.length) }],
      };
    }

    case "honor-roll": {
      const { passingGrade } = await getThresholds(schoolId);
      const all = await db
        .select({
          name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          className: classes.name,
          avgPercent: sql<number>`coalesce(round(avg(${grades.points}::decimal / nullif(${assignments.maxPoints},0) * 100), 1), 0)`.mapWith(Number),
          graded: sql<number>`count(${grades.id})`.mapWith(Number),
        })
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .leftJoin(grades, eq(grades.studentId, students.id))
        .leftJoin(assignments, eq(grades.assignmentId, assignments.id))
        .where(eq(students.schoolId, schoolId))
        .groupBy(students.id, classes.name);
      const rows = all
        .filter((r) => Number(r.graded) > 0 && Number(r.avgPercent) >= 90)
        .sort((a, b) => Number(b.avgPercent) - Number(a.avgPercent));
      return {
        id,
        title: "Honor Roll",
        description: "Students averaging 90% or higher.",
        columns: [
          { key: "name", label: "Student" },
          { key: "className", label: "Class" },
          { key: "avgPercent", label: "Average %" },
          { key: "graded", label: "Graded items" },
        ],
        rows,
        summary: [{ label: "Honor roll", value: String(rows.length) }],
      };
    }

    case "guardian-contacts": {
      const rows = await db
        .select({
          student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          guardian: students.guardianName,
          phone: students.guardianPhone,
          email: students.email,
          className: classes.name,
        })
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .where(eq(students.schoolId, schoolId))
        .orderBy(students.lastName);
      return {
        id,
        title: "Guardian Contact Sheet",
        description: "Contact details for parent/guardian outreach.",
        columns: [
          { key: "student", label: "Student" },
          { key: "guardian", label: "Guardian" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "className", label: "Class" },
        ],
        rows,
      };
    }

    case "enrollment-trend": {
      const rows = await db
        .select({
          status: students.status,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(students)
        .where(eq(students.schoolId, schoolId))
        .groupBy(students.status)
        .orderBy(sql`count(*) desc`);
      return {
        id,
        title: "Enrollment by Status",
        description: "Student counts grouped by enrollment status.",
        columns: [
          { key: "status", label: "Status" },
          { key: "count", label: "Students" },
        ],
        rows,
      };
    }

    case "fee-collection": {
      const raw = await db
        .select({
          student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          title: feeInvoices.title,
          base: feeInvoices.baseAmount,
          transport: feeInvoices.transportFee,
          fine: feeInvoices.fine,
          discount: sql<number>`${feeInvoices.siblingDiscount} + ${feeInvoices.otherDiscount}`.mapWith(Number),
          paid: feeInvoices.amountPaid,
          status: feeInvoices.status,
        })
        .from(feeInvoices)
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(eq(feeInvoices.schoolId, schoolId));
      const rows = raw.map((r) => ({
        ...r,
        net: r.base + r.transport + r.fine - r.discount - r.paid,
      }));
      const collected = rows.reduce((s, r) => s + r.paid, 0);
      const outstanding = rows.reduce((s, r) => s + Math.max(0, r.net), 0);
      return {
        id, title: "Fee Collection", description: "Invoice-level collection summary.",
        columns: [
          { key: "student", label: "Student" }, { key: "title", label: "Invoice" },
          { key: "base", label: "Base" }, { key: "transport", label: "Transport" },
          { key: "fine", label: "Fine" }, { key: "discount", label: "Discount" },
          { key: "paid", label: "Paid" }, { key: "net", label: "Net due" },
          { key: "status", label: "Status" },
        ],
        rows,
        summary: [
          { label: "Collected", value: String(collected) },
          { label: "Outstanding", value: String(outstanding) },
        ],
      };
    }

    case "fee-defaulters": {
      const raw = await db
        .select({
          student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          title: feeInvoices.title,
          base: feeInvoices.baseAmount,
          transport: feeInvoices.transportFee,
          fine: feeInvoices.fine,
          discount: sql<number>`${feeInvoices.siblingDiscount} + ${feeInvoices.otherDiscount}`.mapWith(Number),
          paid: feeInvoices.amountPaid,
          dueDate: feeInvoices.dueDate,
        })
        .from(feeInvoices)
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(eq(feeInvoices.schoolId, schoolId));
      const rows = raw
        .map((r) => ({ ...r, net: r.base + r.transport + r.fine - r.discount - r.paid }))
        .filter((r) => r.net > 0)
        .sort((a, b) => b.net - a.net);
      return {
        id, title: "Fee Defaulters", description: "Invoices with an outstanding balance.",
        columns: [
          { key: "student", label: "Student" }, { key: "title", label: "Invoice" },
          { key: "net", label: "Outstanding" }, { key: "dueDate", label: "Due" },
        ],
        rows,
        summary: [{ label: "Defaulters", value: String(rows.length) }],
      };
    }

    case "staff-directory": {
      const rows = await db
        .select({
          name: sql<string>`${staff.firstName} || ' ' || ${staff.lastName}`,
          designation: staff.designation,
          department: staff.department,
          mobile: staff.mobileNumber,
          email: staff.email,
          status: staff.status,
        })
        .from(staff)
        .where(eq(staff.schoolId, schoolId))
        .orderBy(staff.lastName);
      return {
        id, title: "Staff Directory", description: "All staff members.",
        columns: [
          { key: "name", label: "Name" }, { key: "designation", label: "Designation" },
          { key: "department", label: "Department" }, { key: "mobile", label: "Mobile" },
          { key: "email", label: "Email" }, { key: "status", label: "Status" },
        ],
        rows,
        summary: [{ label: "Total staff", value: String(rows.length) }],
      };
    }

    case "dropout-report": {
      const rows = await db
        .select({
          name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
          className: classes.name,
          father: students.fatherName,
          phone: students.mobileNumber,
        })
        .from(students)
        .leftJoin(classes, eq(students.classId, classes.id))
        .where(and(eq(students.schoolId, schoolId), eq(students.status, "dropout")))
        .orderBy(students.lastName);
      return {
        id, title: "Dropout Report", description: "Students currently marked as dropout.",
        columns: [
          { key: "name", label: "Student" }, { key: "className", label: "Class" },
          { key: "father", label: "Father" }, { key: "phone", label: "Phone" },
        ],
        rows,
        summary: [{ label: "Dropouts", value: String(rows.length) }],
      };
    }

    case "transport-routes": {
      const raw = await db
        .select({
          name: transportRoutes.name,
          stop: transportRoutes.stopName,
          driver: transportRoutes.driverName,
          vehicle: transportRoutes.vehicleNumber,
          monthlyFee: transportRoutes.monthlyFee,
          months: transportRoutes.monthsRequired,
        })
        .from(transportRoutes)
        .where(eq(transportRoutes.schoolId, schoolId))
        .orderBy(transportRoutes.name);
      const rows = raw.map((r) => ({ ...r, total: r.monthlyFee * r.months }));
      return {
        id, title: "Transport Routes", description: "Routes with total billable transport fee.",
        columns: [
          { key: "name", label: "Route" }, { key: "stop", label: "Stop" },
          { key: "driver", label: "Driver" }, { key: "vehicle", label: "Vehicle" },
          { key: "monthlyFee", label: "Monthly" }, { key: "months", label: "Months" },
          { key: "total", label: "Total" },
        ],
        rows,
      };
    }

    default:
      throw new Error("Unknown report");
  }
}

export function toCsv(report: ReportResult): string {
  const header = report.columns.map((c) => `"${c.label}"`).join(",");
  const lines = report.rows.map((row) =>
    report.columns
      .map((c) => {
        const v = row[c.key];
        const s = v == null ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  return [header, ...lines].join("\r\n");
}
