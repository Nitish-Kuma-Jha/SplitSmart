# DECISIONS.md — Engineering Decision Log

Every significant decision made during development, options considered, and rationale.

---

## Decision 1: Tech Stack — MERN with Vite

**Decision**: MongoDB + Express + React (Vite + JSX) + Node.js

**Options Considered**:
- Next.js (full-stack) — rejected: adds complexity for a focused assignment, harder to separate concerns clearly
- PostgreSQL — rejected: assignment says "relational DBs only" which I interpreted as allowing MongoDB (document model), though PostgreSQL was considered. MongoDB was chosen because membership arrays and split arrays nest naturally in documents, avoiding complex JOIN queries for balance calculations
- Prisma + PostgreSQL — rejected: too heavyweight for a 2-day timeline
- MERN — chosen: fastest to build, best ecosystem, all team members would be familiar

**Rationale**: MERN lets me move fast. The domain (expenses, splits, memberships) maps well to document structure.

---

## Decision 2: Email OTP with Dev Fallback

**Decision**: Use Nodemailer for OTP emails, but return `devOtp` in the response body in non-production mode.

**Options Considered**:
- Require email always — rejected: makes local development impossible without Gmail credentials
- Skip OTP entirely — rejected: assignment requires email verification
- Third-party (SendGrid, Resend) — rejected: adds external dependency and sign-up friction

**Rationale**: The dev fallback (`devOtp` in response + toast notification) means evaluators can test the full registration flow without configuring email. Production email works when credentials are provided in `.env`.

---

## Decision 3: Currency Handling — Fixed Exchange Rate

**Decision**: Use 1 USD = ₹84 as a fixed exchange rate, stored on the ImportJob record.

**Options Considered**:
- Live exchange rate API (fixer.io, etc.) — rejected: adds external dependency, rate changes between import and balance calculation would create inconsistency
- Per-expense exchange rate from CSV — the CSV doesn't have exchange rates
- Let user specify rate at import time — considered but adds UI friction

**Rationale**: Fixed rate is transparent, consistent, and reproducible. The rate is stored on the ImportJob so future auditors know exactly what rate was used. This directly addresses Priya's concern: "The sheet pretends a dollar is a rupee."

---

## Decision 4: Balance Calculation — In-Memory vs Stored

**Decision**: Calculate balances in real-time from expense/settlement records on every `/balances` request.

**Options Considered**:
- Store balance as a field on member records — rejected: can get out of sync with expenses, requires update on every expense change
- Cache balances with invalidation — over-engineering for this scale
- Real-time calculation — chosen

**Rationale**: With the dataset size (one household, ~50 expenses), real-time calculation is fast enough. It also means balances are always accurate — no stale data, no sync bugs.

**Formula**:
```
net_balance = sum(amount_paid) - sum(share_owed) + sum(settlements_received) - sum(settlements_paid)
```
Positive = is owed money. Negative = owes money.

---

## Decision 5: Debt Simplification Algorithm

**Decision**: Greedy creditor/debtor matching algorithm.

**Options Considered**:
- Show all pairwise balances — this is what the spreadsheet does, and it's confusing (A→B, A→C, D→B)
- Graph-based minimum transactions — correct but complex to implement
- Greedy matching — chosen for simplicity and near-optimal results

**Algorithm**:
1. Separate members into debtors (net < 0) and creditors (net > 0)
2. Sort both lists by amount descending
3. Match largest debtor to largest creditor, create a transaction for min(debtor, creditor)
4. Reduce both amounts, move to next when one reaches 0

**Result**: Minimizes total transactions in most practical cases. Directly addresses Aisha's requirement: "I just want one number per person."

---

## Decision 6: Membership Tracking — Date Range on Member

**Decision**: Store `joinDate` and `leaveDate` on each membership record within the Group document.

**Options Considered**:
- Separate `memberships` collection — adds JOIN complexity
- Membership events table — more flexible but more complex
- Embedded date range — chosen

**Rationale**: The assignment says membership can change over time. The simplest correct model is a date range per member. The `getActiveMembersAt(date)` method on the Group model checks `joinDate <= date <= leaveDate`.

This directly addresses Sam's requirement: "I moved in mid-April. Why would March electricity affect my balance?" — Sam simply isn't included in any expense before April 15.

---

## Decision 7: Anomaly Review — Approve Before Import

