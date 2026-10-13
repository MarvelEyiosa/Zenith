"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type ReceiptOcrWorker = {
  recognize: (image: File) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<void>;
};

type TesseractApi = {
  createWorker: (language: string) => Promise<ReceiptOcrWorker>;
};

declare global {
  interface Window {
    Tesseract?: TesseractApi;
  }
}

function loadTesseract() {
  if (window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }

  return new Promise<TesseractApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js";
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error("The OCR engine could not be initialized."));
      }
    };
    script.onerror = () => reject(new Error("The OCR engine could not be downloaded. Check your internet connection and try again."));
    document.head.appendChild(script);
  });
}

const demoScenarios = [
  {
    label: "Successful payment",
    payload: {
      reference: "TXN-1001",
      expectedAmountMinor: 35000,
      expectedCurrency: "NGN",
      expectedRecipientId: "ZENITH_MERCHANT_01",
    },
  },
  {
    label: "Edited receipt",
    payload: {
      reference: "TXN-1002",
      expectedAmountMinor: 35000,
      expectedCurrency: "NGN",
      expectedRecipientId: "ZENITH_MERCHANT_01",
    },
  },
  {
    label: "Pending payment",
    payload: {
      reference: "TXN-1003",
      expectedAmountMinor: 48000,
      expectedCurrency: "NGN",
      expectedRecipientId: "ZENITH_MERCHANT_01",
    },
  },
  {
    label: "Wrong recipient",
    payload: {
      reference: "TXN-1004",
      expectedAmountMinor: 28000,
      expectedCurrency: "NGN",
      expectedRecipientId: "ZENITH_MERCHANT_01",
    },
  },
];

const statusStyles: Record<string, string> = {
  PAYMENT_VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 border-amber-300",
  SUSPICIOUS_RECEIPT: "bg-rose-100 text-rose-800 border-rose-300",
  UNDERPAYMENT: "bg-orange-100 text-orange-800 border-orange-300",
  WRONG_RECIPIENT: "bg-orange-100 text-orange-800 border-orange-300",
  PREVIOUSLY_USED_PAYMENT: "bg-violet-100 text-violet-800 border-violet-300",
  UNVERIFIED_RECEIPT: "bg-slate-200 text-slate-800 border-slate-300",
  ORDER_VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  ORDER_NOT_FOUND: "bg-slate-200 text-slate-800 border-slate-300",
  ORDER_UNPAID: "bg-amber-100 text-amber-800 border-amber-300",
  ORDER_MISMATCH: "bg-orange-100 text-orange-800 border-orange-300",
  ORDER_ALREADY_FULFILLED: "bg-violet-100 text-violet-800 border-violet-300",
};

