import { useAuthStore } from '@/store/authStore'

export const ROLE_PERMISSIONS = {
    administrator: ['*'],

    fleet_manager: [
        'vehicles:read', 'vehicles:write', 'vehicles:delete', 'vehicles:assign',
        'drivers:read', 'drivers:write', 'drivers:performance',
        'trips:read', 'trips:write',
        'tracking:read',
        'maintenance:read', 'maintenance:write',
        'geofences:read', 'geofences:write',
        'incidents:read', 'incidents:write',
        'fuel:read', 'fuel:write',
        'analytics:read',
        'notifications:read', 'notifications:configure',
        'vendors:read', 'vendors:write',
        'users:read',
        'reports:read', 'reports:export',
    ],

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
} as const

type Permission = string

export function usePermission() {
    const role = useAuthStore((s) => s.user?.attributes.role)

    const can = (permission: Permission): boolean => {
        if (!role) return false
        const roleStr = Array.isArray(role) ? role[0] : role
        const perms = ROLE_PERMISSIONS[roleStr as keyof typeof ROLE_PERMISSIONS] as readonly string[] || []
        if (perms.includes('*')) return true
        return perms.includes(permission)
    }

    return { can, role }
}
