import crypto from "node:crypto";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REVERSED" | "UNAVAILABLE";

export type TransactionRecord = {
  transactionRef: string;
  amountMinor: number;
  currency: string;
  recipientId: string;
  status: PaymentStatus;
  orderRef?: string;
  fulfilledByOrderRef?: string | null;
  isAvailable: boolean;
  issuerId: string;
};

export type OrderStatus = "OPEN" | "PAID" | "FULFILLED" | "CANCELLED" | "PENDING";

export type OrderRecord = {
  orderRef: string;
  merchantId: string;
  customerId: string;
  amountMinor: number;
  currency: string;
  recipientId: string;
  status: OrderStatus;
  paymentTransactionRef?: string | null;
  fulfilledByPaymentRef?: string | null;
  createdAt?: string;
};

export type VerificationOutcome =
  | "PAYMENT_VERIFIED"
  | "PENDING_PAYMENT"
  | "SUSPICIOUS_RECEIPT"
  | "UNDERPAYMENT"
  | "WRONG_RECIPIENT"
  | "PREVIOUSLY_USED_PAYMENT"
  | "UNVERIFIED_RECEIPT"
  | "ORDER_VERIFIED"
  | "ORDER_NOT_FOUND"
  | "ORDER_UNPAID"
  | "ORDER_MISMATCH"
  | "ORDER_ALREADY_FULFILLED";

export type VerificationResult = {
  outcome: VerificationOutcome;
  explanation: string;
  details: Record<string, unknown>;
};

export const DEMO_TRANSACTIONS: TransactionRecord[] = [
  {
    transactionRef: "TXN-1001",
    amountMinor: 35000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "SUCCESS",
    orderRef: "ORD-101",
    fulfilledByOrderRef: null,
    isAvailable: true,
    issuerId: "ZENITH_BANK",
  },
  {
    transactionRef: "TXN-1002",
    amountMinor: 3500,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "SUCCESS",
    orderRef: "ORD-102",
    fulfilledByOrderRef: "ORD-901",
    isAvailable: true,
    issuerId: "ZENITH_BANK",
  },
  {
    transactionRef: "TXN-1003",
    amountMinor: 48000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "PENDING",
    orderRef: "ORD-103",
    fulfilledByOrderRef: null,
    isAvailable: true,
    issuerId: "ZENITH_BANK",
  },
  {
    transactionRef: "TXN-1004",
    amountMinor: 28000,
    currency: "NGN",
    recipientId: "OTHER_ACCOUNT_77",
    status: "SUCCESS",
    orderRef: "ORD-104",
    fulfilledByOrderRef: null,
    isAvailable: true,
    issuerId: "ZENITH_BANK",
  },
  {
    transactionRef: "TXN-1005",
    amountMinor: 120000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "REVERSED",
    orderRef: "ORD-105",
    fulfilledByOrderRef: null,
    isAvailable: true,
    issuerId: "ZENITH_BANK",
  },
  {
    transactionRef: "TXN-1006",
    amountMinor: 175000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "UNAVAILABLE",
    orderRef: "ORD-106",
    fulfilledByOrderRef: null,
    isAvailable: false,
    issuerId: "ZENITH_BANK",
  },
];

export const DEMO_ORDERS: OrderRecord[] = [
  {
    orderRef: "ORD-101",
    merchantId: "ZENITH_MERCHANT_01",
    customerId: "CUST-1001",
    amountMinor: 35000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "FULFILLED",
    paymentTransactionRef: "TXN-1001",
    fulfilledByPaymentRef: "TXN-1001",
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    orderRef: "ORD-102",
    merchantId: "ZENITH_MERCHANT_01",
    customerId: "CUST-1002",
    amountMinor: 3500,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "PAID",
    paymentTransactionRef: "TXN-1002",
    fulfilledByPaymentRef: "TXN-1002",
    createdAt: "2026-10-02T09:20:00.000Z",
  },
  {
    orderRef: "ORD-103",
    merchantId: "ZENITH_MERCHANT_01",
    customerId: "CUST-1003",
    amountMinor: 48000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "PENDING",
    paymentTransactionRef: "TXN-1003",
    fulfilledByPaymentRef: null,
    createdAt: "2026-10-02T12:00:00.000Z",
  },
  {
    orderRef: "ORD-104",
    merchantId: "ZENITH_MERCHANT_01",
    customerId: "CUST-1004",
    amountMinor: 28000,
    currency: "NGN",
    recipientId: "OTHER_ACCOUNT_77",
    status: "PAID",
    paymentTransactionRef: "TXN-1004",
    fulfilledByPaymentRef: null,
    createdAt: "2026-10-03T14:00:00.000Z",
  },
  {
    orderRef: "ORD-105",
    merchantId: "ZENITH_MERCHANT_01",
    customerId: "CUST-1005",
    amountMinor: 120000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "CANCELLED",
    paymentTransactionRef: "TXN-1005",
    fulfilledByPaymentRef: null,
    createdAt: "2026-10-03T16:00:00.000Z",
  },
  {
    orderRef: "ORD-106",
    merchantId: "ZENITH_MERCHANT_01",
    customerId: "CUST-1006",
    amountMinor: 175000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    status: "OPEN",
    paymentTransactionRef: null,
    fulfilledByPaymentRef: null,
    createdAt: "2026-10-04T11:10:00.000Z",
  },
];