export default function Home() {
  const [reference, setReference] = useState("TXN-1001");
  const [expectedAmountMinor, setExpectedAmountMinor] = useState("35000");
  const [expectedCurrency, setExpectedCurrency] = useState("NGN");
  const [expectedRecipientId, setExpectedRecipientId] = useState("ZENITH_MERCHANT_01");
  const [result, setResult] = useState<null | {
    outcome: string;
    explanation: string;
    details: Record<string, unknown>;
  }>(null);
  const [orderReference, setOrderReference] = useState("ORD-106");
  const [orderAmountMinor, setOrderAmountMinor] = useState("175000");
  const [orderCurrency, setOrderCurrency] = useState("NGN");
  const [orderRecipientId, setOrderRecipientId] = useState("ZENITH_MERCHANT_01");
  const [paymentReferenceForOrder, setPaymentReferenceForOrder] = useState("TXN-1006");
  const [orderResult, setOrderResult] = useState<null | {
    outcome: string;
    explanation: string;
    details: Record<string, unknown>;
  }>(null);
  const [receiptToken, setReceiptToken] = useState(() => {
    const token = typeof window === "undefined" ? "" : "";
    return token;
  });
  const [merchantConfirmation, setMerchantConfirmation] = useState<null | {
    outcome: string;
    explanation: string;
    details: Record<string, unknown>;
  }>(null);
  const [isConfirmingMerchantRelease, setIsConfirmingMerchantRelease] = useState(false);
  const [messageText, setMessageText] = useState("Your Zenith account has been blocked. Reply with your OTP to reactivate it.");
  const [messageResult, setMessageResult] = useState<null | { status: string; explanation: string; reasons: string[] }>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploadResult, setUploadResult] = useState<null | {
    outcome: string;
    explanation: string;
    details: Record<string, unknown>;
  }>(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingMessage, setIsCheckingMessage] = useState(false);
  const [isCheckingOrder, setIsCheckingOrder] = useState(false);
  const [merchantData, setMerchantData] = useState<null | {
    orders: Array<{ orderRef: string; merchantId: string; customerId: string; amountMinor: number; currency: string; status: string; paymentTransactionRef?: string | null; recipientId: string }>;
    verificationAttempts: Array<{ transactionRef?: string; expectedAmountMinor?: number; expectedCurrency?: string; expectedRecipientId?: string; expectedOrderRef?: string; outcome: string; explanation: string; createdAt: string }>;
    orderAttempts: Array<{ orderRef?: string; expectedAmountMinor?: number; expectedCurrency?: string; expectedRecipientId?: string; paymentReference?: string; outcome: string; explanation: string; createdAt: string }>;
    messageAssessments: Array<{ status: string; explanation: string; rawMessage: string; reasons: string; createdAt: string }>;
  }>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/merchant");
        const data = await response.json();
        setMerchantData(data);
      } catch {
        setMerchantData(null);
      }
    };

    loadDashboard();
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    setResult(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          expectedAmountMinor: Number(expectedAmountMinor),
          expectedCurrency,
          expectedRecipientId,
        }),
      });

      const data = await response.json();
      setResult(data);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReceiptUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadProgress("");
    setReceiptToken("");
    let worker: ReceiptOcrWorker | null = null;

    try {
      const formData = new FormData();
      formData.append("expectedRecipientId", expectedRecipientId);
      const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file.name);

      if (isImage) {
        setUploadProgress("Loading OCR engine…");
        const tesseract = await loadTesseract();
        worker = await tesseract.createWorker("eng");
        setUploadProgress("Reading receipt text on this device…");
        const recognition = await worker.recognize(file);
        formData.append("fileName", file.name);
        formData.append("ocrText", recognition.data.text);
        formData.append("ocrConfidence", String(recognition.data.confidence));
      } else {
        formData.append("file", file);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setUploadResult(data);

      if (data.receiptToken) {
        setReceiptToken(data.receiptToken);
      }

      const isPartialReceipt = data.details?.reason === "receipt_fields_missing";
      if (data.reference || isPartialReceipt) {
        setReference(data.reference ?? "");
      }

      if (typeof data.amountMinor === "number" || isPartialReceipt) {
        setExpectedAmountMinor(typeof data.amountMinor === "number" ? String(data.amountMinor) : "");
      }

      if (data.currency || isPartialReceipt) {
        setExpectedCurrency(data.currency ?? "");
      }

      if (data.recipientId || isPartialReceipt) {
        setExpectedRecipientId(data.recipientId ?? "");
      }
    } catch (error) {
      setUploadResult({
        outcome: "UNVERIFIED_RECEIPT",
        explanation: error instanceof Error ? error.message : "Receipt OCR could not be completed.",
        details: { reason: "ocr_failed" },
      });
    } finally {
      if (worker) {
        await worker.terminate().catch(() => undefined);
      }
      setIsUploading(false);
      setUploadProgress("");
      event.target.value = "";
    }
  };

  const focusSection = (sectionId: string, input: HTMLElement | null) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => input?.focus(), 250);
  };

  const handleCheckMessage = async () => {
    setIsCheckingMessage(true);
    setMessageResult(null);

    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();
      setMessageResult(data);
    } finally {
      setIsCheckingMessage(false);
    }
  };

  const handleMerchantConfirmation = async () => {
    setIsConfirmingMerchantRelease(true);
    setMerchantConfirmation(null);

    try {
      const response = await fetch("/api/merchant-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: orderReference,
          reference: paymentReferenceForOrder,
          receiptToken,
          expectedAmountMinor: Number(orderAmountMinor),
          expectedCurrency: orderCurrency,
          expectedRecipientId: orderRecipientId,
        }),
      });

      const data = await response.json();
      setMerchantConfirmation(data);
    } finally {
      setIsConfirmingMerchantRelease(false);
    }
  };

  const handleVerifyOrder = async () => {
    setIsCheckingOrder(true);
    setOrderResult(null);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: orderReference,
          expectedAmountMinor: Number(orderAmountMinor),
          expectedCurrency: orderCurrency,
          expectedRecipientId: orderRecipientId,
          paymentReference: paymentReferenceForOrder,
        }),
      });

      const data = await response.json();
      setOrderResult(data);
    } finally {
      setIsCheckingOrder(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-md space-y-5">
        <header className="rounded-2xl border border-sky-500/30 bg-slate-900/80 p-4 shadow-2xl shadow-sky-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Zenith demo</p>
              <h1 className="mt-2 text-2xl font-bold text-white">Verify with Zenith</h1>
            </div>
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-300">
              Simulated data
            </span>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={() => scanInputRef.current?.click()}
            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/50 disabled:opacity-60"
            disabled={isUploading}
          >
            Scan receipt
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 disabled:opacity-60"
            disabled={isUploading}
          >
            {isUploading ? "Uploading…" : "Upload receipt"}
          </button>
          <button
            onClick={() => focusSection("message-check", messageInputRef.current)}
            className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
          >
            Check message
          </button>
          <button
            onClick={() => focusSection("payment-verification", referenceInputRef.current)}
            className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Enter reference
          </button>
        </section>

        <input ref={fileInputRef} type="file" accept=".json,.txt,image/*" onChange={handleReceiptUpload} className="hidden" />
        <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handleReceiptUpload} className="hidden" />
        {uploadProgress && <p role="status" className="text-center text-sm text-sky-200">{uploadProgress}</p>}

        <section id="payment-verification" className="scroll-mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Payment verification</h2>

          <div className="space-y-3">
            <label className="block text-sm text-slate-300">
              Payment reference
              <input
                ref={referenceInputRef}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-300">
                Amount
                <input
                  value={expectedAmountMinor}
                  onChange={(event) => setExpectedAmountMinor(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Currency
                <input
                  value={expectedCurrency}
                  onChange={(event) => setExpectedCurrency(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
            </div>

            <label className="block text-sm text-slate-300">
              Expected recipient
              <input
                value={expectedRecipientId}
                onChange={(event) => setExpectedRecipientId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <button
              onClick={handleVerify}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
              disabled={isVerifying}
            >
              {isVerifying ? "Checking payment…" : "Verify payment"}
            </button>
          </div>
        </section>

        <section id="message-check" className="scroll-mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Demo scenarios</h3>
          <div className="flex flex-wrap gap-2">
            {demoScenarios.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setReference(item.payload.reference);
                  setExpectedAmountMinor(String(item.payload.expectedAmountMinor));
                  setExpectedCurrency(item.payload.expectedCurrency);
                  setExpectedRecipientId(item.payload.expectedRecipientId);
                }}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {result && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusStyles[result.outcome] ?? "bg-slate-200 text-slate-800"}`}>
              {result.outcome.replace(/_/g, " ")}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-white">Verification result</h3>
            <p className="mt-2 text-sm text-slate-300">{result.explanation}</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              {Object.entries(result.details).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 border-b border-slate-800 pb-1">
                  <span className="text-slate-400">{key}</span>
                  <span className="text-right text-slate-200">{String(value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {uploadResult && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusStyles[uploadResult.outcome] ?? "bg-slate-200 text-slate-800"}`}>
              {uploadResult.outcome.replace(/_/g, " ")}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-white">Receipt upload result</h3>
            <p className="mt-2 text-sm text-slate-300">{uploadResult.explanation}</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              {Object.entries(uploadResult.details).filter(([key]) => key !== "ocrPreview").map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 border-b border-slate-800 pb-1">
                  <span className="text-slate-400">{key}</span>
                  <span className="text-right text-slate-200">{String(value)}</span>
                </div>
              ))}
              {typeof uploadResult.details.ocrPreview === "string" && (
                <details className="pt-1">
                  <summary className="cursor-pointer text-sky-300">Show recognized text</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-2 text-[11px] text-slate-300">
                    {uploadResult.details.ocrPreview}
                  </pre>
                </details>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Merchant fulfilment check</h2>

          <div className="space-y-3">
            <label className="block text-sm text-slate-300">
              Order reference
              <input
                value={orderReference}
                onChange={(event) => setOrderReference(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-300">
                Order amount
                <input
                  value={orderAmountMinor}
                  onChange={(event) => setOrderAmountMinor(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Currency
                <input
                  value={orderCurrency}
                  onChange={(event) => setOrderCurrency(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
            </div>

            <label className="block text-sm text-slate-300">
              Expected recipient
              <input
                value={orderRecipientId}
                onChange={(event) => setOrderRecipientId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Payment reference
              <input
                value={paymentReferenceForOrder}
                onChange={(event) => setPaymentReferenceForOrder(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <button
              onClick={handleVerifyOrder}
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
              disabled={isCheckingOrder}
            >
              {isCheckingOrder ? "Checking fulfilment…" : "Verify order fulfilment"}
            </button>
          </div>

          {orderResult && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3">
              <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusStyles[orderResult.outcome] ?? "bg-slate-200 text-slate-800"}`}>
                {orderResult.outcome.replace(/_/g, " ")}
              </div>
              <p className="mt-2 text-sm text-slate-200">{orderResult.explanation}</p>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                {Object.entries(orderResult.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 border-b border-slate-800 pb-1">
                    <span className="text-slate-400">{key}</span>
                    <span className="text-right text-slate-200">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Merchant dashboard</h2>

          {merchantData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-2">
                  <div className="text-slate-400">Orders</div>
                  <div className="mt-1 text-lg font-semibold text-white">{merchantData.orders.length}</div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-2">
                  <div className="text-slate-400">Paid</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-300">{merchantData.orders.filter((order) => order.status === "PAID" || order.status === "FULFILLED").length}</div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-2">
                  <div className="text-slate-400">Alerts</div>
                  <div className="mt-1 text-lg font-semibold text-amber-300">{merchantData.messageAssessments.filter((item) => item.status === "SUSPICIOUS").length}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Open order ledger</h3>
                {merchantData.orders.map((order) => (
                  <div key={order.orderRef} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">{order.orderRef}</span>
                      <span className={`rounded-full border px-2 py-0.5 ${statusStyles[order.status] ?? "bg-slate-200 text-slate-800"}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span>{order.amountMinor / 100} {order.currency}</span>
                      <span>{order.paymentTransactionRef ?? "unpaid"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent verification trail</h3>
                {merchantData.verificationAttempts.map((attempt) => (
                  <div key={`${attempt.createdAt}-${attempt.transactionRef ?? "order"}`} className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-300">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-white">{attempt.transactionRef ?? attempt.expectedOrderRef ?? "n/a"}</span>
                      <span className={`rounded-full border px-2 py-0.5 ${statusStyles[attempt.outcome] ?? "bg-slate-200 text-slate-800"}`}>
                        {attempt.outcome}
                      </span>
                    </div>
                    <p className="mt-1">{attempt.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-300">Loading merchant ledger…</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Merchant release confirmation</h2>

          <div className="space-y-3">
            <label className="block text-sm text-slate-300">
              Receipt token
              <textarea
                value={receiptToken}
                onChange={(event) => setReceiptToken(event.target.value)}
                placeholder="Paste signed receipt"
                className="mt-1 h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </label>

            <button
              onClick={handleMerchantConfirmation}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
              disabled={isConfirmingMerchantRelease}
            >
              {isConfirmingMerchantRelease ? "Confirming release…" : "Confirm merchant release"}
            </button>
          </div>

          {merchantConfirmation && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3">
              <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusStyles[merchantConfirmation.outcome] ?? "bg-slate-200 text-slate-800"}`}>
                {merchantConfirmation.outcome.replace(/_/g, " ")}
              </div>
              <p className="mt-2 text-sm text-slate-200">{merchantConfirmation.explanation}</p>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                {Object.entries(merchantConfirmation.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 border-b border-slate-800 pb-1">
                    <span className="text-slate-400">{key}</span>
                    <span className="text-right text-slate-200">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Message risk assessment</h2>
          <textarea
            ref={messageInputRef}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            className="h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            onClick={handleCheckMessage}
            className="mt-3 w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
            disabled={isCheckingMessage}
          >
            {isCheckingMessage ? "Assessing message…" : "Check message"}
          </button>

          {messageResult && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3">
              <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${messageResult.status === "SUSPICIOUS" ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}`}>
                {messageResult.status}
              </div>
              <p className="mt-2 text-sm text-slate-200">{messageResult.explanation}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
                {messageResult.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
