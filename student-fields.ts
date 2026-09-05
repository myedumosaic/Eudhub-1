// Shared list of writable student fields (used by API + bulk import)
export const STUDENT_TEXT_FIELDS = [
  "admissionNo",
  "penNo",
  "apaarNo",
  "rollNumber",
  "section",
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "category",
  "religion",
  "caste",
  "bloodGroup",
  "mobileNumber",
  "email",
  "fatherName",
  "fatherPhone",
  "fatherOccupation",
  "motherName",
  "motherPhone",
  "motherOccupation",
  "guardianName",
  "guardianPhone",
  "currentAddress",
  "permanentAddress",
  "house",
  "city",
  "state",
  "bankAccountNumber",
  "bankName",
  "ifscCode",
  "aadhaarNo",
  "samagraId",
  "photoUrl",
] as const;

export const STUDENT_DATE_FIELDS = ["dateOfBirth", "admissionDate", "enrollmentDate"] as const;
export const STUDENT_BOOL_FIELDS = ["rte", "hosteller"] as const;

export function buildStudentValues(body: Record<string, unknown>) {
  const v: Record<string, unknown> = {};
  for (const f of STUDENT_TEXT_FIELDS) {
    if (body[f] !== undefined) v[f] = body[f] === "" ? null : body[f];
  }
  for (const f of STUDENT_DATE_FIELDS) {
    if (body[f] !== undefined) v[f] = body[f] || null;
  }
  for (const f of STUDENT_BOOL_FIELDS) {
    if (body[f] !== undefined)
      v[f] = body[f] === true || body[f] === "true" || body[f] === "yes" || body[f] === 1 || body[f] === "1";
  }
  if (body.status !== undefined) v.status = body.status || "active";
  if (body.classId !== undefined) v.classId = body.classId ? Number(body.classId) : null;
  if (body.sessionId !== undefined) v.sessionId = body.sessionId ? Number(body.sessionId) : null;
  return v;
}
