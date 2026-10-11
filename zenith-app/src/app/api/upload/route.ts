import { NextResponse } from "next/server";

function extractValue(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? match[1] : undefined;
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
      extractValue(normalizedText, /TXN-[A-Z0-9-]+/i) ||
      extractValue(normalizedText, /(?:transaction\s*(?:reference|ref|id)|payment\s*(?:reference|ref)|reference|ref)\s*[:#-]\s*([A-Z0-9-]+)/i);

    const amountText = extractValue(normalizedText, /amountMinor[^\d]*(\d+)/i);
    const majorAmountText =
      extractValue(normalizedText, /(?:amount(?:\s+paid)?|total(?:\s+amount)?)\s*[:#-]?\s*(?:(?:NGN|GHS|KES|USD|GBP|EUR|N)\s*)?([\d,]+(?:\.\d{1,2})?)/i) ||
      extractValue(normalizedText, /[\u20A6$]\s*([\d,]+(?:\.\d{1,2})?)/);
    const amountMinor = parsed && typeof parsed.amountMinor === "number"
      ? parsed.amountMinor
      : amountText
        ? Number(amountText)
        : majorAmountText
          ? Math.round(Number(majorAmountText.replace(/,/g, "")) * 100)
          : undefined;

    const currency =
      (parsed && typeof parsed.currency === "string" && parsed.currency) ||
      extractValue(normalizedText, /currency[^A-Z]*([A-Z]{3})/i) ||
      extractValue(normalizedText, /\b(NGN|GHS|KES|USD|GBP|EUR)\b/i) ||
      (/\u20A6/.test(normalizedText) ? "NGN" : undefined);

    const recipientId =
      (parsed && typeof parsed.recipientId === "string" && parsed.recipientId) ||
      extractValue(normalizedText, /recipientId[^A-Z0-9_]*([A-Z0-9_]+)/i) ||
      extractValue(normalizedText, /(?:recipient(?:\s*(?:id|name|account))?|beneficiary(?:\s*(?:id|name|account))?|credited\s+to|paid\s+to)\s*[:#-]\s*([^\r\n]+)/i);

    const orderRef =
      (parsed && typeof parsed.orderRef === "string" && parsed.orderRef) ||
      extractValue(normalizedText, /ORD-[A-Z0-9-]+/i);

    if (!reference || !amountMinor || amountMinor <= 0 || !currency || !recipientId) {
      return NextResponse.json(
        {
          outcome: "UNVERIFIED_RECEIPT",
          explanation: "Some receipt fields could not be read. Review the extracted values and enter any missing details manually.",
          details: { fileName, reason: "receipt_fields_missing", ...(ocrConfidence === undefined ? {} : { ocrConfidence }) },
          ...(reference ? { reference } : {}),
          ...(amountMinor === undefined ? {} : { amountMinor }),
          ...(currency ? { currency } : {}),
          ...(recipientId ? { recipientId } : {}),
        },
        { status: 422 }
      );
    }

    const receiptToken = parsed && typeof parsed.receiptToken === "string"
      ? parsed.receiptToken
      : undefined;

    return NextResponse.json({
      outcome: "UNVERIFIED_RECEIPT",
      explanation: "Receipt fields were extracted. Review them, then verify the payment against transaction records before treating it as authentic.",
      details: {
        fileName,
        reference,
        amountMinor,
        currency,
        recipientId,
        orderRef,
        source: isImage ? "on-device OCR" : "receipt file",
        ...(ocrConfidence === undefined ? {} : { ocrConfidence }),
      },
      ...(receiptToken ? { receiptToken } : {}),
      reference,
      amountMinor,
      currency,
      recipientId,
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
