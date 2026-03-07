import apiClient from './client'
import { useAuthStore } from '@/store/authStore'

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

export const uploadFile = async (file: File): Promise<{ url: string }> => {
    const base64Data = await fileToBase64(file)

    // Create the payload exactly as the documentation specifies
    const payload = {
        file: base64Data,
        disk: process.env.NEXT_PUBLIC_UPLOAD_DISK_TYPE || 'public',
        folder: process.env.NEXT_PUBLIC_UPLOAD_FOLDER || 'documents/'
    }

    const response = await apiClient.post<any>('/file/upload', payload)

    // Handle structured response: { data: { file: { url: '...' } } }
    const url = response.data?.data?.file?.url || response.data?.url || response.data?.data?.url
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

export const downloadDocument = (documentId: string | number) => {
    // In many cases, we just want to open the download link in a new tab
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    const { token } = (useAuthStore.getState() as any) // Assuming we need the token if the download endpoint is protected
    const downloadUrl = `${baseUrl}/documents/${documentId}/download?token=${token}`
    window.open(downloadUrl, '_blank')
}

// Alternatively, if we need to fetch it as a blob:
export const fetchDocumentFile = async (documentId: string | number) => {
    const response = await apiClient.get(`/documents/${documentId}`, { responseType: 'blob' })
    return response.data
}
