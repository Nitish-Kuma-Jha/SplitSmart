# AI_USAGE.md — AI Tools, Prompts & Corrections

## AI Tool Used
**Claude (Anthropic) — claude-sonnet-4-6**  
Used as primary development collaborator throughout the project.

---

## Key Prompts Used

### Prompt 1 — Project Architecture
> "I'm building a Splitwise-style expense app in MERN stack. The key requirements are: CSV import with anomaly detection, membership-aware expense splitting (members join/leave with dates), multi-currency (USD+INR), debt simplification, and an approval workflow before any data changes. Design the MongoDB schema and Express route structure."

**What I used**: The schema structure for Group.members embedding with joinDate/leaveDate, the ImportJob + Anomaly separate collections pattern, and the soft-delete approach for expenses.

**What I changed**: AI initially suggested a separate `memberships` collection. I decided to embed memberships in the Group document since membership data is always fetched alongside group data and embedding avoids unnecessary JOINs.

---

### Prompt 2 — Anomaly Detection Engine
> "Write a function that detects anomalies in CSV rows for a shared expense import. The known issues are: duplicates, settlements logged as expenses, membership violations (Meera left March 31, Sam joined April 15), missing currency, negative amounts, zero amounts, ambiguous dates (DD-MM vs MM-DD), percentage errors, unknown participants. Return an array of anomaly objects with type, severity, description, suggestion, and autoAction."

**What I used**: The overall structure of the `detectAnomalies()` function, the anomaly type constants, and the membership timeline object.

**What I changed**: 
- AI generated a date ambiguity detector that flagged ALL dates where day ≤ 12 as ambiguous. This was wrong — it would flag every date in January through December where the day is ≤ 12. I fixed it to only flag dates where BOTH components (day and month) are ≤ 12 AND they are different values.
- AI's duplicate detection only checked description+amount (missed same-description different-dates). I added date to the key: `description-amount-date`.

---

### Prompt 3 — Debt Simplification Algorithm
> "Write a greedy debt simplification algorithm. Input: array of {name, balance} where positive means they are owed money and negative means they owe. Output: minimum array of {from, to, amount} transactions."

**What I used**: The two-pointer greedy approach (sort debtors/creditors, match largest to largest).

**What I changed**: AI's initial version had a bug where it compared `d.amount < 0.01` but didn't handle floating point correctly — amounts like `0.009999999` (from repeated subtraction) were not being caught. I added `Math.round(amount * 100) / 100` at each step to keep values clean.

---

### Prompt 4 — React Balance Page with Drill-Down
> "Create a React component that shows each member's net balance as a card. Clicking a card should expand it to show a line-by-line breakdown of every expense that contributes to their balance. Use the SplitSmart CSS design system (dark theme, CSS variables)."

**What I used**: The overall card + expandable drawer structure, the color coding (green for positive, red for negative).

**What I changed**: AI put the drill-down in a modal. I changed it to an inline expandable drawer below each card — this is better UX for comparison (you can see multiple breakdowns side by side) and doesn't block the rest of the page.

---

### Prompt 5 — OTP Email Template
> "Write a beautiful HTML email template for a 6-digit OTP. Dark theme matching the app. Should work in Gmail/Outlook."

**What I used**: The overall HTML structure, the inline styles approach (required for email clients).

**What I changed**: AI used `display: flex` in the email template. Flex is not supported in Outlook. I replaced it with `<table>` layout for the OTP box to ensure cross-client compatibility.

---

## Three Concrete Cases Where AI Was Wrong

### Case 1: Date Ambiguity — Over-flagging
**What AI produced**:
```javascript
if (day <= 12 && month <= 12) {
  addAnomaly('AMBIGUOUS_DATE', 'warning', ...);
}
```
This would flag "05-03-2026" (March 5) as ambiguous, even though it's unambiguous in an Indian context (DD-MM). It flagged nearly every date in the file.

**How I caught it**: When I tested with the actual CSV, the review screen showed 30+ "ambiguous date" warnings for ordinary dates like "05-02-2026". This was clearly wrong.

**What I changed**:
```javascript
// Only flag if BOTH could be valid months AND they're different
const ambiguous = day <= 12 && month <= 12 && day !== month;
```
This correctly identifies only truly ambiguous dates (where swapping day/month gives a different valid date).

---

### Case 2: Balance Calculation — Double-Counting Settlements
**What AI produced** in the balance route:
```javascript
// AI code converted all settlements to expenses with isSettlement=true
// then processed them in the expense loop
for (const expense of expenses) {
  if (expense.isSettlement) {
    balances[paidByKey].balance += amountINR; // payer gets credit
    balances[receivedByKey].balance -= amountINR; // receiver debited
  }
}
```
The problem: it was also processing settlement records from the `settlements` collection separately. This counted settlements twice.

**How I caught it**: During manual testing, Rohan's balance was twice what it should have been after recording a settlement. I traced through the balance function and found it adding settlements from both the expense loop (flagged isSettlement expenses) and the separate settlements loop.

**What I changed**: Settlements-as-expenses (detected during CSV import and converted) are stored ONLY as Settlement documents, not as Expense documents. The balance calculation only reads from the `settlements` collection once.

---

### Case 3: Multer File Cleanup — Race Condition
**What AI produced**:
```javascript
const rows = await parseCSV(req.file.path);
fs.unlinkSync(req.file.path); // cleanup
// ... then used rows
```
AI placed `unlinkSync` correctly after parse. But AI's `parseCSV` function used `csv-parser` with streams — it returned a promise that resolved before all rows were actually processed because the stream's `end` event wasn't being awaited properly.

**How I caught it**: CSV imports were returning 0 rows. Debugging showed the file was being deleted before the stream finished reading it, and the promise resolved early with an empty array.

**What I changed**: Rewrote `parseCSV` to properly await the stream completion:
```javascript
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))  // resolve ONLY when stream ends
      .on('error', reject);
  });
}
// Now safe to delete AFTER the promise resolves
const rows = await parseCSV(req.file.path);
fs.unlinkSync(req.file.path);
```

---

## General AI Usage Notes

- AI was used to scaffold boilerplate (route structure, model fields, form components) which saved significant time
- Every AI-generated piece of code was read line by line before use
- Business logic (balance calculation, anomaly policies, membership checks) was written or heavily modified by hand
- UI design decisions (layout, color system, component structure) were made independently; AI provided starting points
- AI was NOT used to write the DECISIONS.md, SCOPE.md, or this file — those reflect genuine engineering thought