const RECEIPT_SIGNING_KEY =
  process.env.RECEIPT_SIGNING_KEY || "demo-zenith-signing-key";

export function createSignedReceipt(payload: {
  transactionRef: string;
  issuerId: string;
  amountMinor: number;
  currency: string;
  recipientId: string;
  orderRef?: string;
}) {
  const body = {
    ...payload,
    issuedAt: new Date().toISOString(),
    signingKeyId: "demo-key-001",
  };

  const signature = crypto
    .createHmac("sha256", RECEIPT_SIGNING_KEY)
    .update(JSON.stringify(body))
    .digest("hex");

  return Buffer.from(
    JSON.stringify({
      payload: body,
      signature,
    })
  ).toString("base64url");
}

export function verifySignedReceipt(token: string): Record<string, unknown> | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const { payload, signature } = JSON.parse(decoded) as {
      payload: Record<string, unknown>;
      signature: string;
    };

    const expectedSignature = crypto
      .createHmac("sha256", RECEIPT_SIGNING_KEY)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (expectedSignature !== signature) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function verifyPaymentClaim(
  input: {
    reference: string;
    expectedAmountMinor?: number;
    expectedCurrency?: string;
    expectedRecipientId?: string;
    expectedOrderRef?: string;
  },
  transactions: TransactionRecord[] = DEMO_TRANSACTIONS
): VerificationResult {
  if (!input.reference) {
    return {
      outcome: "UNVERIFIED_RECEIPT",
      explanation: "No payment reference was supplied.",
      details: { reason: "missing_reference" },
    };
  }

  const payment = transactions.find((entry) => entry.transactionRef === input.reference);

  if (!payment || !payment.isAvailable) {
    return {
      outcome: "UNVERIFIED_RECEIPT",
      explanation: "The banking service could not confirm this payment record.",
      details: {
        reason: "bank_unavailable_or_missing_record",
        reference: input.reference,
      },
    };
  }

  if (payment.status === "PENDING") {
    return {
      outcome: "PENDING_PAYMENT",
      explanation: "This payment is still pending and cannot be treated as completed.",
      details: { transactionRef: payment.transactionRef, status: payment.status },
    };
  }

  if (payment.status === "FAILED") {
    return {
      outcome: "SUSPICIOUS_RECEIPT",
      explanation: "This payment failed and should not be treated as received.",
      details: { transactionRef: payment.transactionRef, status: payment.status },
    };
  }

  if (payment.status === "REVERSED") {
    return {
      outcome: "SUSPICIOUS_RECEIPT",
      explanation: "This payment was reversed and is no longer valid evidence of completed payment.",
      details: { transactionRef: payment.transactionRef, status: payment.status },
    };
  }

  if (payment.status !== "SUCCESS") {
    return {
      outcome: "UNVERIFIED_RECEIPT",
      explanation: "The current payment status is not confirmed as successful.",
      details: { transactionRef: payment.transactionRef, status: payment.status },
    };
  }

  if (payment.fulfilledByOrderRef && payment.fulfilledByOrderRef !== input.expectedOrderRef) {
    return {
      outcome: "PREVIOUSLY_USED_PAYMENT",
      explanation: "This payment has already been used to fulfil another order.",
      details: {
        transactionRef: payment.transactionRef,
        fulfilledByOrderRef: payment.fulfilledByOrderRef,
      },
    };
  }

  if (input.expectedRecipientId && payment.recipientId !== input.expectedRecipientId) {
    return {
      outcome: "WRONG_RECIPIENT",
      explanation: "The payment was sent to a different recipient than the expected merchant account.",
      details: {
        expectedRecipientId: input.expectedRecipientId,
        actualRecipientId: payment.recipientId,
      },
    };
  }

  if (input.expectedAmountMinor !== undefined && payment.amountMinor !== input.expectedAmountMinor) {
    return {
      outcome: "UNDERPAYMENT",
      explanation: "The payment amount does not match the expected amount for this order.",
      details: {
        expectedAmountMinor: input.expectedAmountMinor,
        actualAmountMinor: payment.amountMinor,
      },
    };
  }

  if (input.expectedCurrency && payment.currency !== input.expectedCurrency) {
    return {
      outcome: "SUSPICIOUS_RECEIPT",
      explanation: "The payment currency differs from the expected order currency.",
      details: {
        expectedCurrency: input.expectedCurrency,
        actualCurrency: payment.currency,
      },
    };
  }

  return {
    outcome: "PAYMENT_VERIFIED",
    explanation: "The signed receipt matches the trusted payment record and the payment is currently successful.",
    details: {
      transactionRef: payment.transactionRef,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      recipientId: payment.recipientId,
      status: payment.status,
    },
  };
}

