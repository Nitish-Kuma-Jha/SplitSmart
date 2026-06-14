# SCOPE.md — Anomaly Log & Database Schema

## Part 1: Anomaly Log

Every data problem found in `expenses_export.csv` and the handling policy applied.

---

### Anomaly #1 — DUPLICATE ROW (Error)
**Location**: Multiple rows  
**Description**: The same expense appears twice with identical description, date, and amount. E.g., "Electricity Bill - March" logged twice.  
**Detection**: Build a map of `description + date + amount`. If a key is seen twice, flag the second occurrence.  
**Policy**: SKIP the duplicate row. The first occurrence is kept. Rationale: The second entry is definitively redundant — same data adds nothing.  
**Action**: `skip`

---

### Anomaly #2 — SETTLEMENT LOGGED AS EXPENSE (Warning)
**Location**: Rows where notes/description contain "paid back", "settlement", "returning money"  
**Description**: A direct payment between two people (e.g., "Rohan paid Aisha back ₹1000") was logged as a shared group expense instead of a settlement record. This inflates everyone's balances incorrectly.  
**Detection**: Scan `description` and `notes` fields for keywords: "paid back", "settlement", "returning", "this is a settlement".  
**Policy**: CONVERT to a Settlement record. The payer/payee are extracted from the description and a Settlement document is created instead of an Expense.  
**Action**: `convert_settlement`

---

### Anomaly #3 — MEMBERSHIP VIOLATION — Meera After March 31 (Warning)
**Location**: Rows dated April 1+ that include Meera in split_with  
**Description**: Meera moved out on March 31, 2026. Expenses after this date should not include her in the split. Sam's concern: "I moved in mid-April. Why would March electricity affect my balance?"  
**Detection**: Check each participant against the membership timeline. Meera: join=Feb 1, leave=Mar 31.  
**Policy**: EXCLUDE Meera from the split for expenses dated after March 31. The expense is still imported but her name is removed from the participants list. The remaining active members split the expense.  
**Action**: `exclude_member`

---

### Anomaly #4 — MEMBERSHIP VIOLATION — Sam Before April 15 (Warning)
**Location**: Rows dated before April 15 that include Sam in split_with  
**Description**: Sam moved in on April 15. Any expense before that date should not include Sam. This directly addresses Sam's complaint.  
**Detection**: Sam's join date = April 15, 2026.  
**Policy**: EXCLUDE Sam from splits on expenses dated before April 15.  
**Action**: `exclude_member`

---

### Anomaly #5 — MISSING CURRENCY (Warning)
**Location**: Rows where the `currency` column is blank  
**Description**: Several rows have no currency specified. The original spreadsheet "pretended a dollar is a rupee" — this caused incorrect balance calculations.  
**Detection**: Check if `currency` field is empty or whitespace.  
**Policy**: DEFAULT to INR. The domestic context (groceries, electricity) makes INR the correct assumption. Warning is logged and shown to user.  
**Action**: `default_inr`

---

### Anomaly #6 — NEGATIVE AMOUNT — Treated as Refund (Warning)
**Location**: Rows with negative values in the `amount` column  
**Description**: Some entries have negative amounts, indicating a refund or credit (e.g., a returned item, a discount received).  
**Detection**: `parseFloat(amount) < 0`  
**Policy**: IMPORT AS REFUND. A negative expense reduces everyone's share rather than adding to it. The `isRefund` flag is set to `true` and the amount is stored as its absolute value.  
**Action**: `import_as_refund`

---

### Anomaly #7 — ZERO AMOUNT (Warning/Error)
**Location**: Rows with amount = 0  
**Description**: Some placeholder or already-settled rows have ₹0 amounts. They provide no financial data.  
**Detection**: `parseFloat(amount) === 0`  
**Policy**: SKIP. Zero-amount expenses do not affect balances and appear to be data entry errors or placeholders.  
**Action**: `skip`

---

### Anomaly #8 — AMBIGUOUS DATE — DD-MM vs MM-DD (Warning)
**Location**: Dates like "04-05-2026" where both DD-MM and MM-DD are valid  
**Description**: The spreadsheet uses inconsistent date formats. "04-05-2026" could be April 5 or May 4.  
**Detection**: If both day and month are ≤ 12 and they are different values, the date is ambiguous.  
**Policy**: INTERPRET AS DD-MM-YYYY (Indian date format standard). This is consistent with the majority of dates in the file and the Indian context of the application. Warning is shown to user.  
**Action**: `use_dmy`

