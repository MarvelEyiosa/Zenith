import { NextResponse } from "next/server";

import { addOrderAttempt } from "@/lib/db";
import { verifyOrderClaim } from "@/lib/verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderRef, expectedAmountMinor, expectedCurrency, expectedRecipientId, paymentReference } = body;

    const result = verifyOrderClaim({
      orderRef,
      expectedAmountMinor,
      expectedCurrency,
      expectedRecipientId,
      paymentReference,
    });

    await addOrderAttempt({
      orderRef,
      expectedAmountMinor,
      expectedCurrency,
      expectedRecipientId,
      paymentReference,
      outcome: result.outcome,
      explanation: result.explanation,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        outcome: "ORDER_NOT_FOUND",
        explanation: "The order review request could not be processed.",
        details: { reason: "request_error" },
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    demoOrderRef: "ORD-106",
    demoPaymentReference: "TXN-1006",
    status: "demo-ready",
  });
}
