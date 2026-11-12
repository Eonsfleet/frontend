/** A typed litre figure: a non-negative number, or null when it is blank or not one. */
export function parseLitres(text: string): number | null {
    if (text.trim() === '') return null
    const n = Number(text)
    return Number.isFinite(n) && n >= 0 ? n : null
}
