import { db } from "@/db";
import { feeInvoices, students } from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

function netDue(inv: {
  baseAmount: number;
  transportFee: number;
  siblingDiscount: number;
  otherDiscount: number;
  fine: number;
  amountPaid: number;
}) {
  const gross = inv.baseAmount + inv.transportFee + inv.fine;
  const discount = inv.siblingDiscount + inv.otherDiscount;
  return gross - discount - inv.amountPaid;
}

export const GET = withAuth(async (user) => {
  const rows = await db
    .select({
      id: feeInvoices.id,
      studentId: feeInvoices.studentId,
      studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      title: feeInvoices.title,
      baseAmount: feeInvoices.baseAmount,
      transportFee: feeInvoices.transportFee,
      siblingDiscount: feeInvoices.siblingDiscount,
      otherDiscount: feeInvoices.otherDiscount,
      fine: feeInvoices.fine,
      amountPaid: feeInvoices.amountPaid,
      dueDate: feeInvoices.dueDate,
      status: feeInvoices.status,
      note: feeInvoices.note,
    })
    .from(feeInvoices)
    .leftJoin(students, eq(feeInvoices.studentId, students.id))
    .where(eq(feeInvoices.schoolId, user.schoolId))
    .orderBy(desc(feeInvoices.createdAt));

  const withNet = rows.map((r) => ({ ...r, net: netDue(r) }));
  return Response.json({ invoices: withNet });
});

function computeStatus(net: number, paid: number) {
  if (net <= 0 && paid > 0) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  if (!body.studentId || !body.title)
    return Response.json({ error: "Student and title required" }, { status: 400 });

  const inv = {
    baseAmount: Number(body.baseAmount) || 0,
    transportFee: Number(body.transportFee) || 0,
    siblingDiscount: Number(body.siblingDiscount) || 0,
    otherDiscount: Number(body.otherDiscount) || 0,
    fine: Number(body.fine) || 0,
    amountPaid: Number(body.amountPaid) || 0,
  };
  const net = netDue(inv);

  const [row] = await db
    .insert(feeInvoices)
    .values({
      schoolId: user.schoolId,
      studentId: Number(body.studentId),
      sessionId: body.sessionId ? Number(body.sessionId) : null,
      title: body.title,
      ...inv,
      dueDate: body.dueDate || null,
      note: body.note || null,
      status: computeStatus(net, inv.amountPaid),
    })
    .returning();
  return Response.json({ invoice: row });
});
