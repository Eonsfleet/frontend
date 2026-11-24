import { NextRequest, NextResponse } from 'next/server'

/**
 * Same-origin passthrough for document files (PDF / text) shown in the
 * documents lightbox. The storage host sends `X-Frame-Options: DENY`, a
 * sandbox CSP and no CORS headers, so the browser refuses to embed or fetch
 * the file directly. Only hosts we own are allowed, and only inert types.
 */

const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'text/csv', 'application/json', 'text/markdown']

function allowedHosts(): Set<string> {
    const hosts = new Set<string>(['res.cloudinary.com'])
    try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL
        // The env value may omit the scheme (e.g. "api.eonsfleet.io/v1").
        if (base) hosts.add(new URL(/^https?:\/\//.test(base) ? base : `https://${base}`).host)
    } catch {
        /* ignore malformed env */
    }
    return hosts
}

export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('url')
    let target: URL
    try {
        target = new URL(raw ?? '')
    } catch {
        return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }

    if (target.protocol !== 'https:' || !allowedHosts().has(target.host)) {
        return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
    }

    const upstream = await fetch(target, { redirect: 'error' }).catch(() => null)
    if (!upstream || !upstream.ok || !upstream.body) {
        return NextResponse.json({ error: 'File unavailable' }, { status: 502 })
    }

    const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_TYPES.includes(type)) {
        return NextResponse.json({ error: 'Unsupported type' }, { status: 415 })
    }

    return new NextResponse(upstream.body, {
        headers: {
            'Content-Type': type,
            'Content-Disposition': 'inline',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'private, max-age=300',
        },
    })
}
