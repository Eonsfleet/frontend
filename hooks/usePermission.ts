import { useAuthStore } from '@/store/authStore'

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
    administrator: ['*'],

    // Fleet manager has full admin access; denied permissions are listed in ROLE_DENIED_PERMISSIONS
    fleet_manager: ['*'],

    dispatcher: [
        'vehicles:read', 'tracking:read',
        'trips:read', 'trips:write',
        'users:read', 'notifications:read',
    ],

    driver: [
        'vehicles:read', 'tracking:read',
        'maintenance:read',
        'trips:read',
        'notifications:read',
        'profile:write',
    ],

    mechanic: [
        'vehicles:read',
        'maintenance:read', 'maintenance:write',
        'notifications:read',
        'profile:write',
    ],

    finance: [
        'billing:read', 'billing:write',
        'reports:read', 'reports:export',
        'notifications:read',
    ],

    compliance: [
        'reports:read', 'reports:export',
        'vehicles:read', 'trips:read', 'tracking:read',
        'users:read',
        'notifications:read',
    ],

    vendor: [
        'vendors:read', 'vendors:write',
        'workshop:read', 'workshop:write',
    ],
}

/**
 * Explicit permission denials per role.
 * These take precedence over wildcard grants.
 */
export const ROLE_DENIED_PERMISSIONS: Record<string, readonly string[]> = {
    fleet_manager: ['notifications:configure'],
}

type Permission = string

export function usePermission() {
    const role = useAuthStore((s) => s.user?.attributes.role)

    const can = (permission: Permission): boolean => {
        if (!role) return false
        const roleStr = Array.isArray(role) ? role[0] : role

        // Check deny-list first — always wins over wildcard
        const denied = ROLE_DENIED_PERMISSIONS[roleStr] ?? []
        if (denied.includes(permission)) return false

        const perms = ROLE_PERMISSIONS[roleStr] ?? []
        if (perms.includes('*')) return true
        return perms.includes(permission)
    }

    return { can, role }
}
