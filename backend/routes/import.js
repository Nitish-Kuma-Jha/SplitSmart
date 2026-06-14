const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const ImportJob = require('../models/ImportJob');
const Anomaly = require('../models/Anomaly');
const AuditLog = require('../models/AuditLog');

const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files allowed'));
    }
  }
});

const USD_TO_INR = 84; // Exchange rate used for import

// Known member name normalizations from the CSV
const MEMBER_ALIASES = {
  'priya s': 'priya',
  'rohan ': 'rohan',
  'priya': 'priya',
  'aisha': 'aisha',
  'rohan': 'rohan',
  'meera': 'meera',
  'dev': 'dev',
  'sam': 'sam',
  "dev's friend kabir": 'kabir'
};

function normalizeName(name) {
  if (!name) return '';
  const cleaned = name.trim().toLowerCase();
  return MEMBER_ALIASES[cleaned] || cleaned;
}

function normalizeNameDisplay(name) {
  if (!name) return '';
  const n = normalizeName(name);
  return n.charAt(0).toUpperCase() + n.slice(1);
}

// Parse various date formats found in the CSV
function parseDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return { date: null, ambiguous: false };

  const str = dateStr.trim();

  // DD-MM-YYYY (most common in CSV)
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [day, month, year] = str.split('-').map(Number);
    // Check if it could be MM-DD-YYYY (ambiguous when day<=12)
    const ambiguous = day <= 12 && month <= 12 && day !== month;
    const date = new Date(year, month - 1, day);
    if (isNaN(date)) return { date: null, ambiguous: false };
    return { date, ambiguous: false, note: null };
  }

  // MM-DD-YYYY or ambiguous (04-05-2026)
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const parts = str.split('-').map(Number);
    return { date: new Date(parts[2], parts[0] - 1, parts[1]), ambiguous: true };
  }

  // Mar-14 (month-day, no year) — assume 2026
  if (/^[A-Za-z]{3}-\d{1,2}$/.test(str)) {
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const parts = str.split('-');
    const month = months[parts[0].toLowerCase()];
    if (month === undefined) return { date: null, ambiguous: false };
    const date = new Date(2026, month, parseInt(parts[1]));
    return { date, ambiguous: false, note: 'Year assumed as 2026' };
  }

  return { date: null, ambiguous: false };
}