---

### Anomaly #9 — UNKNOWN PARTICIPANT — Name Variation (Info)
**Location**: Rows with "Priya S", "rohan " (trailing space), etc.  
**Description**: The same person is referred to by different names/spellings across rows. "Priya S" is clearly Priya. "rohan " (trailing space) is Rohan.  
**Detection**: Compare against known member alias list. Unknown names that closely match known members are flagged.  
**Policy**: NORMALIZE the name using a canonical alias map:
```
"priya s" → "priya"
"rohan " → "rohan"
```
The normalized name is used in splits. Info-level notice shown (not a blocker).  
**Action**: `normalize_name`

---

### Anomaly #10 — UNKNOWN PARTICIPANT — Dev's Friend Kabir (Warning)
**Location**: Parasailing/trip expense rows  
**Description**: "Dev's friend Kabir" appears in split_with for a trip expense. Kabir is not a group member — he's a day guest. Including him in the split would create a balance for a non-existent member.  
**Detection**: Name "kabir" or "dev's friend kabir" does not match any group member.  
**Policy**: EXCLUDE Kabir from the group balance. Dev is responsible for Kabir's share. The expense is imported with Dev covering Kabir's portion.  
**Action**: `exclude_member`

---

### Anomaly #11 — PERCENTAGE ERROR — Doesn't Sum to 100% (Warning)
**Location**: Rows with `split_type = percentage` where percentages total ≠ 100%  
**Description**: Some percentage-split rows have values like 30%, 30%, 30% (totaling 90%) or 35%, 35%, 35% (totaling 105%). These are data entry errors.  
**Detection**: Sum all percentages. If `|sum - 100| > 0.5`, flag as anomaly.  
**Policy**: NORMALIZE proportionally. Each percentage is scaled: `new_pct = (old_pct / total) * 100`. This preserves the intended ratios while making them sum to exactly 100%.  
**Action**: `normalize_percentages`

---

### Anomaly #12 — CONFLICTING RECORDS — Same Dinner, Different Amounts (Warning)
**Location**: "Thalassa Dinner" appears twice with different amounts (₹2400 and ₹2800)  
**Description**: Two people logged the same dinner with different amounts. Row notes say "see row X for correct amount."  
**Detection**: Same description, same approximate date, but different amounts — a "soft duplicate".  
**Policy**: KEEP lower amount (₹2400) based on the note in row 25 indicating row 24 is correct. Skip the higher-amount conflicting row.  
**Action**: `skip` (conflicting row)

---

### Anomaly #13 — MISSING PAYER (Warning)
**Location**: Rows where `paid_by` column is blank  
**Description**: Without knowing who paid, it's impossible to correctly assign credit.  
**Detection**: `!row.paid_by || !row.paid_by.trim()`  
**Policy**: SKIP. Cannot calculate balances without a payer. User is shown the row and asked to either add it manually or skip.  
**Action**: `skip`

---

### Anomaly #14 — SUB-PAISA PRECISION (Info)
**Location**: Amounts like ₹899.995 or ₹1200.333  
**Description**: Indian currency (paise) has 2 decimal places. Sub-paisa amounts are a rounding artifact from division.  
**Detection**: `(amount * 100) % 1 !== 0`  
**Policy**: ROUND to 2 decimal places. ₹899.995 → ₹900.00. Info-level notice only.  
**Action**: `round_amount`

---

### Anomaly #15 — SPLIT TYPE MISMATCH (Info)
**Location**: Rows marked `split_type = equal` but with share details in `split_details`  
**Description**: Some rows say "equal" but have share details like "Aisha 2; Rohan 1". This is inconsistent — the split details suggest a share-based split.  
**Detection**: `split_type === 'equal'` AND `split_details` has non-empty value with share pattern.  
**Policy**: If split_details contains share data, treat as SHARE split. The split_details take precedence over the type label.  
**Action**: `use_row` (with share split type)

---

## Part 2: Database Schema

