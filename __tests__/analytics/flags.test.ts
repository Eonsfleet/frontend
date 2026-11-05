import { describe, expect, it } from 'vitest'
import { flagsFromEnv, isTester, resolveAnalyticsUi, type RuntimeFlags } from '@/lib/analytics/flags'

const flags = (over: Partial<RuntimeFlags> = {}): RuntimeFlags => ({ default: 'legacy', killSwitch: false, testerIds: ['12'], ...over })

describe('analytics rollout flag', () => {
    it('shows the existing experience by default, to everyone', () => {
        expect(resolveAnalyticsUi({ flags: flags(), userId: '99' })).toEqual({ ui: 'legacy', source: 'default', canSwitch: false })
    })

    it('follows URL override, then cookie, then default, for a tester', () => {
        const base = { flags: flags(), userId: '12' }
        expect(resolveAnalyticsUi({ ...base })).toMatchObject({ ui: 'legacy', source: 'default', canSwitch: true })
        expect(resolveAnalyticsUi({ ...base, cookieOverride: 'v2' })).toMatchObject({ ui: 'v2', source: 'cookie' })
        expect(resolveAnalyticsUi({ ...base, cookieOverride: 'v2', urlOverride: 'legacy' })).toMatchObject({ ui: 'legacy', source: 'url' })
    })

    it('ignores overrides from anyone who is not an authorized tester', () => {
        const result = resolveAnalyticsUi({ flags: flags(), userId: '99', urlOverride: 'v2', cookieOverride: 'v2' })
        expect(result).toMatchObject({ ui: 'legacy', source: 'default', canSwitch: false })
    })

    it('ignores unrecognized override values', () => {
        expect(resolveAnalyticsUi({ flags: flags(), userId: '12', urlOverride: 'beta', cookieOverride: 'x' }).source).toBe('default')
    })

    it('lets the environment default move everyone to v2 without letting them switch', () => {
        expect(resolveAnalyticsUi({ flags: flags({ default: 'v2' }), userId: '99' })).toEqual({ ui: 'v2', source: 'default', canSwitch: false })
    })

    it('kill switch beats everything, including a tester override', () => {
        const result = resolveAnalyticsUi({ flags: flags({ default: 'v2', killSwitch: true }), userId: '12', urlOverride: 'v2', cookieOverride: 'v2' })
        expect(result).toEqual({ ui: 'legacy', source: 'kill-switch', canSwitch: true })
    })

    it('treats * as every user a tester (staging) and an empty list as nobody', () => {
        expect(isTester(flags({ testerIds: '*' }), 5)).toBe(true)
        expect(isTester(flags({ testerIds: [] }), 5)).toBe(false)
        expect(isTester(flags(), null)).toBe(false)
    })

    it('reads the server environment, with unrecognized values falling to the safe one', () => {
        expect(flagsFromEnv({})).toEqual({ default: 'legacy', killSwitch: false, testerIds: [] })
        expect(flagsFromEnv({ ANALYTICS_V2_DEFAULT: 'v2', ANALYTICS_V2_KILL_SWITCH: '1', ANALYTICS_V2_TESTER_IDS: ' 3, 4 ,' })).toEqual({ default: 'v2', killSwitch: true, testerIds: ['3', '4'] })
        expect(flagsFromEnv({ ANALYTICS_V2_DEFAULT: 'yes', ANALYTICS_V2_TESTER_IDS: '*' })).toMatchObject({ default: 'legacy', testerIds: '*' })
    })
})
