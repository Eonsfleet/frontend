import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUser, updatePassword, uploadFile, UpdateUserPayload, UpdatePasswordPayload } from '@/lib/api/users'
import { toast } from 'sonner'
import { UserProfile } from '@/types'

export const useUpdateUser = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: UpdateUserPayload }) =>
            updateUser(id, data),
        onSuccess: (response) => {
            // Invalidate and refetch user-related queries
            queryClient.invalidateQueries({ queryKey: ['user'] })
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
            toast.success('Profile updated successfully')
            return response.data
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || 'Failed to update profile'
            toast.error('Update failed', { description: message })
        },
    })
}

export const useUpdatePassword = () => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: UpdatePasswordPayload }) =>
            updatePassword(id, data),
        onSuccess: () => {
            toast.success('Password changed securely')
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || 'Failed to update password'
            toast.error('Password update failed', { description: message })
        },
    })
}

export const useUploadFile = () => {
    return useMutation({
        mutationFn: ({ file, folder }: { file: File; folder?: string }) =>
            uploadFile(file, folder),
        onError: (error: any) => {
            const message = error?.response?.data?.message || 'Failed to upload file'
            toast.error('Upload failed', { description: message })
        },
    })
}
