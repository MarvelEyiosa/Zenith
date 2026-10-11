import assert from "node:assert/strict";
import test from "node:test";

import {
  assessMessageRisk,
  createSignedReceipt,
  verifyMerchantConfirmation,
  verifyOrderClaim,
  verifyPaymentClaim,
} from "./verification";

test("verifyPaymentClaim approves a valid payment for the expected merchant account", () => {
  const result = verifyPaymentClaim(
    {
      reference: "TXN-1001",
      expectedAmountMinor: 35000,
      expectedCurrency: "NGN",
      expectedRecipientId: "ZENITH_MERCHANT_01",
      expectedOrderRef: "ORD-101",
    },
    [
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
    ]
  );

  assert.equal(result.outcome, "PAYMENT_VERIFIED");
});

test("verifyPaymentClaim rejects a payment sent to the wrong recipient", () => {
  const result = verifyPaymentClaim(
    {
      reference: "TXN-1004",
      expectedAmountMinor: 28000,
      expectedCurrency: "NGN",
      expectedRecipientId: "ZENITH_MERCHANT_01",
    },
    [
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
    ]
  );

  assert.equal(result.outcome, "WRONG_RECIPIENT");
});

test("verifyOrderClaim rejects an unpaid order before release", () => {
  const result = verifyOrderClaim({
    orderRef: "ORD-106",
    expectedAmountMinor: 175000,
    expectedCurrency: "NGN",
    expectedRecipientId: "ZENITH_MERCHANT_01",
  });

  assert.equal(result.outcome, "ORDER_UNPAID");
});

test("assessMessageRisk flags impersonation cues such as OTP and urgent action", () => {
  const result = assessMessageRisk("Your Zenith account has been blocked. Reply with your OTP immediately.");

  assert.equal(result.status, "SUSPICIOUS");
  assert.ok(result.reasons.some((reason) => reason.toLowerCase().includes("otp")));
});

test("verifyMerchantConfirmation approves when payment, order, and signed receipt align", () => {
  const receiptToken = createSignedReceipt({
    transactionRef: "TXN-1001",
    issuerId: "ZENITH_BANK",
    amountMinor: 35000,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    orderRef: "ORD-101",
  });

  const result = verifyMerchantConfirmation({
    orderRef: "ORD-101",
    reference: "TXN-1001",
    receiptToken,
    expectedAmountMinor: 35000,
    expectedCurrency: "NGN",
    expectedRecipientId: "ZENITH_MERCHANT_01",
  });

  assert.equal(result.outcome, "ORDER_VERIFIED");
  assert.equal(result.details.merchantReleaseApproved, true);
});

test("verifyMerchantConfirmation rejects a receipt that does not match the order", () => {
  const receiptToken = createSignedReceipt({
    transactionRef: "TXN-1002",
    issuerId: "ZENITH_BANK",
    amountMinor: 3500,
    currency: "NGN",
    recipientId: "ZENITH_MERCHANT_01",
    orderRef: "ORD-102",
  });

  const result = verifyMerchantConfirmation({
    orderRef: "ORD-101",
    reference: "TXN-1001",
    receiptToken,
    expectedAmountMinor: 35000,
    expectedCurrency: "NGN",
    expectedRecipientId: "ZENITH_MERCHANT_01",
  });

  assert.equal(result.outcome, "SUSPICIOUS_RECEIPT");
});
