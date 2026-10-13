# Verify with Zenith
## MTE Hackathon Pitch Deck Outline

**Tagline:** Verify the payment, not just the receipt.

**One-line pitch:** Verify with Zenith helps merchants check payment claims against trusted transaction records before releasing goods or services.

## Slide 1: Title

**Verify with Zenith**  
**Verify the payment, not just the receipt.**

A trust layer for merchants receiving digital payments.

## Slide 2: Problem and Opportunity

Digital payments are fast, but payment confirmation can still be manual. A buyer may show a screenshot or receipt while a merchant must decide whether to release an item before independently confirming that funds arrived.

This creates friction for both sides: honest customers wait, merchants face pressure to trust visual evidence, and a convincing receipt can be difficult to assess quickly.

**Opportunity:** Give merchants a simple way to check payment claims against transaction data they are authorized to access, rather than relying on appearance or manual bank-app checks.

**Evidence to gather:** Interview merchants about how they confirm transfers, how long confirmation takes, and what happens when payment proof is disputed. Do not include unsourced fraud or market-size statistics.

## Slide 3: Target Users

**Primary users:** Small and medium-sized merchants receiving bank transfers and fulfilling orders in person or online.

**Other beneficiaries:** Marketplaces, delivery and fulfilment teams, payment service providers, and customers who want faster confirmation.

**Initial use case:** A merchant receives a payment claim and checks the reference, amount, currency, and intended recipient before releasing an order.

## Slide 4: The Solution

Verify with Zenith reads a receipt or accepts a transaction reference, extracts the relevant details, and compares them with a trusted payment record.

It can surface outcomes such as verified against available records; pending, failed, reversed, or mismatched; previously used or unavailable; and unverified when information is insufficient or no matching record is available.

**Important:** Unverified does not automatically mean fake. It means the system cannot confirm the claim from the evidence it has.

## Slide 5: How It Works

**Receipt image or reference → OCR and field extraction → trusted-record comparison → clear decision and reasons → merchant fulfilment decision**

The comparison can include transaction reference, amount and currency, expected merchant recipient, payment status, and whether the payment has already been used for an order.

OCR confidence and the receipt's claimed status are supporting signals. The trusted transaction record is the decisive evidence.

## Slide 6: AI and Technical Innovation

**In the prototype:** Tesseract.js performs on-device OCR on receipt images. Verify with Zenith extracts structured fields from recognized text and checks claims against a local demo ledger. Deterministic rules also assess message-risk indicators and compare a receipt's claimed status with the demo record.

**What AI does not do:** OCR can read a receipt, but it cannot prove that the receipt is genuine. The prototype does not use a trained forgery-detection model or a live bank connection.

**Next AI step:** Evaluate document-understanding models for varied layouts and low-quality images, with confidence scores and human review for uncertain fields. An anomaly model should support, not replace, confirmation from an authorized payment-data source.

## Slide 7: What We Have Built

Verify with Zenith is a working web prototype with receipt image upload and camera capture; on-device OCR, field extraction, and confidence reporting; payment checks for amount, currency, recipient, status, and duplicate-use cases; order fulfilment checks, message-risk assessment, and a merchant dashboard; and a local demo ledger with a signed-token demonstration.

**Demo limitation:** The ledger contains simulated records, not live bank transactions. A verified result in the demo means a match against local test data, not confirmation from a real bank.

## Slide 8: Impact and Measurement

Verify with Zenith aims to reduce the time merchants spend checking payment claims and reduce the chance of releasing goods based only on a receipt image.

Measure impact in a pilot by tracking median time to confirm a payment; share of claims resolved without manual follow-up; OCR field-extraction accuracy by field and image quality; false acceptance and false rejection rates; disputed or prematurely fulfilled orders; and merchant and customer satisfaction.

Set targets after establishing a baseline with pilot merchants. Label any early figures as proposed targets, not achieved results.

## Slide 9: Feasible Implementation

**Prototype:** Demonstrate the existing flow with simulated transactions and varied receipt images.

**Pilot:** Work with a small group of merchants and one authorized payment-data partner. Use read-only access to payment records, explicit merchant consent, and a manual-review path.

**Production:** Replace demo data with secure bank, payment-service-provider, or authorized transaction integrations; add durable database storage, audit logs, monitoring, access controls, data-retention rules, and security review.

**Safety principle:** Never ask users to share banking passwords or OTPs. Use approved integrations and least-privilege access.

## Slide 10: Business Model and Differentiation

**Potential business model:** Merchant subscription, per-verification pricing, or a platform partnership with a marketplace or payment provider. Validate pricing with pilot users before choosing.

**Differentiation:** Verify with Zenith checks a payment claim against transaction evidence, not the image alone. It explains mismatches and uses an explicit unverified state when evidence is insufficient.

## Slide 11: Team and Expertise

Replace these role placeholders with actual names and only claim expertise the team can demonstrate.

- **Product and partnerships — [Name]:** Merchant research, product direction, pilot relationships
- **Engineering — [Name]:** Web application, APIs, payment integrations, security
- **AI and data — [Name]:** OCR evaluation, document extraction, confidence and error analysis
- **Operations and compliance — [Name]:** Consent, privacy, risk controls, pilot measurement

If one person covers several roles, say so plainly. Do not invent team members or experience.

## Slide 12: Ask and Next Milestones

**Our ask:** Support to test Verify with Zenith with merchants and explore an authorized transaction-data integration.

1. Interview merchants and document the current verification workflow.
2. Test OCR accuracy across different banks, layouts, and image quality.
3. Run a controlled pilot against authorized transaction records.
4. Measure decision time, error rates, and merchant trust.
5. Complete the security, privacy, and integration work needed for production.

## 60-Second Pitch

Merchants are often asked to release goods based on a payment receipt or screenshot, but the image itself cannot prove that money arrived. Verify with Zenith helps close that trust gap. It reads receipt details with on-device OCR, then compares the reference, amount, currency, recipient, and claimed status with payment records the merchant is authorized to check. When evidence is incomplete or unavailable, Verify with Zenith says unverified rather than guessing. We have a working prototype with OCR, payment and order checks, and a simulated transaction ledger. Our next step is to test it with merchants and connect to an approved payment-data source. Verify with Zenith's goal is simple: help merchants fulfil with confidence, based on the payment record rather than the picture.

## Submission Checklist

- Use **Verify with Zenith** consistently as the product name.
- Replace team placeholders with real names and relevant experience.
- Add real merchant interview findings and cite any external statistics.
- State clearly that the current transaction ledger is simulated.
- Present pilot metrics as targets until they have been measured.
