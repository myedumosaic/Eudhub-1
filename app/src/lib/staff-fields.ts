export const STAFF_TEXT_FIELDS = [
  "photoUrl",
  "enrollmentNo",
  "designation",
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "department",
  "bloodGroup",
  "mobileNumber",
  "email",
  "fatherName",
  "spouseName",
  "currentAddress",
  "permanentAddress",
  "bankAccountNumber",
  "bankName",
  "ifscCode",
  "aadhaarNo",
] as const;

export const STAFF_DATE_FIELDS = ["joiningDate", "dateOfBirth"] as const;

export function buildStaffValues(body: Record<string, unknown>) {
  const v: Record<string, unknown> = {};
  for (const f of STAFF_TEXT_FIELDS) {
    if (body[f] !== undefined) v[f] = body[f] === "" ? null : body[f];
  }
  for (const f of STAFF_DATE_FIELDS) {
    if (body[f] !== undefined) v[f] = body[f] || null;
  }
  if (body.status !== undefined) v.status = body.status || "active";
  return v;
}
