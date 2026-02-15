// Validation script for extension files
const fs = require('fs');
const path = require('path');

console.log('🧪 Extension Validation\n');

const files = [
  'manifest.json',
  'hello.html',
  'storage.js',
  'gemini-api.js',
  'popup.js',
  'background.js',
  'styles.css',
  'hello_extensions.png'
];

let passed = 0;
let failed = 0;

// Check all files exist
console.log('📁 Checking files...');
files.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✓' : '✗';
  console.log(`  ${status} ${file}`);
  if (exists) passed++; else failed++;
});

// Validate manifest.json
console.log('\n📋 Validating manifest.json...');
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  console.log('  ✓ Valid JSON');

  const required = ['name', 'version', 'manifest_version', 'action'];
  required.forEach(key => {
    const has = key in manifest;
    console.log(`  ${has ? '✓' : '✗'} ${key}: ${has ? manifest[key] : 'missing'}`);
    if (has) passed++; else failed++;
  });

  const hasStorage = manifest.permissions && manifest.permissions.includes('storage');
  console.log(`  ${hasStorage ? '✓' : '✗'} permissions.storage`);
  if (hasStorage) passed++; else failed++;

  const hasAlarms = manifest.permissions && manifest.permissions.includes('alarms');
  console.log(`  ${hasAlarms ? '✓' : '✗'} permissions.alarms`);
  if (hasAlarms) passed++; else failed++;

  const hasBackground = manifest.background && manifest.background.service_worker;
  console.log(`  ${hasBackground ? '✓' : '✗'} background.service_worker`);
  if (hasBackground) passed++; else failed++;

} catch (e) {
  console.log('  ✗ Invalid JSON:', e.message);
  failed += 5;
}

// Validate HTML structure
console.log('\n🌐 Validating hello.html...');
const html = fs.readFileSync('hello.html', 'utf8');
const checks = [
  ['DOCTYPE', '<!DOCTYPE html'],
  ['title', '<title>Daily Affirmation Checklist</title>'],
  ['header', 'id="dateDisplay"'],
  ['input field', 'id="taskInput"'],
  ['task list', 'id="taskList"'],
  ['affirmation section', 'id="affirmationSection"'],
  ['storage script', 'src="storage.js"'],
  ['gemini script', 'src="gemini-api.js"'],
  ['popup script', 'src="popup.js"'],
  ['CSS link', 'href="styles.css"']
];

checks.forEach(([name, pattern]) => {
  const has = html.includes(pattern);
  console.log(`  ${has ? '✓' : '✗'} ${name}`);
  if (has) passed++; else failed++;
});

// Check JavaScript syntax
console.log('\n✅ Checking JavaScript syntax...');
const jsFiles = ['storage.js', 'gemini-api.js', 'popup.js', 'background.js'];
jsFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  try {
    new Function(code);
    console.log(`  ✓ ${file}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${file}: ${e.message}`);
    failed++;
  }
});

// Check CSS syntax (basic)
console.log('\n🎨 Checking CSS...');
const css = fs.readFileSync('styles.css', 'utf8');
const cssChecks = [
  ['body selector', 'body {'],
  ['container', '.container'],
  ['header', '.header'],
  ['task-item', '.task-item'],
  ['affirmation section', '.affirmation-section'],
  ['animations', '@keyframes']
];

cssChecks.forEach(([name, pattern]) => {
  const has = css.includes(pattern);
  console.log(`  ${has ? '✓' : '✗'} ${name}`);
  if (has) passed++; else failed++;
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`${'='.repeat(50)}`);

if (failed === 0) {
  console.log('\n✨ All validation checks passed!');
  console.log('\n📖 Next steps:');
  console.log('1. Open Chrome and go to chrome://extensions');
  console.log('2. Enable "Developer mode" (top right)');
  console.log('3. Click "Load unpacked"');
  console.log('4. Select this extension folder');
  console.log('5. Click the extension icon to open the popup');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please review.');
  process.exit(1);
}
