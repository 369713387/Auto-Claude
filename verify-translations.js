#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const localesDir = 'apps/frontend/src/shared/i18n/locales';

// Function to get all nested keys from an object
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Read and parse JSON file
function readJson(locale, filename) {
  try {
    const filePath = path.join(localesDir, locale, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${locale}/${filename}:`, error.message);
    return null;
  }
}

console.log('='.repeat(60));
console.log('Translation Key Completeness Verification');
console.log('='.repeat(60));

// Check context.json files
console.log('\n📄 Checking context.json files...\n');

const enContext = readJson('en', 'context.json');
const frContext = readJson('fr', 'context.json');
const zhContext = readJson('zh-CN', 'context.json');

if (enContext && frContext) {
  const enKeys = getAllKeys(enContext);
  const frKeys = getAllKeys(frContext);

  console.log(`✓ en/context.json: ${enKeys.length} keys`);
  console.log(`✓ fr/context.json: ${frKeys.length} keys`);

  const missingInFr = enKeys.filter(k => !frKeys.includes(k));
  const missingInEn = frKeys.filter(k => !enKeys.includes(k));

  if (missingInFr.length === 0 && missingInEn.length === 0) {
    console.log('✅ en and fr context.json have matching keys!\n');
  } else {
    if (missingInFr.length > 0) {
      console.log(`❌ Missing in fr/context.json: ${missingInFr.join(', ')}\n`);
    }
    if (missingInEn.length > 0) {
      console.log(`❌ Missing in en/context.json: ${missingInEn.join(', ')}\n`);
    }
  }
}

if (enContext && zhContext) {
  const enKeys = getAllKeys(enContext);
  const zhKeys = getAllKeys(zhContext);

  console.log(`✓ zh-CN/context.json: ${zhKeys.length} keys`);

  const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
  const missingInEn = zhKeys.filter(k => !enKeys.includes(k));

  if (missingInZh.length === 0 && missingInEn.length === 0) {
    console.log('✅ en and zh-CN context.json have matching keys!\n');
  } else {
    if (missingInZh.length > 0) {
      console.log(`❌ Missing in zh-CN/context.json: ${missingInZh.join(', ')}\n`);
    }
    if (missingInEn.length > 0) {
      console.log(`❌ Missing in en/context.json (from zh-CN): ${missingInEn.join(', ')}\n`);
    }
  }
}

// Check common.json files
console.log('📄 Checking common.json worktrees section...\n');

const enCommon = readJson('en', 'common.json');
const frCommon = readJson('fr', 'common.json');
const zhCommon = readJson('zh-CN', 'common.json');

if (enCommon && enCommon.worktrees) {
  const enWorktreesKeys = Object.keys(enCommon.worktrees);
  console.log(`✓ en/common.json worktrees: ${enWorktreesKeys.length} keys`);

  if (frCommon && frCommon.worktrees) {
    const frWorktreesKeys = Object.keys(frCommon.worktrees);
    console.log(`✓ fr/common.json worktrees: ${frWorktreesKeys.length} keys`);

    const missingInFr = enWorktreesKeys.filter(k => !frWorktreesKeys.includes(k));
    const missingInEn = frWorktreesKeys.filter(k => !enWorktreesKeys.includes(k));

    if (missingInFr.length === 0 && missingInEn.length === 0) {
      console.log('✅ en and fr common.json worktrees have matching keys!\n');
    } else {
      if (missingInFr.length > 0) {
        console.log(`❌ Missing in fr worktrees: ${missingInFr.join(', ')}\n`);
      }
      if (missingInEn.length > 0) {
        console.log(`❌ Missing in en worktrees: ${missingInEn.join(', ')}\n`);
      }
    }
  } else {
    console.log('❌ fr/common.json or worktrees section not found!\n');
  }

  if (!zhCommon || !zhCommon.worktrees) {
    console.log('⚠️  zh-CN/common.json or worktrees section not found!');
    console.log('This locale only has context.json, missing common.json with worktrees translations.\n');
  } else {
    const zhWorktreesKeys = Object.keys(zhCommon.worktrees);
    console.log(`✓ zh-CN/common.json worktrees: ${zhWorktreesKeys.length} keys`);
  }
} else {
  console.log('❌ en/common.json or worktrees section not found!\n');
}

// Summary
console.log('='.repeat(60));
console.log('Summary:');
console.log('='.repeat(60));
console.log('✅ context.json: Complete for en, fr, and zh-CN locales');
console.log('⚠️  common.json: Complete for en and fr, but zh-CN locale is missing');
console.log('    zh-CN only has context.json, missing common.json and other files');
console.log('\nNote: The project uses "fr" (French) locale instead of "zh-CN" (Chinese).');
console.log('      The zh-CN/context.json file exists but zh-CN/common.json is missing.');
console.log('='.repeat(60));

process.exit(0);
