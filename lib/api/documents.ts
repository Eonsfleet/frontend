import apiClient from './client'

export interface DocumentAttributes {
    title: string
    type: string
    category: 'registration' | 'insurance' | 'inspection' | string
    description: string | null
    file_path: string
    file_disk?: string
    issued_at: string | null
    expiry_at: string | null
    status: 'active' | 'expired' | string
    created_at: string
}

export interface Document {
    id: string
    attributes: DocumentAttributes
    relationships?: {
        uploaded_by?: { id: number; f_name: string; l_name: string }
        belong_to?: { id: number; make: string; model: string; registration_number: string }
        organization?: { id: number; name: string }
    }
}

export interface DocumentListResponse {
    message: string
    data: {
        documents: Document[]
        paginate: {
            total: number
            page: number
            per_page: number
            last_page: number
        }
    }
    status: number
}

export interface CreateDocumentPayload {
    type: 'vehicle' | 'driver'
    related_id: number | string
    category: string
    file_path: string
    title?: string
    description?: string
    issued_at?: string
    expires_at?: string
}

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
    })
}

export const uploadFile = async (file: File, folder?: string): Promise<{ url: string }> => {
    const base64Data = await fileToBase64(file)

    // Create the payload exactly as the documentation specifies
    const payload = {
        file: base64Data,
        disk: process.env.NEXT_PUBLIC_UPLOAD_DISK_TYPE || 'public',
        folder: folder ?? (process.env.NEXT_PUBLIC_UPLOAD_FOLDER || 'documents/')
    }

    const response = await apiClient.post<any>('/file/upload', payload)

    // Response shape priority: { data: { file: { url } } } → { data: { url } } → { url }
    const url = response.data?.data?.file?.url || response.data?.data?.url || response.data?.url
    if (!url) {
        console.error('Upload response missing URL:', response.data)
        throw new Error('Upload failed: No URL returned from server')
    }
    return { url }
}

export const createDocument = async (payload: CreateDocumentPayload): Promise<{ message: string; data: Document }> => {
    // Ensure related_id is a number if the payload expects it
    const formattedPayload = {
        ...payload,
        related_id: typeof payload.related_id === 'string' ? parseInt(payload.related_id, 10) : payload.related_id
    }
    const response = await apiClient.post<{ message: string; data: Document }>('/documents', formattedPayload)
    return response.data
}

export const getVehicleDocuments = async (vehicleId: string | number): Promise<DocumentListResponse> => {
    const response = await apiClient.get<DocumentListResponse>(`/documents/vehicle/${vehicleId}`)
    return response.data
}

export const getDriverDocuments = async (driverId: string | number): Promise<DocumentListResponse> => {
    const response = await apiClient.get<DocumentListResponse>(`/documents/driver/${driverId}`)
    return response.data
}

export interface GetAllDocumentsParams {
    page?: number
    search?: string
    type?: 'vehicle' | 'driver'
    category?: string
    status?: string
}

export const getAllDocuments = async (params?: GetAllDocumentsParams): Promise<DocumentListResponse> => {
    const response = await apiClient.get<DocumentListResponse>('/documents', { params })
    return response.data
}

export const deleteDocument = async (documentId: string | number): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}`)
}

export const downloadDocument = async (documentId: string | number, filename?: string) => {
    const response = await apiClient.get(`/documents/${documentId}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `document-${documentId}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// Alternatively, if we need to fetch it as a blob:
export const fetchDocumentFile = async (documentId: string | number) => {
    const response = await apiClient.get(`/documents/${documentId}`, { responseType: 'blob' })
    return response.data
}

export type DocumentOwnerKind = 'vehicle' | 'driver'

const OWNER_KINDS: string[] = ['vehicle', 'driver']

const normalise = (value?: string | null) => (value ?? '').trim().toLowerCase()

/**
 * The API is inconsistent about which of `type` / `category` holds the owner
 * ("vehicle" | "driver") and which holds the document kind ("registration"…),
 * so look at both. Returns null when neither field says, rather than guessing.
 */
export const getDocumentOwnerKind = (doc: Document): DocumentOwnerKind | null => {
    for (const value of [doc.attributes.category, doc.attributes.type]) {
        const v = normalise(value)
        if (OWNER_KINDS.includes(v)) return v as DocumentOwnerKind
    }
    const owner = getDocumentOwner(doc)
    if (owner?.registration_number) return 'vehicle'
    return null
}

/** The document kind ("registration", "insurance"…): whichever field isn't the owner. */
export const getDocumentKind = (doc: Document): string | null => {
    for (const value of [doc.attributes.type, doc.attributes.category]) {
        const v = normalise(value)
        if (v && !OWNER_KINDS.includes(v)) return v
    }
    return null
}

type DocumentOwner = {
    make?: string
    model?: string
    registration_number?: string
    f_name?: string
    l_name?: string
}

/** `relationships` comes back as `[]` when empty, so only trust it when it has a belong_to. */
export const getDocumentOwner = (doc: Document): DocumentOwner | null => {
    const owner = (doc.relationships as { belong_to?: DocumentOwner } | undefined)?.belong_to
    return owner && typeof owner === 'object' ? owner : null
}
