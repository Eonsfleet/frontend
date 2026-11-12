'use client'

import { useEffect, useState } from 'react'

/** The current time, refreshed on an interval, so ages on screen keep moving without reading the clock during render. */
export function useNow(intervalMs = 30_000): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), intervalMs)
        return () => window.clearInterval(id)
    }, [intervalMs])
    return now
}
