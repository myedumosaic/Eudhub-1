import "dotenv/config";
import pkg from "pg";
import { randomBytes, scryptSync } from "crypto";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const firstNames = [
  "Liam", "Olivia", "Noah", "Emma", "Ava", "Sophia", "Mason", "Isabella",
  "Ethan", "Mia", "Lucas", "Amelia", "Aiden", "Harper", "James", "Evelyn",
  "Benjamin", "Abigail", "Elijah", "Ella", "Henry", "Scarlett", "Jack", "Grace",
  "Samuel", "Chloe", "Daniel", "Zoe", "Owen", "Lily", "Leo", "Nora",
];
const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const client = await pool.connect();
  try {
    // Reset all data
    await client.query(
      "TRUNCATE settings, permissions, student_subjects, subjects, fee_invoices, fee_heads, transport_routes, staff, academic_sessions, attendance, grades, assignments, students, classes, announcements, sessions, users, schools RESTART IDENTITY CASCADE",
    );

    // --- School 1: Oakridge (main demo) ---
    const { rows: schoolRows } = await client.query(
      "INSERT INTO schools (name, slug, tagline) VALUES ($1,$2,$3) RETURNING id",
      ["Oakridge High School", "oakridge", "Empowering learning every day"],
    );
    const schoolId = schoolRows[0].id;

    // Second tenant to prove isolation
    const { rows: s2 } = await client.query(
      "INSERT INTO schools (name, slug, tagline) VALUES ($1,$2,$3) RETURNING id",
      ["Maple Grove Academy", "maple-grove", "Grow. Learn. Thrive."],
    );
    const school2Id = s2[0].id;

    // Users
    const { rows: userRows } = await client.query(
      `INSERT INTO users (school_id, name, email, password_hash, role, title)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [schoolId, "Ada Lovelace", "ada@oakridge.edu", hashPassword("password123"), "admin", "Head Teacher"],
    );
    const adaId = userRows[0].id;

    const otherTeachers = [
      ["Alan Turing", "alan@oakridge.edu", "Science Lead"],
      ["Grace Hopper", "grace@oakridge.edu", "Mathematics"],
      ["Katherine Johnson", "katherine@oakridge.edu", "Physics"],
    ];
    const teacherIds = [adaId];
    for (const [name, email, title] of otherTeachers) {
      const { rows } = await client.query(
        `INSERT INTO users (school_id, name, email, password_hash, role, title)
         VALUES ($1,$2,$3,$4,'teacher',$5) RETURNING id`,
        [schoolId, name, email, hashPassword("password123"), title],
      );
      teacherIds.push(rows[0].id);
    }

    // Second school user
    await client.query(
      `INSERT INTO users (school_id, name, email, password_hash, role, title)
       VALUES ($1,$2,$3,$4,'admin',$5)`,
      [school2Id, "Marie Curie", "marie@maplegrove.edu", hashPassword("password123"), "Principal"],
    );

    // Classes
    const classDefs = [
      ["Algebra I · Period 2", "9", "204", "Mathematics"],
      ["Biology · Period 1", "10", "Lab B", "Science"],
      ["World History · Period 4", "11", "112", "History"],
      ["English Literature · Period 3", "10", "220", "English"],
      ["Physics · Period 5", "12", "Lab A", "Science"],
      ["Homeroom 9A", "9", "204", "Homeroom"],
    ];
    const classIds = [];
    for (const [name, grade, room, subject] of classDefs) {
      const { rows } = await client.query(
        `INSERT INTO classes (school_id, name, grade_level, room, subject, teacher_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [schoolId, name, grade, room, subject, pick(teacherIds)],
      );
      classIds.push(rows[0].id);
    }

    // A class in school 2
    await client.query(
      `INSERT INTO classes (school_id, name, grade_level, room, subject) VALUES ($1,'Chemistry · Period 1','11','Lab 1','Science')`,
      [school2Id],
    );

    // Students spread across classes
    const usedNames = new Set();
    const studentIdsByClass = {};
    for (const cId of classIds) studentIdsByClass[cId] = [];

    for (let i = 0; i < 96; i++) {
      let fn, ln, key;
      do {
        fn = pick(firstNames);
        ln = pick(lastNames);
        key = fn + ln;
      } while (usedNames.has(key));
      usedNames.add(key);

      const cId = classIds[i % classIds.length];
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@student.oakridge.edu`;
      const guardian = `${pick(firstNames)} ${ln}`;
      const phone = `(555) ${String(100 + Math.floor(Math.random() * 899))}-${String(1000 + Math.floor(Math.random() * 8999))}`;
      const status = Math.random() < 0.92 ? "active" : "inactive";
      const { rows } = await client.query(
        `INSERT INTO students (school_id, class_id, first_name, last_name, email, guardian_name, guardian_phone, enrollment_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [schoolId, cId, fn, ln, email, guardian, phone, daysAgo(Math.floor(Math.random() * 300) + 30), status],
      );
      studentIdsByClass[cId].push(rows[0].id);
    }

    // Student in school 2
    await client.query(
      `INSERT INTO students (school_id, first_name, last_name, status) VALUES ($1,'Pierre','Dubois','active')`,
      [school2Id],
    );

    // Assignments + grades + attendance
    const assignmentTitles = [
      "Quiz 1: Fundamentals",
      "Homework Set 2",
      "Midterm Exam",
      "Lab Report",
      "Group Project",
      "Chapter Review",
    ];

    for (const cId of classIds) {
      const numAssignments = 3 + Math.floor(Math.random() * 2);
      for (let a = 0; a < numAssignments; a++) {
        const isPast = a < numAssignments - 1;
        const maxPoints = pick([50, 100, 100, 20]);
        const { rows } = await client.query(
          `INSERT INTO assignments (school_id, class_id, title, description, due_date, max_points, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [
            schoolId,
            cId,
            `${pick(assignmentTitles)}`,
            "Complete all sections and show your work.",
            isPast ? daysAgo(Math.floor(Math.random() * 20) + 1) : daysAhead(Math.floor(Math.random() * 14) + 1),
            maxPoints,
            isPast ? "closed" : "open",
          ],
        );
        const assignmentId = rows[0].id;

        // grade past assignments
        if (isPast) {
          for (const sid of studentIdsByClass[cId]) {
            if (Math.random() < 0.9) {
              const points = Math.round((0.6 + Math.random() * 0.4) * maxPoints);
              await client.query(
                `INSERT INTO grades (school_id, assignment_id, student_id, points, feedback)
                 VALUES ($1,$2,$3,$4,$5)`,
                [schoolId, assignmentId, sid, points, points / maxPoints > 0.85 ? "Great work!" : "Nice effort."],
              );
            }
          }
        }
      }

      // attendance for last 5 school days
      for (let d = 0; d < 5; d++) {
        const dateStr = daysAgo(d);
        for (const sid of studentIdsByClass[cId]) {
          const present = Math.random() < 0.94;
          await client.query(
            `INSERT INTO attendance (school_id, class_id, student_id, date, present, note)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [schoolId, cId, sid, dateStr, present, present ? null : "Absent"],
          );
        }
      }
    }

    // Announcements
    const announcements = [
      ["Welcome back to the new term!", "Hope everyone had a restful break. Let's make this term our best yet. Check your class rosters and reach out with any questions.", true],
      ["Parent-Teacher conferences next week", "Sign-up sheets are now available in the staff room. Please confirm your available slots by Friday.", false],
      ["Science fair submissions open", "Encourage your students to submit projects. Deadline is end of month. Judging criteria posted on the shared drive.", false],
      ["Fire drill scheduled Thursday", "A full building fire drill will take place Thursday at 10:15am. Please review evacuation routes with your class.", false],
    ];
    for (const [title, body, pinned] of announcements) {
      await client.query(
        `INSERT INTO announcements (school_id, author_id, title, body, pinned) VALUES ($1,$2,$3,$4,$5)`,
        [schoolId, pick(teacherIds), title, body, pinned],
      );
    }

    // Academic session (active) + link students to it
    const { rows: sesRows } = await client.query(
      `INSERT INTO academic_sessions (school_id, name, start_date, end_date, is_active)
       VALUES ($1,'2026-2027', $2, $3, true) RETURNING id`,
      [schoolId, daysAgo(60), daysAhead(300)],
    );
    const activeSessionId = sesRows[0].id;
    await client.query(
      `INSERT INTO academic_sessions (school_id, name, start_date, end_date, is_active)
       VALUES ($1,'2025-2026', $2, $3, false)`,
      [schoolId, daysAgo(420), daysAgo(61)],
    );
    await client.query(`UPDATE students SET session_id = $1 WHERE school_id = $2`, [activeSessionId, schoolId]);

    // Enrich students with richer fields + admission numbers + a few dropouts
    const { rows: allStu } = await client.query(
      `SELECT id, first_name, last_name FROM students WHERE school_id = $1 ORDER BY id`,
      [schoolId],
    );
    let adm = 1000;
    for (const st of allStu) {
      adm++;
      const drop = Math.random() < 0.05;
      await client.query(
        `UPDATE students SET admission_no=$1, pen_no=$2, roll_number=$3, section=$4,
           gender=$5, father_name=$6, father_phone=$7, mother_name=$8, blood_group=$9,
           city='Springfield', state='IL', status=$10, aadhaar_no=$11
         WHERE id=$12`,
        [
          `ADM-${adm}`,
          `PEN${100000 + adm}`,
          String((adm % 40) + 1),
          pick(["A", "B", "C"]),
          pick(["Male", "Female"]),
          `${pick(firstNames)} ${st.last_name}`,
          `(555) ${String(200 + Math.floor(Math.random() * 700))}-${String(1000 + Math.floor(Math.random() * 8999))}`,
          `${pick(firstNames)} ${st.last_name}`,
          pick(["A+", "B+", "O+", "AB+", "O-"]),
          drop ? "dropout" : "active",
          `${Math.floor(100000000000 + Math.random() * 899999999999)}`,
          st.id,
        ],
      );
    }

    // Subjects
    const subjectDefs = [
      ["Mathematics", "MATH", false], ["Science", "SCI", false], ["English", "ENG", false],
      ["Social Studies", "SOC", false], ["Computer Science", "CS", true], ["Art", "ART", true],
      ["Physical Education", "PE", true], ["Music", "MUS", true],
    ];
    const subjectIds = [];
    for (const [name, code, elective] of subjectDefs) {
      const { rows } = await client.query(
        `INSERT INTO subjects (school_id, name, code, is_elective) VALUES ($1,$2,$3,$4) RETURNING id`,
        [schoolId, name, code, elective],
      );
      subjectIds.push(rows[0].id);
    }
    // Assign 4-6 subjects to each active student
    for (const st of allStu) {
      const shuffled = [...subjectIds].sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 3));
      for (const sid of shuffled) {
        await client.query(
          `INSERT INTO student_subjects (school_id, student_id, subject_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [schoolId, st.id, sid],
        );
      }
    }

    // Staff
    const staffDefs = [
      ["Robert", "Johnson", "Principal", "Administration"],
      ["Emily", "Clark", "Vice Principal", "Administration"],
      ["Michael", "Brown", "Senior Teacher", "Mathematics"],
      ["Sarah", "Davis", "Teacher", "Science"],
      ["David", "Wilson", "Teacher", "English"],
      ["Laura", "Martinez", "Lab Assistant", "Science"],
      ["James", "Anderson", "Accountant", "Finance"],
      ["Anna", "Thomas", "Librarian", "Library"],
    ];
    let staffEnroll = 5000;
    for (const [fn, ln, desig, dept] of staffDefs) {
      staffEnroll++;
      await client.query(
        `INSERT INTO staff (school_id, enrollment_no, joining_date, designation, first_name, last_name,
           gender, department, blood_group, mobile_number, email, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')`,
        [
          schoolId, `EMP-${staffEnroll}`, daysAgo(Math.floor(Math.random() * 1500) + 200),
          desig, fn, ln, pick(["Male", "Female"]), dept, pick(["A+", "B+", "O+"]),
          `(555) ${String(300 + Math.floor(Math.random() * 600))}-${String(1000 + Math.floor(Math.random() * 8999))}`,
          `${fn.toLowerCase()}.${ln.toLowerCase()}@oakridge.edu`,
        ],
      );
    }

    // Fee heads
    const feeHeadDefs = [
      ["Tuition Fee", 500, "monthly"], ["Admission Fee", 2000, "one-time"],
      ["Exam Fee", 300, "annual"], ["Library Fee", 100, "annual"], ["Lab Fee", 250, "annual"],
    ];
    for (const [name, amount, freq] of feeHeadDefs) {
      await client.query(`INSERT INTO fee_heads (school_id, name, amount, frequency) VALUES ($1,$2,$3,$4)`, [schoolId, name, amount, freq]);
    }

    // Transport routes
    const routeDefs = [
      ["Route 1 - North", "Maple St", "Tom Reed", "BUS-01", 80, 10],
      ["Route 2 - South", "Oak Ave", "Jerry Fox", "BUS-02", 90, 10],
      ["Route 3 - East", "Pine Rd", "Sam Lee", "BUS-03", 75, 10],
    ];
    const routeIds = [];
    for (const [name, stop, driver, veh, fee, months] of routeDefs) {
      const { rows } = await client.query(
        `INSERT INTO transport_routes (school_id, name, stop_name, driver_name, vehicle_number, monthly_fee, months_required)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, monthly_fee, months_required`,
        [schoolId, name, stop, driver, veh, fee, months],
      );
      routeIds.push(rows[0]);
    }

    // Fee invoices for a subset of students, with discounts/fines/transport
    for (let i = 0; i < allStu.length; i += 2) {
      const st = allStu[i];
      const base = 500 * (1 + Math.floor(Math.random() * 3));
      const useTransport = Math.random() < 0.5;
      const route = pick(routeIds);
      const transport = useTransport ? route.monthly_fee * route.months_required : 0;
      const sibling = Math.random() < 0.2 ? 200 : 0;
      const fine = Math.random() < 0.15 ? 50 : 0;
      const gross = base + transport + fine - sibling;
      const paidRatio = pick([0, 0.5, 1, 1]);
      const paid = Math.round(gross * paidRatio);
      const net = gross - paid;
      const status = net <= 0 && paid > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
      await client.query(
        `INSERT INTO fee_invoices (school_id, student_id, session_id, title, base_amount, transport_fee,
           sibling_discount, other_discount, fine, amount_paid, due_date, status)
         VALUES ($1,$2,$3,'Term 1 Fees',$4,$5,$6,0,$7,$8,$9,$10)`,
        [schoolId, st.id, activeSessionId, base, transport, sibling, fine, paid, daysAhead(15), status],
      );
    }

    // Per-tenant customization settings
    await client.query(
      `INSERT INTO settings (school_id, academic_year, passing_grade, attendance_threshold, currency, timezone, logo_emoji)
       VALUES ($1,'2026-2027',60,75,'USD','America/New_York','🏫')`,
      [schoolId],
    );
    await client.query(
      `INSERT INTO settings (school_id, academic_year, passing_grade, attendance_threshold, currency, timezone, logo_emoji)
       VALUES ($1,'2026-2027',65,80,'EUR','Europe/London','🍁')`,
      [school2Id],
    );

    console.log("✅ Seed complete: Oakridge High School (login ada@oakridge.edu / password123)");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
