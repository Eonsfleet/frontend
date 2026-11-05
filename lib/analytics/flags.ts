/**
 * Which Analytics experience a user sees: the existing one ("legacy") or the
 * rebuilt one ("v2"). This is a technical rollout flag, separate from the
 * subscription entitlement, which UpgradeGate and the backend still decide.
 *
 * Precedence, highest first:
 *   1. kill switch (runtime)       -> legacy, for everyone, whatever else is set
 *   2. ?ui=v2|legacy in the URL    -> only for authorized testers
 *   3. the ui cookie               -> only for authorized testers
 *   4. the environment default     -> everyone; production default is legacy
 *
 * NEXT_PUBLIC_* values are inlined when the app is built, so they cannot be
 * changed without a rebuild. Everything that must change without one (default,
 * kill switch, tester list) comes from /api/analytics-flags, read from server
 * environment variables on each request; the build-time value is only the
 * fallback when that endpoint cannot be reached.
 */

export type AnalyticsUi = 'legacy' | 'v2'

export const UI_COOKIE = 'ef-analytics-ui'
export const UI_PARAM = 'ui'

/** What /api/analytics-flags returns. Tester ids are user ids, or '*' for every user (staging). */
export interface RuntimeFlags {
    default: AnalyticsUi
    killSwitch: boolean
    testerIds: string[] | '*'
}

/** Used until the runtime flags load, and when they cannot be loaded. */
export const FALLBACK_FLAGS: RuntimeFlags = {
    default: process.env.NEXT_PUBLIC_ANALYTICS_V2 === 'true' ? 'v2' : 'legacy',
    killSwitch: false,
    testerIds: [],
}

export interface UiDecision {
    ui: AnalyticsUi
    /** Why this experience was chosen, for the tester badge and for debugging. */
    source: 'kill-switch' | 'url' | 'cookie' | 'default'
    /** Whether this user may switch manually. */
    canSwitch: boolean
}

const asUi = (value: string | null | undefined): AnalyticsUi | null =>
    value === 'v2' || value === 'legacy' ? value : null

export const isTester = (flags: RuntimeFlags, userId: string | number | null | undefined): boolean => {
    if (flags.testerIds === '*') return true
    if (userId === null || userId === undefined || userId === '') return false
    return flags.testerIds.includes(String(userId))
}

export function resolveAnalyticsUi(input: {
    flags: RuntimeFlags
    userId: string | number | null | undefined
    urlOverride?: string | null
    cookieOverride?: string | null
}): UiDecision {
    const { flags, userId } = input
    const canSwitch = isTester(flags, userId)

    if (flags.killSwitch) return { ui: 'legacy', source: 'kill-switch', canSwitch }

    if (canSwitch) {
        const fromUrl = asUi(input.urlOverride)
        if (fromUrl) return { ui: fromUrl, source: 'url', canSwitch }
        const fromCookie = asUi(input.cookieOverride)
        if (fromCookie) return { ui: fromCookie, source: 'cookie', canSwitch }
    }

    return { ui: flags.default, source: 'default', canSwitch }
}

/** Parses the server environment into the flags payload. Anything unrecognized is the safe value. */
export function flagsFromEnv(env: Record<string, string | undefined>): RuntimeFlags {
    const testers = (env.ANALYTICS_V2_TESTER_IDS ?? '').trim()
    return {
        default: env.ANALYTICS_V2_DEFAULT === 'v2' ? 'v2' : 'legacy',
        killSwitch: env.ANALYTICS_V2_KILL_SWITCH === '1' || env.ANALYTICS_V2_KILL_SWITCH === 'true',
        testerIds: testers === '*' ? '*' : testers.split(',').map((s) => s.trim()).filter(Boolean),
    }
}
