'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * True once the element has come near the viewport, and stays true. Used to
 * start below-the-fold queries late, so the Overview does not send every
 * request on mount.
 */
export function useInView<T extends Element>(rootMargin = '300px') {
    const ref = useRef<T | null>(null)
    const [seen, setSeen] = useState(false)

    useEffect(() => {
        const node = ref.current
        if (seen || !node) return
        if (typeof IntersectionObserver === 'undefined') {
            // No observer to wait for: treat it as seen, on the next frame.
            const frame = requestAnimationFrame(() => setSeen(true))
            return () => cancelAnimationFrame(frame)
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setSeen(true)
                    observer.disconnect()
                }
            },
            { rootMargin },
        )
        observer.observe(node)
        return () => observer.disconnect()
    }, [seen, rootMargin])

    return { ref, seen }
}
