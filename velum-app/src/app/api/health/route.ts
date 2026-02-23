import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 *
 * Archie calls this to verify that all three data pipelines (nutrition,
 * fitness, budget) are reachable and operational. Returns a structured
 * summary that the agent can relay to the user.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {}
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://velum-five.vercel.app'

  const today = new Date().toISOString().split('T')[0]

  // ── Nutrition ──────────────────────────────────────────────────────────────
  try {
    const r = await fetch(`${base}/api/nutrition?date=${today}`, {
      headers: { 'x-health-check': '1' },
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) {
      const d = await r.json()
      checks.nutrition = {
        ok: true,
        detail: `${d.entries?.length ?? 0} entries today, ${d.totals?.calories ?? 0} kcal logged`,
      }
    } else {
      checks.nutrition = { ok: false, detail: `HTTP ${r.status}` }
    }
  } catch (e) {
    checks.nutrition = { ok: false, detail: String(e) }
  }

  // ── Fitness ────────────────────────────────────────────────────────────────
  try {
    const r = await fetch(`${base}/api/fitness?date=${today}`, {
      headers: { 'x-health-check': '1' },
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) {
      const d = await r.json()
      const count = d.entries?.length ?? d.weekData?.entries?.length ?? 0
      checks.fitness = { ok: true, detail: `${count} entries this week` }
    } else {
      checks.fitness = { ok: false, detail: `HTTP ${r.status}` }
    }
  } catch (e) {
    checks.fitness = { ok: false, detail: String(e) }
  }

  // ── Budget ─────────────────────────────────────────────────────────────────
  try {
    const r = await fetch(`${base}/api/budget?date=${today}`, {
      headers: { 'x-health-check': '1' },
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) {
      const d = await r.json()
      const spent = d.totals?.spent ?? d.totalSpent ?? 0
      const remaining = d.totals?.remaining ?? d.remaining ?? '?'
      checks.budget = { ok: true, detail: `€${spent} spent, €${remaining} remaining this week` }
    } else {
      checks.budget = { ok: false, detail: `HTTP ${r.status}` }
    }
  } catch (e) {
    checks.budget = { ok: false, detail: String(e) }
  }

  // ── Webhooks (passive check — just verify routes respond) ──────────────────
  try {
    const r = await fetch(`${base}/api/fitness/webhook`, {
      signal: AbortSignal.timeout(3000),
    })
    checks.fitnessWebhook = { ok: r.ok, detail: r.ok ? 'Fity webhook ready' : `HTTP ${r.status}` }
  } catch (e) {
    checks.fitnessWebhook = { ok: false, detail: String(e) }
  }

  try {
    const r = await fetch(`${base}/api/budget/webhook`, {
      signal: AbortSignal.timeout(3000),
    })
    checks.budgetWebhook = { ok: r.ok, detail: r.ok ? 'Budgy webhook ready' : `HTTP ${r.status}` }
  } catch (e) {
    checks.budgetWebhook = { ok: false, detail: String(e) }
  }

  const allOk = Object.values(checks).every(c => c.ok)

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    summary: allOk
      ? '✅ All systems operational. Nutrition, fitness, and budget pipelines are live.'
      : `⚠️ Some checks failed: ${Object.entries(checks).filter(([, v]) => !v.ok).map(([k]) => k).join(', ')}`,
  })
}
