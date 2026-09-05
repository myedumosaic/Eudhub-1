import { db } from "@/db";
import { students, classes, academicSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { buildStudentValues } from "@/lib/student-fields";

export const dynamic = "force-dynamic";

// GET ?sessionId=&status=
export const GET = withAuth(async (user, req) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const status = searchParams.get("status");

  const conditions = [eq(students.schoolId, user.schoolId)];
  if (sessionId) conditions.push(eq(students.sessionId, Number(sessionId)));
  if (status) conditions.push(eq(students.status, status));

  const rows = await db
    .select({
      id: students.id,
      admissionNo: students.admissionNo,
      penNo: students.penNo,
      apaarNo: students.apaarNo,
      rollNumber: students.rollNumber,
      section: students.section,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
      gender: students.gender,
      dateOfBirth: students.dateOfBirth,
      category: students.category,
      religion: students.religion,
      caste: students.caste,
      bloodGroup: students.bloodGroup,
      mobileNumber: students.mobileNumber,
      email: students.email,
      admissionDate: students.admissionDate,
      fatherName: students.fatherName,
      fatherPhone: students.fatherPhone,
      fatherOccupation: students.fatherOccupation,
      motherName: students.motherName,
      motherPhone: students.motherPhone,
      motherOccupation: students.motherOccupation,
      guardianName: students.guardianName,
      guardianPhone: students.guardianPhone,
      currentAddress: students.currentAddress,
      permanentAddress: students.permanentAddress,
      house: students.house,
      city: students.city,
      state: students.state,
      bankAccountNumber: students.bankAccountNumber,
      bankName: students.bankName,
      ifscCode: students.ifscCode,
      aadhaarNo: students.aadhaarNo,
      samagraId: students.samagraId,
      rte: students.rte,
      hosteller: students.hosteller,
      enrollmentDate: students.enrollmentDate,
      status: students.status,
      classId: students.classId,
      className: classes.name,
      sessionId: students.sessionId,
      sessionName: academicSessions.name,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .leftJoin(academicSessions, eq(students.sessionId, academicSessions.id))
    .where(and(...conditions))
    .orderBy(students.lastName, students.firstName);
  return Response.json({ students: rows });
});

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.firstName || !body.lastName)
    return Response.json({ error: "First and last name required" }, { status: 400 });
  const values = buildStudentValues(body);
  const [row] = await db
    .insert(students)
    .values({
      schoolId: user.schoolId,
      firstName: body.firstName,
      lastName: body.lastName,
      ...values,
    })
    .returning();
  return Response.json({ student: row });
});
