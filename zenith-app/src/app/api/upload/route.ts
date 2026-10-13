import { NextResponse } from "next/server";

import { getTransactions } from "@/lib/db";
import { verifyPaymentClaim } from "@/lib/verification";

function extractValue(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? match[1] : undefined;
}

function extractLabeledValue(text: string, labels: string[]) {
  const escapedLabels = labels
    .sort((left, right) => right.length - left.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`^\\s*(?:${escapedLabels.join("|")})(?:\\s*[:=#-]\\s*|\\s+)(.+?)\\s*$`, "i");

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const ocrTextValue = formData.get("ocrText");
    const fileNameValue = formData.get("fileName");
    const fileName = file instanceof File
      ? file.name
      : typeof fileNameValue === "string"
        ? fileNameValue
        : "";

    if (!fileName || (!(file instanceof File) && typeof ocrTextValue !== "string")) {
      return NextResponse.json(
        {
          outcome: "UNVERIFIED_RECEIPT",
          explanation: "No receipt file was supplied for upload.",
          details: { reason: "missing_file" },
        },
        { status: 400 }
      );
    }

    const extension = fileName.split(".").pop()?.toLowerCase();
    const isImage = ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"].includes(extension ?? "");
    const isTextFile = extension === "json" || extension === "txt";
    if ((!isImage && !isTextFile) || (isImage && typeof ocrTextValue !== "string")) {
      return NextResponse.json(
        {
          outcome: "UNVERIFIED_RECEIPT",
          explanation: "This file type is not supported. Upload an image for OCR or a JSON/text receipt file.",
          details: { fileName, reason: "unsupported_file_type" },
        },
        { status: 415 }
      );
    }

    const rawText = isImage
      ? ocrTextValue as string
      : new TextDecoder("utf-8").decode(await (file as File).arrayBuffer());
    const normalizedText = rawText.trim();
    const ocrConfidenceValue = formData.get("ocrConfidence");
    const ocrConfidence = typeof ocrConfidenceValue === "string" && Number.isFinite(Number(ocrConfidenceValue))
      ? Number(ocrConfidenceValue)
      : undefined;

    let parsed: Record<string, unknown> | null = null;
    if (normalizedText) {
      try {
        parsed = JSON.parse(normalizedText) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }

    const reference =
      (parsed && typeof parsed.transactionRef === "string" && parsed.transactionRef) ||
      extractLabeledValue(normalizedText, [
        "transaction reference", "transaction ref", "transaction id", "transaction no", "transaction number",
        "payment reference", "payment ref", "payment id", "transfer reference", "transfer ref", "transfer id",
        "reference no", "reference number", "reference id", "ref no", "ref number", "ref id", "reference", "ref",
        "rrn", "utr",
      ]) ||
      extractValue(normalizedText, /TXN-[A-Z0-9-]+/i);
    const sessionId =
      (parsed && typeof parsed.sessionId === "string" && parsed.sessionId) ||
      extractLabeledValue(normalizedText, ["nip session id", "session id", "session reference", "session ref", "session no", "session number"]);

    const amountMinorText = parsed && typeof parsed.amountMinor === "number"
      ? String(parsed.amountMinor)
      : extractLabeledValue(normalizedText, ["amount minor", "amountMinor"]);
    const amountLabelValue = extractLabeledValue(normalizedText, ["amount paid", "total amount", "amount", "total", "paid"]);
    const amountNumberText = amountLabelValue?.match(/[\d][\d,]*(?:\.\d{1,2})?/)?.[0];
    const amountMinor = parsed && typeof parsed.amountMinor === "number"
      ? parsed.amountMinor
      : amountMinorText
        ? Number(amountMinorText)
        : amountNumberText
          ? Math.round(Number(amountNumberText.replace(/,/g, "")) * 100)
          : undefined;

    const detectedCurrency =
      (parsed && typeof parsed.currency === "string" && parsed.currency) ||
      extractLabeledValue(normalizedText, ["currency", "currency code"])?.match(/\b(NGN|GHS|KES|USD|GBP|EUR)\b/i)?.[1] ||
      extractValue(normalizedText, /\b(NGN|GHS|KES|USD|GBP|EUR)\b/i) ||
      (/\u20A6|\bN(?:IGERIAN)?\s+NAIRA\b/i.test(`${normalizedText}\n${amountLabelValue ?? ""}`) ? "NGN" : undefined) ||
      (/\bN\s*[\d,]+(?:\.\d{1,2})?/i.test(amountLabelValue ?? "") ? "NGN" : undefined);
    const inferredNgn = !detectedCurrency && (/\bNIGERIA\b/i.test(normalizedText) || /\bMONIEPOINT(?:\s+MICROFINANCE)?(?:\s+BANK)?\b/i.test(normalizedText));
    const currency = detectedCurrency || (inferredNgn ? "NGN" : undefined);

    const recipientId =
      (parsed && typeof parsed.recipientId === "string" && parsed.recipientId) ||
      extractLabeledValue(normalizedText, ["recipient id", "recipient account", "beneficiary id", "beneficiary account", "merchant id"]);

    const recipientName =
      (parsed && typeof parsed.recipientName === "string" && parsed.recipientName) ||
      extractLabeledValue(normalizedText, ["beneficiary name", "recipient name", "receiver name", "beneficiary", "recipient", "receiver"]);

    const claimedStatusText = extractLabeledValue(normalizedText, ["transaction status", "payment status", "status"]);
    const claimedStatus = claimedStatusText && /pending|processing|in progress/i.test(claimedStatusText)
      ? "PENDING"
      : claimedStatusText && /revers|refund/i.test(claimedStatusText)
        ? "REVERSED"
        : claimedStatusText && /fail|declin|unsuccess/i.test(claimedStatusText)
          ? "FAILED"
          : claimedStatusText && /success|complete|paid/i.test(claimedStatusText)
            ? "SUCCESS"
            : "NOT_READ";
    const imageReadability = ocrConfidence === undefined
      ? "NOT_APPLICABLE"
      : ocrConfidence >= 80
        ? `HIGH (${ocrConfidence}%)`
        : ocrConfidence >= 50
          ? `MEDIUM (${ocrConfidence}%)`
          : `LOW (${ocrConfidence}%)`;

    const orderRef =
      (parsed && typeof parsed.orderRef === "string" && parsed.orderRef) ||
      extractLabeledValue(normalizedText, ["order reference", "order ref", "order id", "order no", "order number"]) ||
      extractValue(normalizedText, /ORD-[A-Z0-9-]+/i);

    const missingFields = [
      !reference && "transaction reference",
      (!amountMinor || amountMinor <= 0) && "amount",
      !currency && "currency",
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          outcome: "UNVERIFIED_RECEIPT",
          explanation: "Some receipt details could not be read. Enter the missing transaction reference, amount, or currency manually.",
          details: {
            fileName,
            reason: "receipt_fields_missing",
            missingFields: missingFields.join(", "),
            ocrPreview: normalizedText.slice(0, 500) || "No text was detected in the image.",
            ...(reference ? { reference } : {}),
            ...(amountMinor === undefined ? {} : { amountMinor }),
            ...(currency ? { currency } : {}),
            ...(recipientId ? { recipientId } : {}),
            ...(recipientName ? { recipientName } : {}),
            claimedStatus,
            imageReadability,
            ...(ocrConfidence === undefined ? {} : { ocrConfidence }),
          },
          ...(reference ? { reference } : {}),
          ...(amountMinor === undefined ? {} : { amountMinor }),
          ...(currency ? { currency } : {}),
          ...(recipientId ? { recipientId } : {}),
        },
        { status: 422 }
      );
    }

    const expectedRecipientIdValue = formData.get("expectedRecipientId");
    const expectedRecipientId = typeof expectedRecipientIdValue === "string" && expectedRecipientIdValue.trim()
      ? expectedRecipientIdValue.trim()
      : undefined;
    const transactions = await getTransactions();
    const recordResult = expectedRecipientId
      ? verifyPaymentClaim(
          { reference, expectedAmountMinor: amountMinor, expectedCurrency: currency, expectedRecipientId },
          transactions
        )
      : {
          outcome: "UNVERIFIED_RECEIPT" as const,
          explanation: "Set the merchant's expected recipient before checking the payment record.",
          details: { reason: "expected_recipient_missing" },
        };
    const matchedRecord = transactions.find((transaction) => transaction.transactionRef === reference);
    const claimedRecordStatus = matchedRecord?.isAvailable ? claimedStatus : "NOT_CHECKED";
    const statusConflict = Boolean(
      matchedRecord?.isAvailable &&
      claimedStatus !== "NOT_READ" &&
      matchedRecord.status !== claimedStatus
    );
    const outcome = statusConflict ? "SUSPICIOUS_RECEIPT" : recordResult.outcome;
    const explanation = statusConflict
      ? `The receipt claims ${claimedStatus.toLowerCase()}, but the trusted transaction record says ${matchedRecord?.status.toLowerCase()}.`
      : recordResult.outcome === "PAYMENT_VERIFIED"
        ? "The reference, amount, currency, recipient, and successful status match a trusted transaction record in the local demo ledger."
        : recordResult.explanation;

    const receiptToken = parsed && typeof parsed.receiptToken === "string"
      ? parsed.receiptToken
      : undefined;

    return NextResponse.json({
      outcome,
      explanation,
      details: {
        fileName,
        reference,
        amountMinor,
        currency,
        ...(recipientId ? { recipientId } : {}),
        ...(recipientName ? { recipientName } : {}),
        ...(sessionId ? { sessionId } : {}),
        orderRef,
        source: isImage ? "on-device OCR" : "receipt file",
        claimedStatus,
        matchedRecordStatus: claimedRecordStatus,
        recordCheck: outcome,
        recordSource: "local demo ledger; not a live bank connection",
        imageReadability,
        ...(statusConflict ? { statusConflict: true } : {}),
        ...(inferredNgn ? { currencySource: "inferred from Nigerian bank details" } : {}),
        ...(ocrConfidence === undefined ? {} : { ocrConfidence }),
      },
      ...(receiptToken ? { receiptToken } : {}),
      reference,
      amountMinor,
      currency,
      ...(recipientId ? { recipientId } : {}),
      orderRef,
    });
  } catch {
    return NextResponse.json(
      {
        outcome: "UNVERIFIED_RECEIPT",
        explanation: "The upload could not be processed.",
        details: { reason: "upload_error" },
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "upload-ready",
    supportedFormats: [".json", ".txt", "image OCR"],
  });
}