### `users`
```
_id          ObjectId (PK)
name         String (required)
email        String (unique, lowercase)
password     String (bcrypt hashed, select: false)
isVerified   Boolean (default: false)
otp          { code: String, expiresAt: Date }
resetPasswordOtp { code: String, expiresAt: Date }
defaultCurrency  'INR' | 'USD'
createdAt    Date
updatedAt    Date
```

### `groups`
```
_id          ObjectId (PK)
name         String (required)
description  String
currency     'INR' | 'USD'
createdBy    ObjectId → users
members[]    [
  _id        ObjectId
  user       ObjectId → users (nullable for external)
  name       String
  email      String
  joinDate   Date (required — key for membership tracking)
  leaveDate  Date (null = still active)
  role       'admin' | 'member'
  isExternal Boolean
]
isActive     Boolean
createdAt    Date
updatedAt    Date
```

### `expenses`
```
_id            ObjectId (PK)
group          ObjectId → groups (required)
title          String (required)
description    String
amount         Number (original amount)
amountINR      Number (converted to INR)
currency       'INR' | 'USD'
exchangeRate   Number (rate used at import time)
date           Date (required)
paidBy         { memberName: String, memberId: ObjectId }
splitType      'equal' | 'unequal' | 'percentage' | 'share'
splits[]       [
  memberName   String
  memberId     ObjectId
  amount       Number
  percentage   Number
  shares       Number
  settled      Boolean
]
category       String
isRefund       Boolean
isSettlement   Boolean
importedFrom   String (filename)
importRowIndex Number
anomalyFlags[] [String]
notes          String
createdBy      ObjectId → users
isDeleted      Boolean (soft delete)
deletedAt      Date
deletedBy      ObjectId → users
createdAt      Date
updatedAt      Date
```

### `settlements`
```
_id          ObjectId (PK)
group        ObjectId → groups
paidBy       { memberName: String, memberId: ObjectId }
receivedBy   { memberName: String, memberId: ObjectId }
amount       Number
currency     'INR' | 'USD'
date         Date
notes        String
importedFrom String
importRowIndex Number
createdBy    ObjectId → users
createdAt    Date
updatedAt    Date
```

### `importjobs`
```
_id              ObjectId (PK)
group            ObjectId → groups
filename         String
uploadedBy       ObjectId → users
status           'uploaded' | 'analyzing' | 'pending_review' | 'approved' | 'importing' | 'completed' | 'failed'
totalRows        Number
importedRows     Number
skippedRows      Number
errorRows        Number
warningCount     Number
anomalies[]      [ObjectId → anomalies]
rawData[]        [Mixed] (parsed CSV rows stored for execution)
report           String (full text report)
completedAt      Date
exchangeRateUsed Number
createdAt        Date
updatedAt        Date
```

### `anomalies`
```
_id          ObjectId (PK)
importJob    ObjectId → importjobs
rowIndex     Number
rowData      Mixed (raw CSV row)
type         Enum (15 types)
severity     'error' | 'warning' | 'info'
description  String
suggestion   String
status       'pending' | 'approved' | 'rejected' | 'auto_resolved'
resolution   String
resolvedBy   ObjectId → users
resolvedAt   Date
autoAction   String
createdAt    Date
updatedAt    Date
```

### `auditlogs`
```
_id          ObjectId (PK)
user         ObjectId → users
action       String (e.g. 'CREATE_EXPENSE', 'ANOMALY_APPROVED')
entity       'expense' | 'settlement' | 'group' | 'member' | 'import' | 'anomaly' | 'user'
entityId     ObjectId
before       Mixed (state before change)
after        Mixed (state after change)
notes        String
ipAddress    String
createdAt    Date
updatedAt    Date
```

---

## Key Design Decisions on Schema

**Why store `amountINR` separately?**  
Balance calculations always need INR. Pre-computing avoids repeated USD→INR conversion in every balance query.

**Why `memberName` string alongside `memberId`?**  
CSV-imported expenses don't have user accounts. Storing the name string allows balances to work for both registered users and CSV-imported names.

**Why `rawData` in ImportJob?**  
The CSV rows are stored at upload time so the execution step can run without re-reading the file (which may have been deleted from /tmp).

**Why soft-delete on Expense?**  
Meera's requirement: "I want to approve anything the app deletes." Soft delete + audit log satisfies this — nothing is permanently gone without an audit trail.
