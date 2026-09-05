import { db } from "@/db";
import { feeInvoices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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
  return inv.baseAmount + inv.transportFee + inv.fine - inv.siblingDiscount - inv.otherDiscount - inv.amountPaid;
}

function computeStatus(net: number, paid: number) {
  if (net <= 0 && paid > 0) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export const PUT = withAuth(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
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
    .update(feeInvoices)
    .set({
      title: body.title,
      ...inv,
      dueDate: body.dueDate || null,
      note: body.note || null,
      status: computeStatus(net, inv.amountPaid),
    })
    .where(and(eq(feeInvoices.id, Number(id)), eq(feeInvoices.schoolId, user.schoolId)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ invoice: row });
});

export const DELETE = withAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await db.delete(feeInvoices).where(and(eq(feeInvoices.id, Number(id)), eq(feeInvoices.schoolId, user.schoolId)));
  return Response.json({ ok: true });
});
