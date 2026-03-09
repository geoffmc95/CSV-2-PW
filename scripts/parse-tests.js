#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.resolve(__dirname, '..', 'TESTS-TO-CONVERT');
const OUTPUT_DIR = path.resolve(TESTS_DIR, 'parsed');

// ---------------------------------------------------------------------------
// CSV parsing (handles quoted fields with embedded commas / newlines)
// ---------------------------------------------------------------------------

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(content, sourceFile) {
  const lines = content.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const idIdx = headers.indexOf('ID');
  const titleIdx = headers.indexOf('Title');
  const stepIdx = headers.indexOf('Test Step');
  const actionIdx = headers.indexOf('Step Action');
  const expectedIdx = headers.indexOf('Step Expected');

  if ([idIdx, stepIdx, actionIdx, expectedIdx].includes(-1)) {
    console.error(`  ⚠  CSV "${sourceFile}" missing required columns (ID, Test Step, Step Action, Step Expected)`);
    return [];
  }

  const testCases = [];
  let current = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const id = cols[idIdx];
    const title = cols[titleIdx];

    // A non-empty ID signals a new test case
    if (id) {
      current = { id, title: title || '', source_format: 'csv', steps: [] };
      testCases.push(current);
    }

    if (!current) continue;

    const stepNum = parseInt(cols[stepIdx], 10);
    if (isNaN(stepNum)) continue;

    current.steps.push({
      step: stepNum,
      action: cols[actionIdx] || '',
      expected: cols[expectedIdx] || '',
    });
  }

  return testCases;
}

// ---------------------------------------------------------------------------
// JSON parsing (ADO-style with test_flow array)
// ---------------------------------------------------------------------------

function parseJson(content, sourceFile) {
  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    console.error(`  ⚠  JSON "${sourceFile}" is not valid JSON: ${err.message}`);
    return [];
  }

  // Support single object or array of objects
  const items = Array.isArray(data) ? data : [data];

  return items.map(item => {
    const id = String(item.test_id || item.id || '');
    const title = item.test_name || item.title || '';
    const flow = item.test_flow || item.steps || [];

    return {
      id,
      title,
      source_format: 'json',
      steps: flow.map((s, i) => ({
        step: s.step ?? i + 1,
        action: s.action || '',
        expected: s.verify || s.expected || '',
      })),
      ...(item.test_data ? { test_data: item.test_data } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');
  const baseName = path.basename(filePath);

  if (ext === '.csv') return parseCsv(content, baseName);
  if (ext === '.json') return parseJson(content, baseName);

  console.error(`  ⚠  Skipping unsupported file type: ${baseName}`);
  return [];
}

function getOutPath(filePath) {
  const outName = path.basename(filePath, path.extname(filePath)) + '.parsed.json';
  return path.join(OUTPUT_DIR, outName);
}

function isUpToDate(sourcePath, outPath) {
  if (!fs.existsSync(outPath)) return false;
  const srcMtime = fs.statSync(sourcePath).mtimeMs;
  const outMtime = fs.statSync(outPath).mtimeMs;
  return outMtime >= srcMtime;
}

function run() {
  const rawArgs = process.argv.slice(2);
  const force = rawArgs.includes('--force');
  const args = rawArgs.filter(a => a !== '--force');
  const files = [];

  if (args.length > 0) {
    // Explicit file(s) passed as arguments
    for (const arg of args) {
      const resolved = path.resolve(arg);
      if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${arg}`);
        process.exit(1);
      }
      files.push(resolved);
    }
  } else {
    // Default: process all CSV/JSON in TESTS-TO-CONVERT/
    if (!fs.existsSync(TESTS_DIR)) {
      console.error(`TESTS-TO-CONVERT/ directory not found at ${TESTS_DIR}`);
      process.exit(1);
    }
    const entries = fs.readdirSync(TESTS_DIR);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (ext === '.csv' || ext === '.json') {
        files.push(path.join(TESTS_DIR, entry));
      }
    }
  }

  if (files.length === 0) {
    console.log('No CSV or JSON files found to process.');
    return;
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let parsed = 0;
  let skipped = 0;

  for (const filePath of files) {
    const baseName = path.basename(filePath);
    const outPath = getOutPath(filePath);
    const outName = path.basename(outPath);

    if (!force && isUpToDate(filePath, outPath)) {
      console.log(`  ⏭  ${baseName} — already up to date, skipped`);
      skipped++;
      continue;
    }

    const testCases = processFile(filePath);
    const totalSteps = testCases.reduce((sum, tc) => sum + tc.steps.length, 0);

    const output = {
      source_file: baseName,
      parsed_at: new Date().toISOString(),
      test_cases: testCases,
    };

    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`  ✔  ${baseName} → ${testCases.length} test case(s), ${totalSteps} step(s) → parsed/${outName}`);
    parsed++;
  }

  console.log(`\nDone. ${parsed} parsed, ${skipped} skipped.`);
}

run();