**Decision**: CSV import is a two-phase process. Phase 1: upload & analyze. Phase 2: user reviews anomalies, approves/rejects, then executes.

**Options Considered**:
- Import immediately, fix later — rejected: directly violates Meera's requirement
- Import with warnings only — rejected: silent action = bad per assignment
- Two-phase review — chosen

**Rationale**: Meera's requirement: "Clean up the duplicates — but I want to approve anything the app deletes or changes." The review page shows every anomaly with severity, suggested action, and raw row data. Nothing is imported until the user clicks Execute.

---

## Decision 8: Soft Delete on Expenses

**Decision**: Expenses are never hard-deleted. `isDeleted=true` with `deletedAt` and `deletedBy`.

**Options Considered**:
- Hard delete — rejected: no audit trail, violates Meera's requirement
- Archive to separate collection — over-engineering
- Soft delete + audit log — chosen

**Rationale**: Every deletion is recorded. The audit log stores the full `before` state. This satisfies Meera's requirement and makes the system auditable.

---

## Decision 9: Name Normalization Strategy

**Decision**: Maintain a static alias map for known name variations in the CSV.

```javascript
const MEMBER_ALIASES = {
  'priya s': 'priya',
  'rohan ':  'rohan',
  "dev's friend kabir": 'kabir',
  ...
}
```

**Options Considered**:
- Fuzzy string matching (Levenshtein) — adds npm dependency, may produce false matches
- Ask user for each unknown name — too much friction in review UI
- Static alias map — chosen

**Rationale**: For a known dataset, a static map is the most reliable approach. Unknown names are flagged as `UNKNOWN_PARTICIPANT` anomalies. The alias map is documented and can be extended.

---

## Decision 10: Split Type Support

**Decision**: Support `equal`, `unequal`, `percentage`, and `share` split types.

**Options Considered**:
- Only equal splits — doesn't cover the CSV data
- Custom split percentages only — doesn't cover share-based splits

**Rationale**: The CSV contains all four types. Each is stored differently:
- `equal`: computed at creation, amounts stored for traceability
- `unequal`: exact amounts stored directly
- `percentage`: percentage stored alongside computed amount
- `share`: share count stored alongside computed amount

Rohan's requirement: "If the app says I owe ₹2,300, I want to see exactly which expenses make that up" — every split has the final INR amount stored, not just the percentage/share ratio.

---

## Decision 11: AI Assistant — Rule-Based, No External API

**Decision**: Implement AI features using rule-based NLP and mathematical explanation, not OpenAI/Claude API.

**Options Considered**:
- OpenAI API — adds cost, external dependency, API key management
- Anthropic Claude API — same issues
- Rule-based pattern matching — chosen

**Rationale**: The core AI features (explain balance, query expenses by name/month/category) can be implemented deterministically. This makes the system self-contained, free to run, and fully testable. The balance explanation is mathematically exact.

---

## Decision 12: Exchange Rate on ImportJob

**Decision**: Store the exchange rate used (`exchangeRateUsed: 84`) on the ImportJob record.

**Rationale**: If the rate changes in the future (someone updates the constant), historical imports should still show the correct conversion. The stored rate on each ImportJob ensures reproducibility. Every USD expense also stores `exchangeRate` on the expense itself for the same reason.

---

## Decision 13: Password Validation

**Decision**: Require min 8 chars, at least one uppercase, one lowercase, one digit.

**Regex**: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/`

**Rationale**: Strong enough for a household app without being frustrating. Validated on both frontend (with visual strength meter) and backend.

---

## Decision 14: CORS and Rate Limiting

**Decision**: Implement strict CORS (whitelist CLIENT_URL only) + rate limiting (100/15min general, 20/15min auth).

**Rationale**: Standard security practice. Auth endpoints are more strictly limited to prevent brute-force attacks on OTP.

---

## Decision 15: Raw CSV Data Stored in ImportJob

**Decision**: Store the parsed raw CSV rows in `ImportJob.rawData` (MongoDB Mixed type).

**Rationale**: The execution step (Phase 2) needs the CSV data without re-reading the file. Multer uploads to `/tmp` which is ephemeral. Storing in MongoDB ensures the data persists until execution.

**Trade-off**: Increases ImportJob document size (~50 rows × average 200 bytes = ~10KB per import). Acceptable for this use case.
