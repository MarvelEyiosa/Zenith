import { NextResponse } from "next/server";

import { verifyMerchantConfirmation } from "@/lib/verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderRef, reference, receiptToken, expectedAmountMinor, expectedCurrency, expectedRecipientId } = body;

    const result = verifyMerchantConfirmation({
      orderRef,
      reference,
      receiptToken,
      expectedAmountMinor,
      expectedCurrency,
      expectedRecipientId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        outcome: "UNVERIFIED_RECEIPT",
        explanation: "The merchant confirmation request could not be processed.",
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
