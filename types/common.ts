export interface Address {
    street?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
}

export interface ApiError {
    message: string
    errors: Array<{
        status: string
        code: string
        title: string
        detail: string
        source?: { pointer: string }
    }>
}

export interface Paginated<T> {
    data: T[]
    pagination: {
        current: number
        lastPage: number
        last_page?: number   // API returns snake_case; prefer lastPage, fall back to last_page
        perPage: number
        total: number
        next_page_url: string | null
        prev_page_url: string | null
        from: number
    }
}