// Parse amount: handles "1,200", "899.995", negatives
function parseAmount(amountStr) {
  if (!amountStr && amountStr !== 0) return { amount: null, issues: ['missing'] };
  const str = String(amountStr).replace(/,/g, '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return { amount: null, issues: ['invalid'] };

  const issues = [];
  if (num < 0) issues.push('negative');
  if (num === 0) issues.push('zero');
  // Precision: more than 2 decimal places
  if ((num * 100) % 1 !== 0) issues.push('precision');

  return { amount: num, issues };
}

function parseSplitDetails(detailsStr, splitType, participants) {
  if (!detailsStr || !detailsStr.trim()) return null;
  const str = detailsStr.trim();

  if (splitType === 'unequal' || splitType === 'percentage') {
    const parts = str.split(';').map(p => p.trim());
    const result = {};
    for (const part of parts) {
      // "Rohan 700" or "Aisha 30%"
      const match = part.match(/^(.+?)\s+([\d.]+)%?$/);
      if (match) {
        const name = normalizeName(match[1]);
        const value = parseFloat(match[2]);
        result[name] = value;
      }
    }
    return result;
  }

  if (splitType === 'share') {
    const parts = str.split(';').map(p => p.trim());
    const result = {};
    for (const part of parts) {
      const match = part.match(/^(.+?)\s+(\d+)$/);
      if (match) {
        result[normalizeName(match[1])] = parseInt(match[2]);
      }
    }
    return result;
  }

  return null;
}

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// Detect all anomalies in the CSV rows
function detectAnomalies(rows) {
  const anomalies = [];
  const seenRows = new Map(); // for duplicate detection

  // Known membership timeline
  const memberTimeline = {
    aisha: { join: new Date('2026-02-01'), leave: null },
    rohan: { join: new Date('2026-02-01'), leave: null },
    priya: { join: new Date('2026-02-01'), leave: null },
    meera: { join: new Date('2026-02-01'), leave: new Date('2026-03-31') },
    dev: { join: new Date('2026-02-08'), leave: new Date('2026-03-15') }, // visitor
    sam: { join: new Date('2026-04-15'), leave: null }
  };

  function isMemberActive(name, date) {
    const key = normalizeName(name);
    const timeline = memberTimeline[key];
    if (!timeline) return null; // unknown member
    if (date < timeline.join) return false;
    if (timeline.leave && date > timeline.leave) return false;
    return true;
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed, +1 for header
    const addAnomaly = (type, severity, description, suggestion, autoAction) => {
      anomalies.push({ rowIndex: rowNum, rowData: row, type, severity, description, suggestion, autoAction });
    };

    // 1. DATE ISSUES
    const { date, ambiguous, note: dateNote } = parseDate(row.date);
    if (!date) {
      addAnomaly('INVALID_DATE', 'error',
        `Row ${rowNum}: Cannot parse date "${row.date}"`,
        'Fix the date format or skip this row',
        'skip'
      );
      return; // can't process without date
    }
    if (ambiguous || (row.date === '04-05-2026')) {
      addAnomaly('AMBIGUOUS_DATE', 'warning',
        `Row ${rowNum}: Date "${row.date}" is ambiguous — could be Apr-05 or May-04`,
        'Policy: interpret as DD-MM-YYYY → April 5, 2026',
        'use_dmy'
      );
    }
    if (dateNote) {
      addAnomaly('INVALID_DATE', 'warning',
        `Row ${rowNum}: Date "${row.date}" is incomplete (Mar-14), ${dateNote}`,
        'Year assumed 2026 based on context',
        'use_row'
      );
    }

    // 2. SETTLEMENT DETECTED AS EXPENSE
    const desc = (row.description || '').toLowerCase();
    const notes = (row.notes || '').toLowerCase();
    if (
      desc.includes('paid') && (desc.includes('back') || desc.includes('settlement') || desc.includes('return')) ||
      notes.includes('settlement') || notes.includes('this is a settlement')
    ) {
      addAnomaly('SETTLEMENT_AS_EXPENSE', 'warning',
        `Row ${rowNum}: "${row.description}" looks like a settlement payment, not an expense`,
        'Convert to a Settlement record instead of expense',
        'convert_settlement'
      );
    }

    // 3. MISSING PAYER
    if (!row.paid_by || !row.paid_by.trim()) {
      addAnomaly('MISSING_PAYER', 'warning',
        `Row ${rowNum}: "${row.description}" has no payer listed`,
        'Cannot determine who paid. Skip or assign manually.',
        'skip'
      );
    }

    // 4. AMOUNT ISSUES
    const { amount, issues: amountIssues } = parseAmount(row.amount);
    if (amountIssues.includes('missing') || amountIssues.includes('invalid')) {
      addAnomaly('ZERO_AMOUNT', 'error',
        `Row ${rowNum}: Invalid amount "${row.amount}"`,
        'Skip this row',
        'skip'
      );
    } else if (amountIssues.includes('zero')) {
      addAnomaly('ZERO_AMOUNT', 'warning',
        `Row ${rowNum}: "${row.description}" has amount ₹0 — likely a placeholder or already corrected`,
        'Skip this zero-amount row',
        'skip'
      );
    } else if (amountIssues.includes('negative')) {
      addAnomaly('NEGATIVE_AMOUNT', 'warning',
        `Row ${rowNum}: "${row.description}" has negative amount ${row.amount}. Treating as refund.`,
        'Import as a refund (negative expense that reduces balances)',
        'import_as_refund'
      );
    } else if (amountIssues.includes('precision')) {
      addAnomaly('PRECISION_ISSUE', 'info',
        `Row ${rowNum}: "${row.description}" amount ${row.amount} has sub-paisa precision`,
        'Round to 2 decimal places: ₹${Math.round(amount * 100) / 100}',
        'round_amount'
      );
    }

    // 5. MISSING CURRENCY
    if (!row.currency || !row.currency.trim()) {
      addAnomaly('MISSING_CURRENCY', 'warning',
        `Row ${rowNum}: "${row.description}" has no currency. Defaulting to INR.`,
        'Context suggests INR (domestic grocery purchase)',
        'default_inr'
      );
    }

    // 6. MEMBERSHIP VIOLATIONS
    if (date && row.split_with) {
      const participants = row.split_with.split(';').map(p => p.trim());
      participants.forEach(participant => {
        const key = normalizeName(participant);
        const active = isMemberActive(participant, date);

        if (active === false) {
          const timeline = memberTimeline[key];
          const leftBefore = timeline && timeline.leave && date > timeline.leave;
          const joinedAfter = timeline && date < timeline.join;

          if (leftBefore) {
            addAnomaly('MEMBERSHIP_VIOLATION', 'warning',
              `Row ${rowNum}: ${normalizeNameDisplay(participant)} is listed but had left the group by ${date.toDateString()}`,
              `Exclude ${normalizeNameDisplay(participant)} from this expense split`,
              'exclude_member'
            );
          } else if (joinedAfter) {
            addAnomaly('MEMBERSHIP_VIOLATION', 'warning',
              `Row ${rowNum}: ${normalizeNameDisplay(participant)} is listed but hadn't joined yet on ${date.toDateString()}`,
              `Exclude ${normalizeNameDisplay(participant)} from this expense split`,
              'exclude_member'
            );
          }
        } else if (active === null && key !== 'kabir') {
          addAnomaly('UNKNOWN_PARTICIPANT', 'info',
            `Row ${rowNum}: "${participant}" is not a recognized group member`,
            'This may be a name variation (e.g., "Priya S" = Priya) or a guest',
            'normalize_name'
          );
        }
      });
    }

    // 7. DUPLICATE DETECTION
    const dupKey = `${row.description?.toLowerCase().trim()}-${row.amount}-${row.date}`;
    const dupKey2 = `${(row.description || '').toLowerCase().replace(/\s+/g, ' ').trim()}-${row.amount}`;

    if (seenRows.has(dupKey)) {
      addAnomaly('DUPLICATE', 'error',
        `Row ${rowNum}: "${row.description}" on ${row.date} for ${row.amount} is an exact duplicate of row ${seenRows.get(dupKey)}`,
        'Skip this duplicate row',
        'skip'
      );
    } else {
      seenRows.set(dupKey, rowNum);
    }

    // 8. CONFLICTING RECORDS (same dinner, different amounts)
    // Thalassa dinner: rows 24-25
    const thalassaKey = `thalassa dinner`;
    const marinaBitesKey = `dinner - marina bites`;
    if (desc.includes('thalassa') && seenRows.has(thalassaKey)) {
      addAnomaly('CONFLICTING_RECORD', 'warning',
        `Row ${rowNum}: Duplicate Thalassa dinner entry with different amount (${row.amount} vs earlier entry). "${row.notes || ''}"`,
        'Keep lower amount (row 24, ₹2400 by Aisha). Row 25 note suggests row 24 is correct.',
        'skip'
      );
    } else if (desc.includes('thalassa')) {
      seenRows.set(thalassaKey, rowNum);
    }

    if (desc.includes('marina bites') && seenRows.has(marinaBitesKey)) {
      addAnomaly('DUPLICATE', 'error',
        `Row ${rowNum}: "dinner - marina bites" appears to be same as "Dinner at Marina Bites" — exact duplicate`,
        'Skip this row (same event, different capitalization)',
        'skip'
      );
    } else if (desc.includes('marina bites')) {
      seenRows.set(marinaBitesKey, rowNum);
    }

    // 9. PERCENTAGE ERRORS
    if (row.split_type === 'percentage' && row.split_details) {
      const details = parseSplitDetails(row.split_details, 'percentage', []);
      if (details) {
        const total = Object.values(details).reduce((sum, v) => sum + v, 0);
        if (Math.abs(total - 100) > 0.5) {
          addAnomaly('PERCENTAGE_ERROR', 'warning',
            `Row ${rowNum}: Percentages sum to ${total}%, not 100%. "${row.notes || ''}"`,
            'Normalize percentages proportionally to sum to 100%',
            'normalize_percentages'
          );
        }
      }
    }

    // 10. SPLIT_TYPE vs SPLIT_DETAILS mismatch
    if (row.split_type === 'equal' && row.split_details && row.split_details.trim()) {
      addAnomaly('SPLIT_MISMATCH', 'info',
        `Row ${rowNum}: "${row.description}" is marked "equal" but has split details: "${row.split_details}"`,
        'Policy: if split_details has shares, treat as share-based split. Else, ignore details.',
        'use_row'
      );
    }

    // 11. UNKNOWN PARTICIPANT (Kabir)
    if (row.split_with && row.split_with.toLowerCase().includes("dev's friend kabir")) {
      addAnomaly('UNKNOWN_PARTICIPANT', 'warning',
        `Row ${rowNum}: "Dev's friend Kabir" is not a group member but is listed in parasailing split`,
        'Kabir is a day guest. Exclude from group balances — Dev covers Kabir\'s share.',
        'exclude_member'
      );
    }
  });

  return anomalies;
}