export function verifyOrderClaim(input: {
  orderRef: string;
  expectedAmountMinor?: number;
  expectedCurrency?: string;
  expectedRecipientId?: string;
  paymentReference?: string;
}): VerificationResult {
  if (!input.orderRef) {
    return {
      outcome: "ORDER_NOT_FOUND",
      explanation: "No order reference was supplied.",
      details: { reason: "missing_order_reference" },
    };
  }

  const order = DEMO_ORDERS.find((entry) => entry.orderRef === input.orderRef);

  if (!order) {
    return {
      outcome: "ORDER_NOT_FOUND",
      explanation: "This order reference does not match a known merchant order.",
      details: { orderRef: input.orderRef, reason: "order_missing" },
    };
  }

  if (input.expectedAmountMinor !== undefined && order.amountMinor !== input.expectedAmountMinor) {
    return {
      outcome: "ORDER_MISMATCH",
      explanation: "The order amount does not match the expected transaction value.",
      details: {
        orderRef: order.orderRef,
        expectedAmountMinor: input.expectedAmountMinor,
        actualAmountMinor: order.amountMinor,
      },
    };
  }

  if (input.expectedCurrency && order.currency !== input.expectedCurrency) {
    return {
      outcome: "ORDER_MISMATCH",
      explanation: "The order currency differs from the expected currency for this purchase.",
      details: {
        orderRef: order.orderRef,
        expectedCurrency: input.expectedCurrency,
        actualCurrency: order.currency,
      },
    };
  }

  if (input.expectedRecipientId && order.recipientId !== input.expectedRecipientId) {
    return {
      outcome: "ORDER_MISMATCH",
      explanation: "The order was created for a different payment recipient than the expected account.",
      details: {
        orderRef: order.orderRef,
        expectedRecipientId: input.expectedRecipientId,
        actualRecipientId: order.recipientId,
      },
    };
  }

  if (order.status === "CANCELLED") {
    return {
      outcome: "ORDER_MISMATCH",
      explanation: "This order has been cancelled and cannot be treated as an active fulfilment.",
      details: { orderRef: order.orderRef, status: order.status },
    };
  }

  if (order.status === "PENDING" || order.status === "OPEN") {
    return {
      outcome: "ORDER_UNPAID",
      explanation: "This order has not yet been fully paid and should not be released.",
      details: { orderRef: order.orderRef, status: order.status },
    };
  }

  if (order.status === "FULFILLED" && input.paymentReference && order.paymentTransactionRef !== input.paymentReference) {
    return {
      outcome: "ORDER_ALREADY_FULFILLED",
      explanation: "This order was already fulfilled with a different payment record.",
      details: {
        orderRef: order.orderRef,
        expectedPaymentRef: input.paymentReference,
        actualPaymentRef: order.paymentTransactionRef,
      },
    };
  }

  return {
    outcome: "ORDER_VERIFIED",
    explanation: "The merchant order matches the expected amount and recipient, and it is in a paid fulfilment state.",
    details: {
      orderRef: order.orderRef,
      merchantId: order.merchantId,
      amountMinor: order.amountMinor,
      currency: order.currency,
      status: order.status,
      paymentTransactionRef: order.paymentTransactionRef,
    },
  };
}

