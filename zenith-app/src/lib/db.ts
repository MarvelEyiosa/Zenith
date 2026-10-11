import fs from "node:fs/promises";
import path from "node:path";

import { DEMO_ORDERS, OrderRecord, PaymentStatus, TransactionRecord } from "@/lib/verification";

const demoTransactions: TransactionRecord[] = [
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

const DATA_FILE = path.join(process.cwd(), "data", "zenith-store.json");

type PersistedState = {
  transactions: TransactionRecord[];
  orders: OrderRecord[];
  verificationAttempts: Array<{
    transactionRef?: string;
    expectedAmountMinor?: number;
    expectedCurrency?: string;
    expectedRecipientId?: string;
    expectedOrderRef?: string;
    outcome: string;
    explanation: string;
    createdAt: string;
  }>;
  orderAttempts: Array<{
    orderRef?: string;
    expectedAmountMinor?: number;
    expectedCurrency?: string;
    expectedRecipientId?: string;
    paymentReference?: string;
    outcome: string;
    explanation: string;
    createdAt: string;
  }>;
  messageAssessments: Array<{
    status: string;
    explanation: string;
    rawMessage: string;
    reasons: string;
    createdAt: string;
  }>;
};

async function ensureDataStore() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    try {
      await fs.access(DATA_FILE);
    } catch {
      const initialState: PersistedState = {
        transactions: demoTransactions,
        orders: DEMO_ORDERS,
        verificationAttempts: [],
        orderAttempts: [],
        messageAssessments: [],
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(initialState, null, 2), "utf8");
    }
  } catch {
    // Fallback remains in-memory if the filesystem is not writable.
  }
}

async function readState(): Promise<PersistedState> {
  await ensureDataStore();

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as PersistedState;

    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : demoTransactions,
      orders: Array.isArray(parsed.orders) ? parsed.orders : DEMO_ORDERS,
      verificationAttempts: Array.isArray(parsed.verificationAttempts) ? parsed.verificationAttempts : [],
      orderAttempts: Array.isArray(parsed.orderAttempts) ? parsed.orderAttempts : [],
      messageAssessments: Array.isArray(parsed.messageAssessments) ? parsed.messageAssessments : [],
    };
  } catch {
    return {
      transactions: demoTransactions,
      orders: DEMO_ORDERS,
      verificationAttempts: [],
      orderAttempts: [],
      messageAssessments: [],
    };
  }
}

async function writeState(nextState: PersistedState) {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(nextState, null, 2), "utf8");
  } catch {
    // No-op if persistence fails; in-memory verification still works.
  }
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  const state = await readState();
  return state.transactions;
}

export async function addVerificationAttempt(input: {
  transactionRef?: string;
  expectedAmountMinor?: number;
  expectedCurrency?: string;
  expectedRecipientId?: string;
  expectedOrderRef?: string;
  outcome: string;
  explanation: string;
}) {
  const state = await readState();
  state.verificationAttempts.push({
    transactionRef: input.transactionRef,
    expectedAmountMinor: input.expectedAmountMinor,
    expectedCurrency: input.expectedCurrency,
    expectedRecipientId: input.expectedRecipientId,
    expectedOrderRef: input.expectedOrderRef,
    outcome: input.outcome,
    explanation: input.explanation,
    createdAt: new Date().toISOString(),
  });

  await writeState(state);
}

export async function addMessageAssessment(input: {
  status: string;
  explanation: string;
  rawMessage: string;
  reasons: string;
}) {
  const state = await readState();
  state.messageAssessments.push({
    status: input.status,
    explanation: input.explanation,
    rawMessage: input.rawMessage,
    reasons: input.reasons,
    createdAt: new Date().toISOString(),
  });

  await writeState(state);
}

export async function getOrders(): Promise<OrderRecord[]> {
  const state = await readState();
  return state.orders;
}

export async function getDashboardSummary() {
  const state = await readState();

  return {
    orders: state.orders,
    verificationAttempts: state.verificationAttempts.slice(-6).reverse(),
    orderAttempts: state.orderAttempts.slice(-6).reverse(),
    messageAssessments: state.messageAssessments.slice(-4).reverse(),
  };
}

export async function addOrderAttempt(input: {
  orderRef?: string;
  expectedAmountMinor?: number;
  expectedCurrency?: string;
  expectedRecipientId?: string;
  paymentReference?: string;
  outcome: string;
  explanation: string;
}) {
  const state = await readState();
  state.orderAttempts.push({
    orderRef: input.orderRef,
    expectedAmountMinor: input.expectedAmountMinor,
    expectedCurrency: input.expectedCurrency,
    expectedRecipientId: input.expectedRecipientId,
    paymentReference: input.paymentReference,
    outcome: input.outcome,
    explanation: input.explanation,
    createdAt: new Date().toISOString(),
  });

  await writeState(state);
}

