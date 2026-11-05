import { NextResponse } from 'next/server'
import { flagsFromEnv } from '@/lib/analytics/flags'

/**
 * Runtime rollout flags for the Analytics rebuild. Read from server environment
 * variables on every request (never inlined at build time), so the kill switch
 * and the default can change with a process restart, not a rebuild:
 *
 *   ANALYTICS_V2_DEFAULT=legacy|v2     what everyone sees (production: legacy)
 *   ANALYTICS_V2_KILL_SWITCH=1         forces legacy for everyone
 *   ANALYTICS_V2_TESTER_IDS=12,48|*    users who may switch with ?ui=
 *
 * Nothing here is a secret: it holds a mode and user ids. It grants nothing;
 * Analytics access is still decided by the backend.
 */
export const dynamic = 'force-dynamic'

export function GET() {
    return NextResponse.json(flagsFromEnv(process.env), { headers: { 'Cache-Control': 'no-store' } })
}
