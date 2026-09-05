import { db } from "@/db";
import { schools, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  try {
    const { name, email, password, schoolName } = await req.json();
    if (!name || !email || !password || !schoolName) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }
    const lowerEmail = String(email).toLowerCase();

    let slug = slugify(schoolName) || "school";
    // ensure unique slug
    const existingSlugs = await db
      .select({ slug: schools.slug })
      .from(schools)
      .where(eq(schools.slug, slug));
    if (existingSlugs.length > 0) {
      slug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;
    }

    const [school] = await db
      .insert(schools)
      .values({ name: schoolName, slug, tagline: "Empowering learning every day" })
      .returning();

    const existing = await db
      .select()
      .from(users)
      .where(and(eq(users.email, lowerEmail), eq(users.schoolId, school.id)))
      .limit(1);
    if (existing.length > 0) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const [user] = await db
      .insert(users)
      .values({
        schoolId: school.id,
        name,
        email: lowerEmail,
        passwordHash: hashPassword(password),
        role: "admin",
        title: "Head Teacher",
      })
      .returning();

    await createSession(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Registration failed:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
