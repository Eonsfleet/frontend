import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { formatRelativeTimeAt, useRelativeTime } from '@/hooks/useRelativeTime'

let renders = 0
function Label({ ts, id }: { ts: string; id: string }) {
  renders += 1
  return <span data-testid={id}>{useRelativeTime(ts)}</span>
}

describe('useRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-12T10:00:00Z'))
    renders = 0
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats the same ranges as before', () => {
    const now = Date.parse('2026-11-12T10:00:00Z')
    expect(formatRelativeTimeAt('2026-11-12T09:59:57Z', now)).toBe('Just now')
    expect(formatRelativeTimeAt('2026-11-12T09:59:30Z', now)).toBe('30 sec ago')
    expect(formatRelativeTimeAt('2026-11-12T09:58:00Z', now)).toBe('2 mins ago')
    expect(formatRelativeTimeAt('2026-11-12T08:00:00Z', now)).toBe('2 hrs ago')
    expect(formatRelativeTimeAt('2026-11-10T10:00:00Z', now)).toBe('2 days ago')
    expect(formatRelativeTimeAt(null, now)).toBe('—')
  })

  it('runs one timer however many labels are on the page, and stops it when they are gone', () => {
    const setSpy = vi.spyOn(globalThis, 'setInterval')
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = render(
      <>
        {Array.from({ length: 50 }, (_, i) => <Label key={i} id={`l${i}`} ts="2026-11-12T09:00:00Z" />)}
      </>,
    )
    expect(setSpy).toHaveBeenCalledTimes(1)
    unmount()
    expect(clearSpy).toHaveBeenCalledTimes(1)
  })

  it('re-renders a label only when its text changes', () => {
    render(<Label id="old" ts="2026-11-12T09:00:00Z" />) // an hour ago: changes once an hour
    const afterMount = renders
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(renders).toBe(afterMount)
    expect(screen.getByTestId('old').textContent).toBe('1 hr ago')
  })

  it('keeps a young label current', () => {
    render(<Label id="young" ts="2026-11-12T09:59:58Z" />)
    expect(screen.getByTestId('young').textContent).toBe('Just now')
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByTestId('young').textContent).toBe('12 sec ago')
  })

  it('does not tick while the tab is hidden, and catches up when it is shown', () => {
    render(<Label id="hidden" ts="2026-11-12T09:59:58Z" />)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(screen.getByTestId('hidden').textContent).toBe('Just now')
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByTestId('hidden').textContent).toBe('22 sec ago')
  })
})
