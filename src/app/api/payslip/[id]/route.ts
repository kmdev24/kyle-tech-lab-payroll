import { NextResponse } from "next/server";
import { getSession, isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePayslip } from "@/lib/payslip";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const cutoff = await prisma.cutoff.findUnique({ where: { id }, select: { status: true } });
  if (!cutoff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Mom can download payslips only once a cutoff is received; Kyle can preview any.
  if (cutoff.status !== "RECEIVED" && !(await isAdminSession())) {
    return NextResponse.json({ error: "Payslip available once received" }, { status: 403 });
  }

  const { pdf, cutoff: c } = await generatePayslip(id);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="KTL-Payslip-${c.periodEnd.slice(0, 10)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
