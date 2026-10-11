import { NextResponse } from "next/server";

import { addVerificationAttempt, getTransactions } from "@/lib/db";
import { createSignedReceipt, verifyPaymentClaim, verifySignedReceipt } from "@/lib/verification";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, expectedAmountMinor, expectedCurrency, expectedRecipientId, expectedOrderRef, receiptToken } = body;

    if (receiptToken) {
      const payload = verifySignedReceipt(receiptToken);

      if (!payload) {
        return NextResponse.json({
          outcome: "SUSPICIOUS_RECEIPT",
          explanation: "The receipt signature is invalid or the token was modified.",
          details: { reason: "invalid_signature" },
        });
      }
    }

    const transactions = await getTransactions();
    const result = verifyPaymentClaim(
      {
        reference,
        expectedAmountMinor,
        expectedCurrency,
        expectedRecipientId,
        expectedOrderRef,
      },
      transactions
    );

    await addVerificationAttempt({
      transactionRef: reference,
      expectedAmountMinor,
      expectedCurrency,
      expectedRecipientId,
      expectedOrderRef,
      outcome: result.outcome,
      explanation: result.explanation,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        outcome: "UNVERIFIED_RECEIPT",
        explanation: "The verification request could not be processed.",
        details: { reason: "request_error" },
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  const demoReference = "TXN-1001";
  const receiptToken = createSignedReceipt({
    transactionRef: demoReference,
    issuerId: "ZENITH_BANK",
    amountMinor: 35000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    orderRef: "ORD-101",
  });

  return NextResponse.json({
    reference: demoReference,
    receiptToken,
    status: "demo-ready",
  });
}
