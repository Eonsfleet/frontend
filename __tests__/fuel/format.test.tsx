import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
    changeSentiment,
    formatAge,
    formatChange,
    formatHoursToEmpty,
    formatLitres,
    formatNaira,
} from '@/lib/fuel-format'
import { QualityBadge } from '@/app/(portal)/fuel/components/shared/QualityBadge'
import { FreshnessLabel } from '@/app/(portal)/fuel/components/shared/FreshnessLabel'

describe('fuel figures say how they were obtained', () => {
    it('marks calculated and estimated litres with ≈ and leaves measured ones plain', () => {
        expect(formatLitres(56, 'measured')).toBe('56.0 L')
        expect(formatLitres(56, 'calculated')).toBe('≈ 56.0 L')
        expect(formatLitres(56, 'estimated')).toBe('≈ 56.0 L')
    })

    it('shows unknown as a dash, never zero', () => {
        expect(formatLitres(null)).toBe('—')
        expect(formatLitres(undefined)).toBe('—')
        expect(formatLitres(0)).toBe('0.0 L') // a real zero is a reading
        expect(formatNaira(null)).toBe('—')
        expect(formatHoursToEmpty(null)).toBe('—')
        expect(formatAge(null)).toBe('—')
        expect(formatChange(null)).toBe('—')
    })

    it('formats ages and time to empty humanly', () => {
        expect(formatAge(0)).toBe('just now')
        expect(formatAge(14)).toBe('14 min ago')
        expect(formatAge(125)).toBe('2 h ago')
        expect(formatAge(3000)).toBe('2 d ago')
        expect(formatHoursToEmpty(0.5)).toBe('30 min')
        expect(formatHoursToEmpty(9)).toBe('9 h')
        expect(formatNaira(1234567.4)).toBe('₦1,234,567')
        expect(formatChange(12.34)).toBe('+12.3%')
        expect(formatChange(-3)).toBe('-3.0%')
    })

    it('reads a rise as bad for spend and a fall as good, and treats noise as flat', () => {
        expect(changeSentiment(8)).toBe('bad')
        expect(changeSentiment(-8)).toBe('good')
        expect(changeSentiment(0.4)).toBe('flat')
        expect(changeSentiment(8, false)).toBe('good')
        expect(changeSentiment(null)).toBeNull()
    })
})

describe('badges', () => {
    it('labels the basis of a number', () => {
        render(<QualityBadge quality="calculated" />)
        expect(screen.getByText('Calculated')).toBeTruthy()
    })

    it('says no data rather than guessing', () => {
        render(<QualityBadge quality={null} />)
        expect(screen.getByText('No data')).toBeTruthy()
    })

    it('shows live and stale with their age', () => {
        render(<><FreshnessLabel freshness="live" ageMinutes={3} /><FreshnessLabel freshness="stale" ageMinutes={120} /></>)
        expect(screen.getByText('Live')).toBeTruthy()
        expect(screen.getByText('· 3 min ago')).toBeTruthy()
        expect(screen.getByText('Stale')).toBeTruthy()
        expect(screen.getByText('· 2 h ago')).toBeTruthy()
    })
})
