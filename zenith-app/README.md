# Verify with Zenith

A mobile-first hackathon prototype for helping merchants and customers verify payment claims, assess suspicious bank communications, and understand evidence before acting.

## Product goal

This demo helps users answer one question quickly: "Is this payment claim trustworthy enough to act on?"

The product uses:
- signed digital receipts
- simulated banking status checks
- receipt and payment comparison logic
- message risk assessment for SMS, email, and WhatsApp-style impersonation attempts

## Current implementation status

This version is an MVP prototype built in Next.js and TypeScript. It includes:
- a merchant verification flow
- a payment-reference verification screen
- a risk-scoring style message checker
- simulated data labels for demo scenarios
- trust-first verification logic that never marks a payment as successful without a valid record

## Architecture summary

- Frontend: Next.js app router + TypeScript + Tailwind
- Backend: API routes in `src/app/api`
- Trust logic: `src/lib/verification.ts`
- Data layer: planned for PostgreSQL/Prisma in a future production-ready step
- Bank simulation: in-memory demo transaction records as a stub for a real adapter

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment variables

Create a `.env.local` file from this example:

```bash
cp .env.example .env.local
```

Example content:

```env
RECEIPT_SIGNING_KEY=demo-zenith-signing-key
NEXT_PUBLIC_APP_NAME=Verify with Zenith
NEXT_PUBLIC_DEMO_MODE=true
```

## Demo scenarios included

The current prototype supports demo cases such as:
- successful payment
- pending payment
- wrong recipient
- previous usage / duplicate fulfilment
- suspicious message with urgent OTP request
- unavailable banking record

## Important limitations

This is a prototype and not a production banking integration.

- simulated banking data only
- no real OCR pipeline yet
- no real database persistence yet
- no production cryptographic key management
- demo-only verification labels to avoid confused trust signals

## Security notes

This prototype follows the trust model required by the brief:
- server-held signing logic
- explicit validation before success states
- no green success result when the banking service is unavailable
- evidence-based explanations rather than confident fraud claims

## Suggested next steps

1. Add Prisma + PostgreSQL schema for real persistence.
2. Add a proper banking adapter interface for real integration.
3. Add file upload and OCR pipeline for screenshot analysis.
4. Add order-matching and merchant dashboard enhancements.
5. Add automated tests for verification rules and duplicate fulfilment.

## Verification command

The project was build-validated with:

```bash
npm run build
```
