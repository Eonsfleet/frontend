import apiClient from './client'
import { UserProfile } from '@/types'

export interface UpdateUserPayload {
    f_name?: string
    l_name?: string
    phone_number?: string | null
    date_of_birth?: string | null
    employee_id?: string | null
    avatar?: string | null
}

export interface UpdatePasswordPayload {
    current_password: string
    password: string
}

export interface FileUploadResponse {
    message: string
    data: {
        file: {
            path: string
            url: string
            mime: string
        }
    }
}

export const updateUser = async (
    id: string | number, 
    data: UpdateUserPayload
): Promise<{ data: UserProfile }> => {
    const response = await apiClient.put<{ data: UserProfile }>(`/users/${id}`, data)
    return response.data
}

export const updatePassword = async (
    data: UpdatePasswordPayload
): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>('/auth/change-password', data)
    return response.data
}

export const uploadFile = async (
    file: File,
    folder: string = 'avatar'
): Promise<FileUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    
    const response = await apiClient.post<FileUploadResponse>(
        '/file/upload',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    )
    return response.data
}
