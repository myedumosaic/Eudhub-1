import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  date,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- Tenants (schools) ----------
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  tagline: text("tagline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Users (teachers/admins) ----------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 24 }).notNull().default("teacher"),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_school_idx").on(t.email, t.schoolId),
  }),
);

// ---------- Academic Sessions (year-wise) ----------
export const academicSessions = pgTable("academic_sessions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "2026-2027"
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Permissions (checkbox RBAC per user per module) ----------
export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    module: varchar("module", { length: 48 }).notNull(),
    canView: boolean("can_view").notNull().default(true),
    canEntry: boolean("can_entry").notNull().default(false),
    canEdit: boolean("can_edit").notNull().default(false),
    canDelete: boolean("can_delete").notNull().default(false),
  },
  (t) => ({
    permIdx: uniqueIndex("permissions_user_module_idx").on(t.userId, t.module),
  }),
);

// ---------- Auth Sessions ----------
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Classes / Sections ----------
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gradeLevel: text("grade_level"),
  room: text("room"),
  subject: text("subject"),
  teacherId: integer("teacher_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Students ----------
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => classes.id, {
    onDelete: "set null",
  }),
  sessionId: integer("session_id").references(() => academicSessions.id, {
    onDelete: "set null",
  }),
  // Identity
  photoUrl: text("photo_url"),
  admissionNo: text("admission_no"),
  penNo: text("pen_no"),
  apaarNo: text("apaar_no"),
  rollNumber: text("roll_number"),
  section: text("section"),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  gender: varchar("gender", { length: 16 }),
  dateOfBirth: date("date_of_birth"),
  category: text("category"),
  religion: text("religion"),
  caste: text("caste"),
  bloodGroup: varchar("blood_group", { length: 8 }),
  mobileNumber: text("mobile_number"),
  email: text("email"),
  admissionDate: date("admission_date"),
  // Parents / guardian
  fatherName: text("father_name"),
  fatherPhone: text("father_phone"),
  fatherOccupation: text("father_occupation"),
  motherName: text("mother_name"),
  motherPhone: text("mother_phone"),
  motherOccupation: text("mother_occupation"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  // Address
  currentAddress: text("current_address"),
  permanentAddress: text("permanent_address"),
  house: text("house"),
  city: text("city"),
  state: text("state"),
  // Bank / govt IDs
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  ifscCode: text("ifsc_code"),
  aadhaarNo: text("aadhaar_no"),
  samagraId: text("samagra_id"),
  // Flags
  rte: boolean("rte").notNull().default(false),
  hosteller: boolean("hosteller").notNull().default(false),
  enrollmentDate: date("enrollment_date"),
  status: varchar("status", { length: 24 }).notNull().default("active"), // active | dropout | promoted | graduated | inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Subjects & student subject selection ----------
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  isElective: boolean("is_elective").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentSubjects = pgTable(
  "student_subjects",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniq: uniqueIndex("student_subject_idx").on(t.studentId, t.subjectId),
  }),
);

// ---------- Staff ----------
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url"),
  enrollmentNo: text("enrollment_no"),
  joiningDate: date("joining_date"),
  designation: text("designation"),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  gender: varchar("gender", { length: 16 }),
  dateOfBirth: date("date_of_birth"),
  department: text("department"),
  bloodGroup: varchar("blood_group", { length: 8 }),
  mobileNumber: text("mobile_number"),
  email: text("email"),
  fatherName: text("father_name"),
  spouseName: text("spouse_name"),
  currentAddress: text("current_address"),
  permanentAddress: text("permanent_address"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  ifscCode: text("ifsc_code"),
  aadhaarNo: text("aadhaar_no"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Transport routes ----------
export const transportRoutes = pgTable("transport_routes", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  stopName: text("stop_name"),
  driverName: text("driver_name"),
  vehicleNumber: text("vehicle_number"),
  monthlyFee: integer("monthly_fee").notNull().default(0),
  monthsRequired: integer("months_required").notNull().default(12),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Fee heads (structure) ----------
export const feeHeads = pgTable("fee_heads", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: integer("amount").notNull().default(0),
  frequency: varchar("frequency", { length: 24 }).notNull().default("monthly"), // monthly | annual | one-time
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Fee invoices (per student) ----------
export const feeInvoices = pgTable("fee_invoices", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => academicSessions.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  baseAmount: integer("base_amount").notNull().default(0),
  transportFee: integer("transport_fee").notNull().default(0),
  siblingDiscount: integer("sibling_discount").notNull().default(0),
  otherDiscount: integer("other_discount").notNull().default(0),
  fine: integer("fine").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  dueDate: date("due_date"),
  status: varchar("status", { length: 24 }).notNull().default("unpaid"), // unpaid | partial | paid
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Assignments ----------
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  maxPoints: integer("max_points").notNull().default(100),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Grades ----------
export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  points: integer("points"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Attendance ----------
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  present: boolean("present").notNull().default(true),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Announcements ----------
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  authorId: integer("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Settings / Customization (per tenant) ----------
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" })
    .unique(),
  academicYear: text("academic_year").notNull().default("2026-2027"),
  gradeScale: text("grade_scale").notNull().default("percentage"), // percentage | letter | gpa
  passingGrade: integer("passing_grade").notNull().default(60),
  attendanceThreshold: integer("attendance_threshold").notNull().default(75),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  timezone: text("timezone").notNull().default("UTC"),
  primaryColor: varchar("primary_color", { length: 16 }).notNull().default("indigo"),
  weekStart: varchar("week_start", { length: 12 }).notNull().default("monday"),
  logoEmoji: varchar("logo_emoji", { length: 8 }).notNull().default("🏫"),
  featureFlags: text("feature_flags").notNull().default("{}"), // JSON string for future toggles
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Settings = typeof settings.$inferSelect;

export type School = typeof schools.$inferSelect;
export type User = typeof users.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AcademicSession = typeof academicSessions.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type TransportRoute = typeof transportRoutes.$inferSelect;
export type FeeHead = typeof feeHeads.$inferSelect;
export type FeeInvoice = typeof feeInvoices.$inferSelect;
