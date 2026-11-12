/**
 * Maintenance amounts come from the backend in kobo (naira x 100, the field names say
 * so). This is only the display step the project documents; it does not repair or
 * guess a unit.
 */
export const nairaFromKobo = (kobo: number | null | undefined): string =>
    kobo === null || kobo === undefined ? '—' : `₦${(kobo / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