export function verifyMerchantConfirmation(input: {
  orderRef: string;
  reference: string;
  receiptToken?: string;
  expectedAmountMinor?: number;
  expectedCurrency?: string;
  expectedRecipientId?: string;
}) {
  if (!input.orderRef || !input.reference) {
    return {
      outcome: "ORDER_NOT_FOUND",
      explanation: "Both an order reference and payment reference are required for merchant release.",
      details: { reason: "missing_order_or_payment_reference" },
    };
  }

  if (!input.receiptToken) {
    return {
      outcome: "UNVERIFIED_RECEIPT",
      explanation: "The merchant must attach the signed receipt before confirming order release.",
      details: { reason: "missing_receipt_token" },
    };
  }

  const receiptPayload = verifySignedReceipt(input.receiptToken);

  if (!receiptPayload) {
    return {
      outcome: "SUSPICIOUS_RECEIPT",
      explanation: "The signed receipt is invalid or has been tampered with.",
      details: { reason: "invalid_signed_receipt" },
    };
  }

  const paymentResult = verifyPaymentClaim(
    {
      reference: input.reference,
      expectedAmountMinor: input.expectedAmountMinor,
      expectedCurrency: input.expectedCurrency,
      expectedRecipientId: input.expectedRecipientId,
      expectedOrderRef: input.orderRef,
    },
    DEMO_TRANSACTIONS
  );

  if (paymentResult.outcome !== "PAYMENT_VERIFIED") {
    return paymentResult;
  }

  const orderResult = verifyOrderClaim({
    orderRef: input.orderRef,
    expectedAmountMinor: input.expectedAmountMinor,
    expectedCurrency: input.expectedCurrency,
    expectedRecipientId: input.expectedRecipientId,
    paymentReference: input.reference,
  });

  if (orderResult.outcome !== "ORDER_VERIFIED") {
    return orderResult;
  }

  const receiptMatches =
    receiptPayload.transactionRef === input.reference &&
    receiptPayload.orderRef === input.orderRef &&
    receiptPayload.recipientId === input.expectedRecipientId &&
    Number(receiptPayload.amountMinor) === input.expectedAmountMinor &&
    receiptPayload.currency === input.expectedCurrency;

  if (!receiptMatches) {
    return {
      outcome: "SUSPICIOUS_RECEIPT",
      explanation: "The receipt evidence does not match the payment record, order reference, or expected merchant account.",
      details: {
        expectedReference: input.reference,
        expectedOrderRef: input.orderRef,
        receiptTransactionRef: receiptPayload.transactionRef,
        receiptOrderRef: receiptPayload.orderRef,
      },
    };
  }

  return {
    outcome: "ORDER_VERIFIED",
    explanation: "The merchant has matched the signed receipt, order, and payment reference before releasing the order.",
    details: {
      orderRef: input.orderRef,
      transactionRef: input.reference,
      receiptValidated: true,
      merchantReleaseApproved: true,
      amountMinor: input.expectedAmountMinor,
      currency: input.expectedCurrency,
      recipientId: input.expectedRecipientId,
    },
  };
}

export function assessMessageRisk(message: string) {
  const normalized = message.toLowerCase();
  const reasons: string[] = [];

  if (normalized.includes("otp") || normalized.includes("pin") || normalized.includes("password")) {
    reasons.push("The message requests sensitive login credentials, OTP codes, or one-time codes.");
  }

  if (normalized.includes("click here") || normalized.includes("verify now") || normalized.includes("securelink")) {
    reasons.push("The message includes a suspicious action or link prompt, such as 'click here' or 'verify now'.");
  }

  if (normalized.includes("urgent") || normalized.includes("immediately") || normalized.includes("act now")) {
    reasons.push("The message uses pressure or urgency to prompt quick action.");
  }

  if (reasons.length > 0) {
    return {
      status: "SUSPICIOUS",
      reasons,
      explanation: "This message contains warning signs commonly used in impersonation attempts.",
    };
  }

  return {
    status: "NO_OBVIOUS_WARNING_SIGNS",
    reasons: ["No obvious impersonation cues were detected, but authenticity remains unverified."],
    explanation: "The message does not obviously resemble an official Zenith communication, but the system cannot prove authenticity.",
  };
}