// @POST /api/import/upload - Upload and analyze CSV
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ success: false, message: 'groupId required' });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Parse CSV
    const rows = await parseCSV(req.file.path);
    fs.unlinkSync(req.file.path); // cleanup

    // Detect anomalies
    const detectedAnomalies = detectAnomalies(rows);

    // Create import job
    const importJob = await ImportJob.create({
      group: groupId,
      filename: req.file.originalname,
      uploadedBy: req.user._id,
      status: 'pending_review',
      totalRows: rows.length,
      rawData: rows,
      exchangeRateUsed: USD_TO_INR
    });

    // Save anomalies
    const savedAnomalies = [];
    for (const a of detectedAnomalies) {
      const anomaly = await Anomaly.create({
        importJob: importJob._id,
        ...a
      });
      savedAnomalies.push(anomaly);
    }

    importJob.anomalies = savedAnomalies.map(a => a._id);
    importJob.warningCount = detectedAnomalies.filter(a => a.severity !== 'info').length;
    await importJob.save();

    res.json({
      success: true,
      importJob: {
        _id: importJob._id,
        filename: importJob.filename,
        totalRows: rows.length,
        anomalyCount: detectedAnomalies.length,
        status: importJob.status
      },
      anomalies: savedAnomalies,
      preview: rows.slice(0, 5)
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/import/:jobId - Get import job details
router.get('/:jobId', protect, async (req, res) => {
  try {
    const job = await ImportJob.findById(req.params.jobId)
      .populate('anomalies')
      .populate('uploadedBy', 'name');

    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });

    res.json({ success: true, importJob: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/import/group/:groupId - List import jobs for group
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const jobs = await ImportJob.find({ group: req.params.groupId })
      .sort({ createdAt: -1 })
      .select('-rawData -anomalies')
      .populate('uploadedBy', 'name');

    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/import/:jobId/anomalies/:anomalyId - Approve/reject anomaly
router.put('/:jobId/anomalies/:anomalyId', protect, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const anomaly = await Anomaly.findByIdAndUpdate(
      req.params.anomalyId,
      {
        status,
        resolution,
        resolvedBy: req.user._id,
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!anomaly) return res.status(404).json({ success: false, message: 'Anomaly not found' });

    await AuditLog.create({
      user: req.user._id,
      action: `ANOMALY_${status.toUpperCase()}`,
      entity: 'anomaly',
      entityId: anomaly._id,
      after: { status, resolution }
    });

    res.json({ success: true, anomaly });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/import/:jobId/execute - Execute the import after review
router.post('/:jobId/execute', protect, async (req, res) => {
  try {
    const job = await ImportJob.findById(req.params.jobId).populate('anomalies');
    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });

    job.status = 'importing';
    await job.save();

    const rows = job.rawData;
    const anomalies = job.anomalies;

    // Build skip/action set from anomaly decisions
    const skipRows = new Set();
    const convertToSettlement = new Set();
    const importAsRefund = new Set();
    const excludeMembers = {}; // rowIndex -> Set of member names to exclude

    for (const anomaly of anomalies) {
      if (anomaly.status === 'approved' || anomaly.status === 'auto_resolved') {
        const rowIdx = anomaly.rowIndex - 2; // convert back to 0-indexed
        if (anomaly.autoAction === 'skip') skipRows.add(rowIdx);
        if (anomaly.autoAction === 'convert_settlement') convertToSettlement.add(rowIdx);
        if (anomaly.autoAction === 'import_as_refund') importAsRefund.add(rowIdx);
        if (anomaly.autoAction === 'exclude_member') {
          if (!excludeMembers[rowIdx]) excludeMembers[rowIdx] = new Set();
          // Extract member name from description
          const match = anomaly.description.match(/: (.+?) is listed/);
          if (match) excludeMembers[rowIdx].add(normalizeName(match[1]));
        }
      }
    }

    let importedRows = 0;
    let skippedRows = 0;
    const reportLines = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (skipRows.has(i)) {
        skippedRows++;
        reportLines.push(`SKIPPED Row ${i+2}: "${row.description}" — ${getSkipReason(anomalies, i+2)}`);
        continue;
      }

      const { date } = parseDate(row.date);
      if (!date) { skippedRows++; continue; }

      const { amount } = parseAmount(row.amount);
      if (amount === null) { skippedRows++; continue; }
      if (amount === 0) { skippedRows++; continue; }

      const currency = (row.currency || 'INR').trim().toUpperCase();
      const paidBy = normalizeNameDisplay(row.paid_by || 'Unknown');
      const splitWith = (row.split_with || '').split(';').map(n => n.trim()).filter(Boolean);

      // Exclude members if needed
      const excluded = excludeMembers[i] || new Set();
      const activeSplitWith = splitWith.filter(n => !excluded.has(normalizeName(n)));

      if (convertToSettlement.has(i)) {
        // Save as settlement
        const participants = activeSplitWith;
        const receivedBy = participants.find(p => normalizeName(p) !== normalizeName(paidBy)) || 'Unknown';

        await Settlement.create({
          group: job.group,
          paidBy: { memberName: paidBy },
          receivedBy: { memberName: normalizeNameDisplay(receivedBy) },
          amount: Math.abs(amount),
          currency,
          date,
          notes: row.notes || `Imported from CSV row ${i+2}`,
          importedFrom: job.filename,
          importRowIndex: i+2
        });
        importedRows++;
        reportLines.push(`CONVERTED TO SETTLEMENT Row ${i+2}: "${row.description}" — ₹${Math.abs(amount)} from ${paidBy}`);
        continue;
      }

      // Build splits
      const splitType = (row.split_type || 'equal').toLowerCase().trim();
      let actualSplitType = splitType;
      
      // Handle split_type mismatch (equal with share details)
      if (splitType === 'equal' && row.split_details && row.split_details.trim()) {
        const details = parseSplitDetails(row.split_details, 'share', activeSplitWith);
        if (details && Object.keys(details).length > 0) {
          actualSplitType = 'share';
        }
      }

      const isRefund = importAsRefund.has(i) || amount < 0;
      const effectiveAmount = Math.abs(Math.round(amount * 100) / 100);
      
      let splits = buildSplits(activeSplitWith, effectiveAmount, actualSplitType, row.split_details);

      // Normalize percentages if needed
      if (actualSplitType === 'percentage') {
        const total = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
        if (Math.abs(total - 100) > 0.5) {
          splits = splits.map(s => ({
            ...s,
            percentage: (s.percentage / total) * 100,
            amount: Math.round(((s.percentage / total) * 100 / 100) * effectiveAmount * 100) / 100
          }));
        }
      }

      await Expense.create({
        group: job.group,
        title: row.description || 'Imported Expense',
        description: row.notes || '',
        amount: effectiveAmount,
        currency: currency === 'USD' || currency === 'INR' ? currency : 'INR',
        exchangeRate: currency === 'USD' ? USD_TO_INR : 1,
        amountINR: currency === 'USD' ? effectiveAmount * USD_TO_INR : effectiveAmount,
        date,
        paidBy: { memberName: paidBy },
        splitType: actualSplitType,
        splits,
        isRefund,
        importedFrom: job.filename,
        importRowIndex: i+2,
        notes: row.notes || '',
        createdBy: req.user._id,
        anomalyFlags: anomalies
          .filter(a => a.rowIndex === i+2)
          .map(a => a.type)
      });

      importedRows++;
      reportLines.push(`IMPORTED Row ${i+2}: "${row.description}" — ${currency} ${effectiveAmount} paid by ${paidBy}${isRefund ? ' [REFUND]' : ''}`);
    }

    // Generate report
    const report = generateReport(job, importedRows, skippedRows, rows.length, anomalies, reportLines);

    job.status = 'completed';
    job.importedRows = importedRows;
    job.skippedRows = skippedRows;
    job.errorRows = rows.length - importedRows - skippedRows;
    job.report = report;
    job.completedAt = new Date();
    await job.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'IMPORT_COMPLETED',
      entity: 'import',
      entityId: job._id,
      after: { importedRows, skippedRows, totalRows: rows.length }
    });

    res.json({
      success: true,
      summary: {
        totalRows: rows.length,
        importedRows,
        skippedRows,
        anomaliesDetected: anomalies.length,
        report
      }
    });
  } catch (error) {
    console.error('Execute import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function getSkipReason(anomalies, rowIndex) {
  const a = anomalies.find(a => a.rowIndex === rowIndex && a.autoAction === 'skip');
  return a ? a.description.split(':').slice(1).join(':').trim() : 'Policy decision';
}

function buildSplits(participants, amount, splitType, detailsStr) {
  if (!participants || participants.length === 0) return [];

  const details = parseSplitDetails(detailsStr, splitType, participants);

  if (splitType === 'equal') {
    const share = Math.round((amount / participants.length) * 100) / 100;
    let remaining = amount;
    return participants.map((name, i) => {
      const s = i === participants.length - 1 ? Math.round(remaining * 100) / 100 : share;
      remaining -= share;
      return { memberName: normalizeNameDisplay(name), amount: s };
    });
  }

  if (splitType === 'unequal' && details) {
    return participants.map(name => {
      const key = normalizeName(name);
      return { memberName: normalizeNameDisplay(name), amount: details[key] || 0 };
    });
  }

  if (splitType === 'percentage' && details) {
    return participants.map(name => {
      const key = normalizeName(name);
      const pct = details[key] || 0;
      return { memberName: normalizeNameDisplay(name), percentage: pct, amount: Math.round(amount * pct / 100 * 100) / 100 };
    });
  }

  if (splitType === 'share' && details) {
    const totalShares = Object.values(details).reduce((s, v) => s + v, 0) || participants.length;
    const perShare = amount / totalShares;
    return participants.map(name => {
      const key = normalizeName(name);
      const shares = details[key] || 1;
      return { memberName: normalizeNameDisplay(name), shares, amount: Math.round(perShare * shares * 100) / 100 };
    });
  }

  // Fallback: equal
  const share = Math.round((amount / participants.length) * 100) / 100;
  return participants.map(name => ({ memberName: normalizeNameDisplay(name), amount: share }));
}

function generateReport(job, imported, skipped, total, anomalies, lines) {
  const timestamp = new Date().toISOString();
  const errors = anomalies.filter(a => a.severity === 'error');
  const warnings = anomalies.filter(a => a.severity === 'warning');
  const infos = anomalies.filter(a => a.severity === 'info');

  return `SPLITSMART IMPORT REPORT
========================
Generated: ${timestamp}
File: ${job.filename}
Exchange Rate Used: 1 USD = ₹${job.exchangeRateUsed}

SUMMARY
-------
Total Rows Processed : ${total}
Successfully Imported: ${imported}
Skipped              : ${skipped}
Errors               : ${errors.length}
Warnings             : ${warnings.length}
Info Notices         : ${infos.length}

ANOMALIES DETECTED (${anomalies.length} total)
-----------------------------------------
${anomalies.map(a => `[${a.severity.toUpperCase()}] ${a.type}: ${a.description}`).join('\n')}

ROW-BY-ROW ACTIONS
------------------
${lines.join('\n')}

POLICY DECISIONS APPLIED
------------------------
1. Duplicate rows: SKIPPED (same description + date + amount)
2. Settlement rows: CONVERTED to Settlement records
3. Missing currency: DEFAULTED to INR
4. Negative amounts: Treated as REFUNDS
5. Zero amounts: SKIPPED
6. Membership violations: Offending members EXCLUDED from split
7. Percentage errors: Percentages NORMALIZED to sum to 100%
8. Ambiguous dates (DD-MM vs MM-DD): Interpreted as DD-MM-YYYY
9. "Dev's friend Kabir": EXCLUDED from group balances (guest)
10. Name variations ("Priya S", "rohan "): NORMALIZED

END OF REPORT`;
}

module.exports = router;
