#!/usr/bin/env node
'use strict'
// Self-Test and Auto-Heal Script — BMS v1.2.0
// Usage:
//   node scripts/self-test-and-heal.js          # run tests only, report failures
//   node scripts/self-test-and-heal.js --heal    # attempt auto-fix of known failure patterns
//   node scripts/self-test-and-heal.js --check   # run expert-council-validate only

const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const HEAL = process.argv.includes('--heal')
const CHECK_ONLY = process.argv.includes('--check')

// ── Known fixable failure patterns ──────────────────────────────────────────
const HEAL_PATTERNS = [
  {
    name: 'SQLite WAL corruption',
    detect: (output) => /cannot rollback|no transaction is active|database is locked/i.test(output),
    heal: () => {
      console.log('  → Removing stale SQLite WAL/SHM files...')
      for (const ext of ['', '-wal', '-shm', '-journal']) {
        const f = path.join(ROOT, `db.sqlite${ext}`)
        if (fs.existsSync(f)) { fs.unlinkSync(f); console.log(`    Deleted ${f}`) }
      }
      console.log('  → Re-deploying to SQLite...')
      execSync('npx cds deploy --to sqlite:db.sqlite', { cwd: ROOT, stdio: 'inherit' })
    }
  },
  {
    name: 'Natural key date collision',
    detect: (output) => /natural.key|duplicate.*date|already exists.*date/i.test(output),
    heal: () => {
      console.log('  → Natural key collision detected. Bump test dates to 2099+ manually.')
      console.log('  → See CLAUDE.md: "natural key collision workaround"')
    }
  },
  {
    name: 'CDS compile error',
    detect: (output) => /\[ERROR\].*cds|artifact not found|circular/i.test(output),
    heal: () => {
      console.log('  → CDS compile error detected. Running compile to show full errors:')
      try { execSync('npx cds compile db/ srv/', { cwd: ROOT, stdio: 'inherit' }) }
      catch { /* show errors */ }
    }
  },
  {
    name: 'CSRF token missing in test',
    detect: (output) => /csrf|403.*token|token.*invalid/i.test(output),
    heal: () => {
      console.log('  → CSRF error: ensure test uses X-CSRF-Token: fetch pattern.')
      console.log('  → See CLAUDE.md: "CSRF tokens in custom REST fetch calls"')
    }
  },
  {
    name: 'FLP JSON parse error',
    detect: (output) => /fioriSandboxConfig|JSON.*parse|Unexpected.*token/i.test(output),
    heal: () => {
      console.log('  → Validating fioriSandboxConfig.json...')
      try {
        require(path.join(ROOT, 'app/appconfig/fioriSandboxConfig.json'))
        console.log('  → JSON is valid.')
      } catch (e) {
        console.error('  ❌ Invalid JSON:', e.message)
        console.log('  → Fix: check for trailing commas in fioriSandboxConfig.json')
      }
    }
  }
]

async function runTests() {
  console.log('\n📋 Running test suite...\n')
  const result = spawnSync('npm', ['test'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 })
  const output = (result.stdout || '') + (result.stderr || '')
  const passed = output.match(/(\d+) passed/)?.[1]
  const failed = output.match(/(\d+) failed/)?.[1]
  console.log(output)
  return { output, exitCode: result.status, passed: parseInt(passed || 0), failed: parseInt(failed || 0) }
}

function runExpertCouncil() {
  console.log('\n🔬 Running Expert Council validation...\n')
  const result = spawnSync('node', [path.join(ROOT, 'scripts/expert-council-validate.js')], { cwd: ROOT, encoding: 'utf8', timeout: 60000 })
  console.log(result.stdout || '')
  if (result.stderr) console.error(result.stderr)
  return result.status === 0
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  BMS Self-Test and Auto-Heal Runner                  ║')
  console.log(`║  Mode: ${HEAL ? 'HEAL' : CHECK_ONLY ? 'CHECK-ONLY' : 'TEST-ONLY'}${' '.repeat(44 - (HEAL ? 4 : CHECK_ONLY ? 10 : 9))}║`)
  console.log('╚══════════════════════════════════════════════════════╝')

  if (CHECK_ONLY) {
    const ok = runExpertCouncil()
    process.exit(ok ? 0 : 1)
  }

  const { output, exitCode, passed, failed } = await runTests()

  if (exitCode === 0) {
    console.log(`\n✅ All tests passed (${passed} passing)`)
    if (HEAL) {
      console.log('\nRunning expert council validation as final check...')
      runExpertCouncil()
    }
    process.exit(0)
  }

  console.log(`\n❌ ${failed} test(s) failed. Analysing failure patterns...`)

  const applied = []
  for (const pattern of HEAL_PATTERNS) {
    if (pattern.detect(output)) {
      console.log(`\n⚕️  Pattern detected: ${pattern.name}`)
      if (HEAL) {
        try { pattern.heal(); applied.push(pattern.name) }
        catch (e) { console.error(`  Heal failed: ${e.message}`) }
      } else {
        console.log(`  (run with --heal to attempt auto-fix)`)
      }
    }
  }

  if (HEAL && applied.length > 0) {
    console.log(`\n🔄 Applied ${applied.length} heal(s): ${applied.join(', ')}`)
    console.log('Re-running tests...\n')
    const retry = await runTests()
    if (retry.exitCode === 0) {
      console.log(`\n✅ Healed! Tests now passing (${retry.passed} passing)`)
      process.exit(0)
    } else {
      console.log(`\n❌ ${retry.failed} test(s) still failing after heal. Manual intervention required.`)
      process.exit(1)
    }
  }

  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(2) })
