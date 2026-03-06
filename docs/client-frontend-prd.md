# EonsFleet — Client Portal Frontend PRD & Implementation Guide
**Next.js 14 (App Router) + TypeScript**
**Version:** 1.0 | **Date:** 2026-03-06

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Authentication Architecture](#5-authentication-architecture)
6. [Authorization — RBAC & Subscription Gates](#6-authorization--rbac--subscription-gates)
7. [Upgrade Gate System](#7-upgrade-gate-system)
8. [Phased Implementation Plan](#8-phased-implementation-plan)
   - [Phase 1 — Auth & Shell](#phase-1--auth--shell)
   - [Phase 2 — Dashboard](#phase-2--dashboard)
   - [Phase 3 — Fleet Management](#phase-3--fleet-management-vehicles--drivers)
   - [Phase 4 — Trip Management](#phase-4--trip-management)
   - [Phase 5 — Maintenance](#phase-5--maintenance)
   - [Phase 6 — Geofencing](#phase-6--geofencing)
   - [Phase 7 — Incidents](#phase-7--incidents)
   - [Phase 8 — Fuel Management](#phase-8--fuel-management)
   - [Phase 9 — Analytics & Reports](#phase-9--analytics--reports)
   - [Phase 10 — Billing & Subscriptions](#phase-10--billing--subscriptions)
   - [Phase 11 — Notifications](#phase-11--notifications)
   - [Phase 12 — Webhooks & Integrations](#phase-12--webhooks--integrations)
   - [Phase 13 — Vendor & Workshop Portal](#phase-13--vendor--workshop-portal)
   - [Phase 14 — Settings & Administration](#phase-14--settings--administration)
9. [API Client Layer](#9-api-client-layer)
10. [Full API Route Reference](#10-full-api-route-reference)
11. [Deployment](#11-deployment)

---

## 1. Overview

The **EonsFleet Client Portal** is a multi-tenant, role-aware web application used by organizations (fleet operators, logistics companies, etc.) to manage their vehicles, drivers, trips, maintenance, fuel, incidents, and analytics.

It is entirely separate from the platform admin panel. Each organization gets its own isolated view governed by:
- **Subscription plan** (Starter / Growth / Enterprise) — gates which modules are available
- **Role** (administrator, fleet_manager, dispatcher, driver, mechanic, finance, compliance, vendor) — gates what actions a user can perform within those modules

### Subscription Plans At a Glance

| Module | Starter | Growth | Enterprise |
|--------|---------|--------|------------|
| Vehicles & Drivers | ✅ | ✅ | ✅ |
| Trips | ✅ | ✅ | ✅ |
| Basic Maintenance | ✅ | ✅ | ✅ |
| Real-time GPS Tracking | ❌ | ✅ | ✅ |
| Geofencing | ❌ | ✅ | ✅ |
| Advanced Maintenance (Workflows) | ❌ | ✅ | ✅ |
| Incidents | ❌ | ❌ | ✅ |
| Fuel Management | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| Webhooks | ❌ | ✅ | ✅ |
| Predictive Maintenance | ❌ | ❌ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ |

---

## 2. Goals & Non-Goals

### Goals
- Full multi-tenant client portal at `https://app.eonsfleet.io`
- Role-driven navigation (each role only sees relevant sections)
- Subscription-aware UI — locked features show upgrade prompts instead of 403 errors
- Dunning-aware — payment overdue surfaces billing notice without breaking the app
- Real-time capable (trip tracking, notifications via Pusher/Reverb)
- Mobile-responsive (fleet managers often use tablets on-site)

### Non-Goals
- Platform super-admin panel (separate app — `docs/admin-frontend-prd.md`)
- Native mobile app (separate React Native project)
- GPS device firmware management

---

## 3. Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | Next.js 14 (App Router) | SSR/SSG, layouts, server components |
| Language | TypeScript | Type safety across 300+ API endpoints |
| Styling | Tailwind CSS + shadcn/ui | Accessible, customizable, consistent |
| Icons | lucide-react | Consistent icon library |
| Server state | TanStack Query v5 | Cache, background refetch, mutations |
| Global state | Zustand (persisted) | Auth session, subscription context |
| Forms | React Hook Form + Zod | Co-located validation schemas |
| HTTP client | Axios | Request/response interceptors |
| Charts | Recharts | Fleet analytics visualizations |
| Maps | Leaflet + react-leaflet | GPS tracking, geofence drawing |
| Tables | TanStack Table v8 | Sortable, paginated, headless |
| Dates | date-fns | Tree-shakable, lightweight |
| Notifications | sonner | Toast notifications |
| Real-time | Pusher JS / Laravel Echo | Trip events, alerts, notifications |
| PDF preview | react-pdf | Invoice PDF rendering |

---

## 4. Project Structure

```
eonsfleet-client/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group — no shell
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (portal)/                 # Authenticated group — with AppShell
│   │   ├── layout.tsx            # AppShell wrapper + auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── vehicles/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── drivers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── trips/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── tracking/page.tsx
│   │   ├── maintenance/
│   │   │   ├── page.tsx
│   │   │   ├── schedules/
│   │   │   ├── jobs/
│   │   │   └── alerts/
│   │   ├── geofences/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── incidents/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── fuel/
│   │   │   ├── page.tsx
│   │   │   ├── expenses/
│   │   │   ├── cards/
│   │   │   └── reconciliation/
│   │   ├── analytics/
│   │   │   ├── page.tsx
│   │   │   ├── fleet/page.tsx
│   │   │   ├── drivers/page.tsx
│   │   │   ├── fuel/page.tsx
│   │   │   ├── maintenance/page.tsx
│   │   │   ├── incidents/page.tsx
│   │   │   └── gps/page.tsx
│   │   ├── billing/
│   │   │   ├── page.tsx
│   │   │   ├── invoices/page.tsx
│   │   │   └── plans/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── webhooks/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── vendors/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── workshop/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── organization/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── roles/page.tsx
│   │   │   └── api-keys/page.tsx
│   │   └── profile/page.tsx
│   ├── layout.tsx                # Root layout (providers)
│   └── not-found.tsx
├── components/
│   ├── ui/                       # shadcn/ui generated
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── DunningBanner.tsx     # Payment overdue banner
│   └── shared/
│       ├── DataTable.tsx
│       ├── StatCard.tsx
│       ├── PageHeader.tsx
│       ├── ConfirmDialog.tsx
│       ├── UpgradeGate.tsx       # Subscription upgrade prompt
│       ├── PermissionGate.tsx    # Role-based gate
│       ├── EmptyState.tsx
│       ├── StatusBadge.tsx
│       └── WorkflowTimeline.tsx
├── features/                     # Feature-sliced modules
│   ├── auth/
│   ├── dashboard/
│   ├── vehicles/
│   ├── drivers/
│   ├── trips/
│   ├── tracking/
│   ├── maintenance/
│   ├── geofences/
│   ├── incidents/
│   ├── fuel/
│   ├── analytics/
│   ├── billing/
│   ├── notifications/
│   ├── webhooks/
│   ├── vendors/
│   └── settings/
├── lib/
│   ├── api/                      # Axios client + per-resource functions
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── vehicles.ts
│   │   ├── drivers.ts
│   │   ├── trips.ts
│   │   ├── tracking.ts
│   │   ├── maintenance.ts
│   │   ├── geofences.ts
│   │   ├── incidents.ts
│   │   ├── fuel.ts
│   │   ├── analytics.ts
│   │   ├── billing.ts
│   │   ├── notifications.ts
│   │   ├── webhooks.ts
│   │   ├── vendors.ts
│   │   └── settings.ts
│   ├── utils.ts
│   └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   ├── usePermission.ts
│   ├── useSubscription.ts        # Module entitlement check
│   └── useDunning.ts
├── store/
│   ├── authStore.ts              # Zustand — token, user, org
│   └── subscriptionStore.ts     # Zustand — plan, modules
├── types/
│   └── index.ts
├── providers/
│   └── AppProviders.tsx          # QueryClient, Toaster, Echo
├── middleware.ts                 # Next.js route middleware (auth redirect)
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 5. Authentication Architecture

### Headers Required on Every Authenticated Request

```
Authorization: Bearer <passport_jwt_token>
X-Request-Type: client
X-Tenant: <organization_subdomain>   (e.g. "acme-logistics")
Content-Type: application/json
Accept: application/json
```

> The `X-Tenant` header tells the backend which organization's data to scope. In local/testing environments it falls back to the authenticated user's `organization_id` automatically.

### Auth Flow

```
User visits app
  └─> middleware.ts checks Zustand token
        ├─> No token → redirect /login
        └─> Token present → render page

Login
  POST /auth/login { email, password }
  ← { access_token, refresh_token, expires_in, expires_at, user }

Store in Zustand (persisted):
  - token (access_token)
  - refreshToken
  - expiresAt
  - user { id, name, email, role, organization_id }
  - organization { id, identifier, name, subdomain, slug }

Token refresh (before expiry):
  POST /auth/refresh { refresh_token }
  ← { access_token, refresh_token, expires_in }
```

### Axios Client (`lib/api/client.ts`)

```typescript
import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Request-Type': 'client',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, organization } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (organization?.subdomain) config.headers['X-Tenant'] = organization.subdomain
  return config
})

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { refreshToken, setAuth, clearAuth } = useAuthStore.getState()
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'X-Request-Type': 'client' } }
        )
        setAuth(data.data.access_token, data.data.refresh_token)
        original.headers.Authorization = `Bearer ${data.data.access_token}`
        return apiClient(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }
    // 402 = Dunning (payment overdue) — surface banner, don't redirect
    if (error.response?.status === 403) {
      const code = error.response.data?.errors?.[0]?.code
      if (code === 'MODULE_NOT_IN_PLAN') {
        // Handled by UpgradeGate — don't throw globally
        return Promise.reject({ ...error, isSubscriptionError: true })
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

### Auth Store (`store/authStore.ts`)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserProfile {
  id: number
  name: string
  email: string
  role: Role
  organization_id: string
  avatar: string | null
  employee_number: string | null
  status: string
}

export interface Organization {
  id: number
  identifier: string
  name: string
  subdomain: string
  slug: string | null
  domain: string | null
}

export type Role =
  | 'administrator'
  | 'fleet_manager'
  | 'dispatcher'
  | 'driver'
  | 'mechanic'
  | 'finance'
  | 'compliance'
  | 'vendor'

interface AuthState {
  token: string | null
  refreshToken: string | null
  expiresAt: string | null
  user: UserProfile | null
  organization: Organization | null
  setAuth: (token: string, refreshToken: string, user: UserProfile, org: Organization) => void
  updateUser: (user: Partial<UserProfile>) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      organization: null,
      setAuth: (token, refreshToken, user, organization) =>
        set({ token, refreshToken, user, organization }),
      updateUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
      clearAuth: () =>
        set({ token: null, refreshToken: null, expiresAt: null, user: null, organization: null }),
    }),
    { name: 'eonsfleet-session' }
  )
)
```

### Subscription Store (`store/subscriptionStore.ts`)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlanTier = 'starter' | 'growth' | 'enterprise'
export type DunningStage = null | 'grace' | 'restricted' | 'suspended'

export const GATED_MODULES = [
  'geofencing',
  'maintenance',
  'incidents',
  'fuel_management',
  'analytics',
  'webhooks',
] as const

export type GatedModule = (typeof GATED_MODULES)[number]

interface SubscriptionState {
  planTier: PlanTier | null
  planName: string | null
  enabledModules: GatedModule[]
  dunningStage: DunningStage
  setSubscription: (
    tier: PlanTier,
    name: string,
    modules: GatedModule[],
    dunning: DunningStage
  ) => void
  hasModule: (module: GatedModule) => boolean
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      planTier: null,
      planName: null,
      enabledModules: [],
      dunningStage: null,
      setSubscription: (planTier, planName, enabledModules, dunningStage) =>
        set({ planTier, planName, enabledModules, dunningStage }),
      hasModule: (module) => get().enabledModules.includes(module),
    }),
    { name: 'eonsfleet-subscription' }
  )
)
```

### Next.js Middleware (`middleware.ts`)

```typescript
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Auth token stored in cookie for SSR (mirror of Zustand localStorage)
  const token = request.cookies.get('ef-token')?.value

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublic && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

> **Note:** Mirror the Zustand token to a cookie on login so Next.js middleware can read it server-side. Use `js-cookie` or a server action to set `ef-token` as an httpOnly cookie on successful login.

---

## 6. Authorization — RBAC & Subscription Gates

### Role Permissions Matrix (Frontend)

```typescript
// hooks/usePermission.ts

export const ROLE_PERMISSIONS = {
  administrator: ['*'], // all permissions

  fleet_manager: [
    'vehicles:read', 'vehicles:write', 'vehicles:delete', 'vehicles:assign',
    'drivers:read', 'drivers:performance',
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
```

### Permission Hook

```typescript
import { useAuthStore } from '@/store/authStore'
import { ROLE_PERMISSIONS } from './usePermission'

type Permission = string

export function usePermission() {
  const role = useAuthStore((s) => s.user?.role)

  const can = (permission: Permission): boolean => {
    if (!role) return false
    const perms = ROLE_PERMISSIONS[role] as readonly string[]
    if (perms.includes('*')) return true
    return perms.includes(permission)
  }

  return { can, role }
}
```

### Subscription Hook

```typescript
import { useSubscriptionStore, type GatedModule } from '@/store/subscriptionStore'

export function useSubscription() {
  const { hasModule, planTier, planName, dunningStage } = useSubscriptionStore()
  const isPaymentOverdue = dunningStage === 'restricted' || dunningStage === 'suspended'
  const isGracePeriod = dunningStage === 'grace'

  return { hasModule, planTier, planName, isPaymentOverdue, isGracePeriod, dunningStage }
}
```

---

## 7. Upgrade Gate System

### How It Works

When a user navigates to a gated page or feature, the frontend checks `hasModule(moduleName)` from the subscription store **before** making any API calls. If the module is not in the plan:

1. The **page renders an `<UpgradeGate>`** instead of the feature content
2. The gate shows: feature name, what the feature does, which plans include it, and a CTA to upgrade
3. If the API returns `403` with `MODULE_NOT_IN_PLAN`, the same gate is shown inline

### `UpgradeGate` Component

```typescript
// components/shared/UpgradeGate.tsx

interface UpgradeGateProps {
  module: GatedModule
  featureName: string
  description: string
  requiredPlan: 'growth' | 'enterprise'
  children?: React.ReactNode
}

const PLAN_FEATURES: Record<string, { color: string; label: string }> = {
  growth: { color: 'blue', label: 'Growth' },
  enterprise: { color: 'purple', label: 'Enterprise' },
}

export function UpgradeGate({
  module, featureName, description, requiredPlan, children,
}: UpgradeGateProps) {
  const { hasModule } = useSubscription()

  if (hasModule(module)) return <>{children}</>

  const plan = PLAN_FEATURES[requiredPlan]

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <Lock className="h-8 w-8 text-blue-500" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">{featureName}</h2>
      <p className="mb-6 max-w-md text-gray-500">{description}</p>
      <Badge className={`mb-6 bg-${plan.color}-100 text-${plan.color}-800`}>
        Available on {plan.label} plan and above
      </Badge>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/billing/plans">View Plans & Upgrade</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="mailto:sales@eonsfleet.io">Contact Sales</Link>
        </Button>
      </div>
    </div>
  )
}
```

### Dunning Banner Component

```typescript
// components/layout/DunningBanner.tsx

export function DunningBanner() {
  const { dunningStage } = useSubscription()

  if (!dunningStage || dunningStage === null) return null

  const config = {
    grace: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      message: 'Your payment is past due. You have a 7-day grace period before access is restricted.',
      cta: 'Update Billing',
    },
    restricted: {
      bg: 'bg-orange-50 border-orange-300',
      text: 'text-orange-900',
      message: 'Access to some features has been restricted due to an outstanding payment.',
      cta: 'Pay Now',
    },
    suspended: {
      bg: 'bg-red-50 border-red-300',
      text: 'text-red-900',
      message: 'Your account has been suspended due to non-payment. Please settle your balance to restore access.',
      cta: 'Restore Access',
    },
  }

  const c = config[dunningStage]

  return (
    <div className={`border-b px-4 py-2 ${c.bg}`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm ${c.text}`}>
          <AlertTriangle className="h-4 w-4" />
          {c.message}
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href="/billing">{c.cta}</Link>
        </Button>
      </div>
    </div>
  )
}
```

### Module-to-Upgrade Config Reference

```typescript
export const MODULE_UPGRADE_CONFIG = {
  geofencing: {
    featureName: 'Geofencing',
    description: 'Create virtual boundaries around locations and get alerts when vehicles enter or exit.',
    requiredPlan: 'growth',
  },
  maintenance: {
    featureName: 'Maintenance Workflows',
    description: 'Advanced maintenance job tracking with approval workflows, parts management, and cost summaries.',
    requiredPlan: 'growth',
  },
  incidents: {
    featureName: 'Incident Management',
    description: 'Track, investigate, and resolve fleet incidents with a full 9-state workflow engine.',
    requiredPlan: 'enterprise',
  },
  fuel_management: {
    featureName: 'Fuel Management',
    description: 'Track fuel expenses, card transactions, reconciliation, theft detection, and IFTA reports.',
    requiredPlan: 'growth',
  },
  analytics: {
    featureName: 'Analytics & Reports',
    description: 'Fleet utilization, driver performance, fuel efficiency, predictive maintenance insights and more.',
    requiredPlan: 'growth',
  },
  webhooks: {
    featureName: 'Webhooks & Integrations',
    description: 'Send real-time events to your own systems when fleet activities occur.',
    requiredPlan: 'growth',
  },
} as const
```

---

## 8. Phased Implementation Plan

---

### Phase 1 — Auth & Shell

**Deliverables:** Login, register, password reset, app shell (sidebar + topbar), dunning banner, route protection.

#### Step 1.1 — Bootstrap project

```bash
npx create-next-app@latest eonsfleet-client \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*"
cd eonsfleet-client
```

**Install dependencies:**
```bash
# Core
npm install axios zustand @tanstack/react-query @tanstack/react-table
npm install react-hook-form zod @hookform/resolvers
npm install date-fns js-cookie
npm install lucide-react recharts
npm install sonner

# Maps
npm install leaflet react-leaflet @types/leaflet

# PDF
npm install react-pdf

# Realtime
npm install laravel-echo pusher-js

# Dev
npm install -D @types/js-cookie
```

**Init shadcn/ui:**
```bash
npx shadcn@latest init
npx shadcn@latest add button card input label dialog table badge
npx shadcn@latest add dropdown-menu select separator sheet skeleton tabs
npx shadcn@latest add avatar tooltip form progress alert popover
npx shadcn@latest add command
```

#### Step 1.2 — Environment

**`.env.local`:**
```
NEXT_PUBLIC_API_BASE_URL=https://api.eonsfleet.local/v1
NEXT_PUBLIC_PUSHER_APP_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_HOST=reverb.eonsfleet.local
NEXT_PUBLIC_PUSHER_PORT=8080
NEXT_PUBLIC_PUSHER_SCHEME=https
```

#### Step 1.3 — Root layout with providers

```tsx
// app/layout.tsx
import { AppProviders } from '@/providers/AppProviders'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'EonsFleet', description: 'Fleet Management Portal' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
```

```tsx
// providers/AppProviders.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useState } from 'react'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
```

#### Step 1.4 — Login page

```tsx
// app/(auth)/login/page.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { loginUser } from '@/lib/api/auth'
import { useAuthStore } from '@/store/authStore'
import Cookies from 'js-cookie'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})
type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setAuth(data.access_token, data.refresh_token, data.user, data.user.organization)
      // Mirror token to cookie for Next.js middleware
      Cookies.set('ef-token', data.access_token, { expires: 1, secure: true })
      router.push('/dashboard')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Invalid credentials'
      toast.error(msg)
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-2xl shadow-sm border">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to EonsFleet</p>
        </div>
        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" {...register('email')}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input type="password" {...register('password')}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <a href="/forgot-password" className="block text-xs text-blue-600 text-right">
            Forgot password?
          </a>
          <button type="submit" disabled={isPending}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

#### Step 1.5 — Portal layout (AppShell)

On first load of the portal, fetch the subscription state and seed the store.

```tsx
// app/(portal)/layout.tsx
'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { getOrganizationSubscription } from '@/lib/api/billing'
import AppShell from '@/components/layout/AppShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, organization } = useAuthStore()
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)

  // Guard
  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token])

  // Seed subscription context
  const { data: sub } = useQuery({
    queryKey: ['org-subscription'],
    queryFn: getOrganizationSubscription,
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 min
  })

  useEffect(() => {
    if (sub) {
      setSubscription(
        sub.plan.tier,
        sub.plan.name,
        sub.enabled_modules ?? [],
        sub.dunning_stage ?? null
      )
    }
  }, [sub])

  if (!token) return null

  return <AppShell>{children}</AppShell>
}
```

#### Step 1.6 — Sidebar (role-aware nav)

```tsx
// components/layout/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Car, Users, Route, MapPin, Wrench,
  AlertTriangle, Fuel, BarChart3, CreditCard, Bell,
  Webhook, Store, Settings, Lock
} from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null, module: null },
      { href: '/vehicles', label: 'Vehicles', icon: Car, permission: 'vehicles:read', module: null },
      { href: '/drivers', label: 'Drivers', icon: Users, permission: 'drivers:read', module: null },
      { href: '/trips', label: 'Trips', icon: Route, permission: 'trips:read', module: null },
      { href: '/tracking', label: 'Live Tracking', icon: MapPin, permission: 'tracking:read', module: null },
    ],
  },
  {
    label: 'Fleet Health',
    items: [
      { href: '/maintenance', label: 'Maintenance', icon: Wrench, permission: 'maintenance:read', module: null },
      { href: '/geofences', label: 'Geofences', icon: MapPin, permission: null, module: 'geofencing' },
      { href: '/incidents', label: 'Incidents', icon: AlertTriangle, permission: null, module: 'incidents' },
      { href: '/fuel', label: 'Fuel', icon: Fuel, permission: null, module: 'fuel_management' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3, permission: null, module: 'analytics' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/billing', label: 'Billing', icon: CreditCard, permission: 'billing:read', module: null },
      { href: '/notifications', label: 'Notifications', icon: Bell, permission: 'notifications:read', module: null },
      { href: '/webhooks', label: 'Webhooks', icon: Webhook, permission: null, module: 'webhooks' },
      { href: '/vendors', label: 'Vendors', icon: Store, permission: 'vendors:read', module: null },
      { href: '/settings', label: 'Settings', icon: Settings, permission: null, module: null },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { can } = usePermission()
  const { hasModule } = useSubscription()

  return (
    <aside className="w-64 border-r bg-white flex flex-col h-full">
      <div className="h-16 flex items-center gap-2 px-5 border-b">
        <div className="h-7 w-7 rounded-lg bg-blue-600" />
        <span className="font-semibold text-gray-900">EonsFleet</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(({ permission }) =>
            !permission || can(permission)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon, module }) => {
                  const isLocked = module && !hasModule(module as any)
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                        isLocked && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </div>
                      {isLocked && <Lock className="h-3 w-3 text-gray-400" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
```

---

### Phase 2 — Dashboard

**Deliverables:** KPI summary cards, active trips map snapshot, recent maintenance alerts, upcoming maintenance, vehicle status distribution.

**Role visibility:** All roles see a role-scoped dashboard.
- `driver` → shows own assigned trip + vehicle
- `mechanic` → shows assigned maintenance jobs
- `finance` → shows billing summary
- `fleet_manager` / `administrator` → full platform view

**Key components:**
- `StatCard` (total vehicles, active trips, alerts, utilization %)
- Vehicle status donut chart (active / idle / maintenance / offline)
- Upcoming maintenance table (next 7 days)
- Recent incidents feed (if `incidents` module)
- Subscription status card linking to `/billing`

**API calls:**
```
GET /vehicles/stats
GET /vehicles/performance
GET /maintenances/stats
GET /maintenances/upcoming
GET /tracker/metrics
GET /subscriptions/organization   ← feeds subscription store
```

---

### Phase 3 — Fleet Management (Vehicles & Drivers)

**Deliverables:** Vehicle list, vehicle detail (tabs), vehicle assignment, driver list, driver detail, driver history.

#### Vehicles

**List view columns:** Reg. No., Make/Model, Status (badge), Assigned Driver, Cluster, Last GPS ping, Actions

**Detail page tabs:**
| Tab | Content |
|-----|---------|
| Overview | Specs, status, current driver, device |
| Location | Last known GPS position on map |
| Driver History | Paginated assignment history |
| Maintenance | Linked maintenance schedules |
| Documents | Attached docs (roadworthy, insurance) |
| Fuel | Fuel readings from device |

**Upgrade callout:** Live location tab shows `<UpgradeGate module="geofencing">` for geofence history if Starter plan.

**API calls:**
```
GET  /vehicles                            list
GET  /vehicles/{id}                       detail
POST /vehicles                            create
PUT  /vehicles/{id}                       update
DELETE /vehicles/{id}                     delete
PUT  /vehicles/{id}/assign-device         assign GPS device
POST /vehicles/{id}/assign-driver         assign driver
POST /vehicles/{id}/deassign-driver       deassign driver
GET  /vehicles/{id}/driver-history        history
GET  /vehicles/{id}/fuel-calibration-points
```

#### Drivers

**List view columns:** Name, Email, Role, Status, Assigned Vehicle, Last Login, Actions

**Detail page:** Profile info, current vehicle, trip history, performance score (Growth+)

**Permission gate:** Only `fleet_manager` and `administrator` can create/edit/delete drivers.

```tsx
// Example: gated action button
<PermissionGate permission="vehicles:write">
  <Button onClick={openAssignDialog}>Assign Driver</Button>
</PermissionGate>
```

---

### Phase 4 — Trip Management

**Deliverables:** Trip list, trip creation wizard, trip detail (events, route, checkpoints, POD), trip status management.

**Trip statuses:** scheduled → in_progress → completed / cancelled

**Trip creation wizard steps:**
1. Vehicle selection
2. Driver assignment
3. Route / waypoints (optional map picker)
4. Schedule (date/time, recurring type)
5. Review & confirm

**Detail page tabs:**
| Tab | Content |
|-----|---------|
| Overview | Metadata, status timeline |
| Route | Polyline on Leaflet map |
| Events | Speed events, stops, alerts |
| Checkpoints | Check-in status |
| Proof of Delivery | Upload / e-signature |

**API calls:**
```
GET   /trips
POST  /trips
GET   /trips/{id}
PUT   /trips/{id}
DELETE /trips/{id}
PATCH /trips/{id}/change-status
GET   /trips/{id}/events
GET   /trips/{id}/routes
GET   /trips/{id}/checkpoints
POST  /trips/{id}/checkpoints/{id}/check-in
POST  /trips/{id}/pod/upload
POST  /trips/{id}/pod/sign
```

---

### Phase 5 — Maintenance

**Module gate:** Advanced workflows are on Growth+. Starter plan only shows basic schedules.

**Deliverables:** Maintenance schedule list, log list, maintenance job board (Kanban-style), alerts, work order creation from alert.

#### 5.1 Basic Maintenance (all plans)

- Schedule list with upcoming/overdue badges
- Log viewer with status filter
- Checklist management
- Assign jobs to mechanics

#### 5.2 Advanced Maintenance Workflows (Growth+)

Show `<UpgradeGate module="maintenance">` for Starter plan.

**Job Board (Kanban columns):** draft → submitted → approved → assigned → in_progress → completed → verified → closed

**Job Detail page tabs:**
| Tab | Content |
|-----|---------|
| Overview | Reference, vehicle, assignee, status |
| Parts | Parts used (add/remove) |
| Cost Summary | Labor + parts total in kobo/naira |
| Conversation | Internal chat thread |
| Workflow History | Timeline of transitions |

**Maintenance Alerts:**
- Triggered automatically when vehicle approaches service mileage/date threshold
- Alert actions: Acknowledge → Snooze → Create Work Order
- Work order creation auto-creates a `MaintenanceJob` in `approved` state

**Workflow timeline component (`WorkflowTimeline`):**
```tsx
// Shared — used in Maintenance Jobs, Incidents
<WorkflowTimeline
  history={[
    { status: 'submitted', actor: 'John', timestamp: '...', reason: null },
    { status: 'approved', actor: 'Manager', timestamp: '...', reason: null },
    { status: 'assigned', actor: 'Manager', timestamp: '...', reason: 'Assigned to John' },
  ]}
/>
```

**API calls:**
```
GET   /maintenances                         schedule list
POST  /maintenances/schedule                create schedule
GET   /maintenances/logs                    all logs
POST  /maintenances/logs/{id}/assign
POST  /maintenances/logs/{id}/start
POST  /maintenances/logs/{id}/complete
POST  /maintenances/logs/{id}/verify
PATCH /maintenances/logs/{id}/progress      update progress %
GET   /maintenances/logs/{id}/parts
POST  /maintenances/logs/{id}/parts
DELETE /maintenances/logs/{id}/parts/{part}
GET   /maintenance/jobs
POST  /maintenance/jobs
PATCH /maintenance/jobs/{id}/transition
GET   /maintenance/jobs/{id}/history
GET   /maintenance/jobs/{id}/conversation
POST  /maintenance/jobs/{id}/messages
GET   /maintenance/jobs/{id}/cost-summary
GET   /maintenance/alerts
PATCH /maintenance/alerts/{id}/acknowledge
PATCH /maintenance/alerts/{id}/snooze
POST  /maintenance/alerts/{id}/work-order
```

---

### Phase 6 — Geofencing

**Module gate:** Growth+ plan. Starter sees full `<UpgradeGate>`.

**Deliverables:** Geofence list, interactive Leaflet map editor (draw circle/polygon), geofence detail, vehicle association.

**Map interaction:**
- Use `react-leaflet` with Leaflet.Draw for polygon/circle drawing
- On save: serialize coordinates to GeoJSON and POST to API
- Active geofences shown as colored overlays on the map

**Geofence form fields:**
- Name, description
- Type: circle (lat/lng + radius) or polygon (draw on map)
- Alert type: enter / exit / both
- Associated vehicles (multi-select)
- Active hours schedule (optional)

**API calls:**
```
GET    /geofences
POST   /geofences
GET    /geofences/{id}
PUT    /geofences/{id}
DELETE /geofences/{id}
GET    /geofences/{id}/vehicles
```

**Upgrade gate implementation:**
```tsx
// app/(portal)/geofences/page.tsx
export default function GeofencesPage() {
  return (
    <UpgradeGate
      module="geofencing"
      featureName="Geofencing"
      description="Create virtual boundaries and receive alerts when vehicles enter or exit defined zones."
      requiredPlan="growth"
    >
      <GeofenceListContent />
    </UpgradeGate>
  )
}
```

---

### Phase 7 — Incidents

**Module gate:** Enterprise plan only. Growth+ sees `<UpgradeGate>`.

**Deliverables:** Incident list, incident creation, 9-state workflow engine UI, investigation timeline, escalation, conversation.

**Incident States (9-state machine):**
```
reported → investigating → action_required → action_taken
       → pending_resolution → resolved → closed
       → cancelled
       → escalated (from any state)
       → dismissed
```

**Incident list columns:** Reference, Type, Vehicle, Driver, Status (badge), Priority, Reported At

**Detail page tabs:**
| Tab | Content |
|-----|---------|
| Overview | Incident details, severity, linked vehicle |
| Timeline | State transition history |
| Conversation | Internal investigation chat |
| Actions | Available workflow transitions (role-gated buttons) |
| Linked Jobs | Associated maintenance jobs |

**State transition buttons (visible by current state):**
```typescript
const TRANSITION_BUTTONS: Record<string, { label: string; variant: ButtonVariant; permission: string }[]> = {
  reported: [
    { label: 'Start Investigation', variant: 'default', permission: 'incidents:write' },
    { label: 'Dismiss', variant: 'destructive', permission: 'incidents:write' },
  ],
  investigating: [
    { label: 'Require Action', variant: 'default', permission: 'incidents:write' },
    { label: 'Escalate', variant: 'destructive', permission: 'incidents:write' },
    { label: 'Cancel', variant: 'outline', permission: 'incidents:write' },
  ],
  // ...
}
```

**API calls:**
```
GET   /incidents
POST  /incidents
GET   /incidents/{id}
PUT   /incidents/{id}
DELETE /incidents/{id}
POST  /incidents/{id}/investigate
POST  /incidents/{id}/action
POST  /incidents/{id}/resolve
POST  /incidents/{id}/close
POST  /incidents/{id}/cancel
POST  /incidents/{id}/escalate
POST  /incidents/{id}/dismiss
POST  /incidents/{id}/link-job
GET   /incidents/{id}/history
GET   /incidents/{id}/conversation
POST  /incidents/{id}/messages
```

---

### Phase 8 — Fuel Management

**Module gate:** Growth+ plan.

**Deliverables:** Fuel expense tracker, fuel card management, reconciliation, theft detection, IFTA reports.

#### 8.1 Fuel Expenses

**List columns:** Date, Vehicle, Driver, Volume (L), Cost (₦), Status (badge), Source (manual/card), Actions

**Approval workflow (fleet_manager / administrator):**
- `pending` → Approve / Reject with reason

#### 8.2 Fuel Card Providers

**CRUD for provider configs** (OVH, Total, GenericCsv)

**Sync actions:** Manual sync, Test Connection, View sync status

#### 8.3 Reconciliation

- Match fuel card transactions to expense records
- Flag discrepancies (card charge vs reported expense)
- Approve / Dispute individual transactions

#### 8.4 Reports Tab

- IFTA compliance report
- Theft summary report (anomaly detection)
- Cost analysis by vehicle / driver

**API calls (key subset):**
```
GET   /fuel-expenses
POST  /fuel-expenses
POST  /fuel-expenses/{id}/approve
POST  /fuel-expenses/{id}/reject
GET   /fuel-card/transactions
POST  /fuel-card/transactions/{id}/link-vehicle
GET   /fuel-card-providers
POST  /fuel-card-providers
POST  /fuel-card-providers/{id}/sync
GET   /fuel-reconciliation/report
POST  /fuel-reconciliation/run
GET   /fuel-reconciliation/discrepancies
GET   /fuel/compliance/ifta-report
GET   /fuel/reports/theft-summary
```

---

### Phase 9 — Analytics & Reports

**Module gate:** Growth+ plan.

**Deliverables:** 6 analytics sub-pages + report export + scheduled reports.

#### Analytics Sub-pages

| Route | Page | Key Charts |
|-------|------|-----------|
| `/analytics` | Overview hub | KPI cards + navigation |
| `/analytics/fleet` | Fleet Utilization | Utilization %, availability trend, top vehicles |
| `/analytics/drivers` | Driver Performance | Trip summary, compliance, incident history |
| `/analytics/fuel` | Fuel Intelligence | Cost/L trend, efficiency ranking, anomalies |
| `/analytics/maintenance` | Maintenance Compliance | Schedule compliance %, cost by category |
| `/analytics/incidents` | Incident Reports | Type distribution, resolution time |
| `/analytics/gps` | GPS & Trip Reports | Distance per vehicle, trips over time |

#### Insights Panel (Enterprise only)

Show nested `<UpgradeGate module="analytics" requiredPlan="enterprise">` for:
- Fleet Health Score
- Cost per KM trend
- Driver Risk Ranking
- Predictive Maintenance
- Fuel Misuse Probability

#### Scheduled Reports

```
GET   /analytics/reports/scheduled        list
POST  /analytics/reports/scheduled        create (with cron schedule, recipients)
PUT   /analytics/reports/scheduled/{id}   update
DELETE /analytics/reports/scheduled/{id}  delete
GET   /analytics/reports/export           one-off export (CSV/PDF)
```

**Common chart components:**
```tsx
// Shared chart wrapper — handles loading/empty states
<AnalyticsChart
  queryKey={['fleet-utilization']}
  queryFn={getFleetUtilizationSummary}
  title="Fleet Utilization"
  renderChart={(data) => (
    <LineChart data={data.trend}>...</LineChart>
  )}
/>
```

---

### Phase 10 — Billing & Subscriptions

**Role gate:** Only `finance` and `administrator` see billing details.

**Deliverables:** Current plan overview, plan comparison, invoice list, invoice viewer (PDF), plan upgrade flow.

#### Billing Overview

```
Current Plan: Growth ($65/month)
Next billing: April 1, 2026
Vehicles used: 47 / 100
Status: Active (green badge)
```

#### Plan Upgrade Flow

1. User clicks "Upgrade Plan" or clicks from any `<UpgradeGate>`
2. `/billing/plans` renders plan comparison table
3. User selects plan → payment initialized via Paystack
4. Paystack hosted checkout
5. On return: webhook fires `handleChargeSuccess` → subscription updated
6. Frontend polls `/subscriptions/organization` for new plan state
7. Subscription store updated → gated pages unlock

```typescript
// Upgrade flow
const initializeUpgrade = async (planId: number) => {
  const { data } = await apiClient.post('/subscriptions/payments/initialize', {
    plan_id: planId,
    callback_url: `${window.location.origin}/billing?upgraded=true`,
  })
  // data.authorization_url — Paystack redirect
  window.location.href = data.authorization_url
}
```

#### Invoices

**List columns:** Invoice No., Date, Period, Amount (₦), Status, Actions (View PDF, Download)

**PDF viewer:** Use `react-pdf` to render inline within a Dialog.

```tsx
<Dialog>
  <DialogContent className="max-w-4xl">
    <Document file={`/api/subscriptions/invoices/${invoiceId}/pdf`}>
      <Page pageNumber={1} />
    </Document>
  </DialogContent>
</Dialog>
```

**API calls:**
```
GET  /subscriptions/plans               public plan list
GET  /subscriptions/organization        current org subscription
GET  /subscriptions/invoices            invoice list
GET  /subscriptions/invoices/{id}       invoice detail
GET  /subscriptions/invoices/{id}/pdf   PDF blob
POST /subscriptions/payments/initialize start Paystack checkout
POST /subscriptions/change-plan         change plan (Growth → Enterprise)
```

---

### Phase 11 — Notifications

**Deliverables:** Notification inbox, mark as read, channel preferences, notification rules config, groups, delegations.

#### Notification Bell (Topbar)

- Real-time badge showing unread count (via Laravel Echo / Pusher)
- Popover listing last 10 unread notifications
- Link to full `/notifications` page

```typescript
// Real-time setup (providers/AppProviders.tsx)
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher
const echo = new Echo({
  broadcaster: 'pusher',
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  wsPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT!),
  forceTLS: process.env.NEXT_PUBLIC_PUSHER_SCHEME === 'https',
  disableStats: true,
})

// Subscribe to user-specific channel
echo.private(`user.${userId}`).notification((notification: any) => {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  toast.info(notification.message)
})
```

#### Notification Preferences

Toggle which notification types are received per channel (Email / SMS / In-App / Push):

```tsx
// Matrix of notification types × channels
// Each cell is a toggle switch
<NotificationMatrix
  events={notificationEvents}
  preferences={userPreferences}
  onToggle={(eventId, channel, enabled) =>
    updatePreference.mutate({ event_id: eventId, channel, enabled })
  }
/>
```

**API calls:**
```
GET   /notifications/user/inbox
PATCH /notifications/user/inbox/read
POST  /notifications/user/inbox/read-all
PATCH /notifications/user/inbox/{id}/read
DELETE /notifications/user/inbox
GET   /notifications/user/channels
PUT   /notifications/user/channels
GET   /notifications/config/rules
POST  /notifications/config/rules
GET   /notifications/groups
POST  /notifications/groups
```

---

### Phase 12 — Webhooks & Integrations

**Module gate:** Growth+ plan.

**Deliverables:** Webhook endpoint CRUD, event type selection, delivery log, test fire.

#### Webhook List

**Columns:** Name, URL, Events, Status (active/inactive), Last Delivery, Actions

#### Create / Edit Form

```typescript
const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url('Must be a valid HTTPS URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  is_active: z.boolean(),
  secret: z.string().optional(),
})
```

**Available event types (checkboxes):**
- `trip.started`, `trip.completed`, `trip.cancelled`
- `vehicle.assigned`, `vehicle.idle`, `vehicle.offline`
- `geofence.entered`, `geofence.exited`
- `maintenance.due`, `maintenance.completed`
- `incident.reported`, `incident.resolved`
- `fuel.anomaly`, `payment.failed`

#### Delivery Log

Table of recent delivery attempts: timestamp, HTTP status, response time, retry count. Expandable row shows request/response payload.

**API calls:**
```
GET   /webhooks
POST  /webhooks
GET   /webhooks/{id}
PUT   /webhooks/{id}
DELETE /webhooks/{id}
POST  /webhooks/{id}/test
GET   /webhooks/{id}/deliveries
```

---

### Phase 13 — Vendor & Workshop Portal

**Deliverables:** Vendor directory, vendor invite, workshop job board (vendor view), rating system.

#### Vendor Directory

Public-ish list of registered vendors (fuel suppliers, workshop providers):
- Filter by category, location, rating
- "Find Nearby" for a vehicle (proximity search)

#### Vendor Role View (`/workshop`)

When the authenticated user has `role = 'vendor'`, show the Workshop Portal:

```
My Jobs (Kanban: pending → accepted → in_progress → completed)
Job Detail: Vehicle info, required work, checklist, customer contact
Accept / Complete actions
Workshop Metrics
```

#### Vendor Invite Flow

```typescript
// fleet_manager invites a vendor by email
POST /vendors/invite { email, business_name, category }
// Vendor receives email → clicks link → POST /vendors/onboarding
```

**API calls:**
```
GET  /vendors
GET  /vendors/directory
GET  /vendors/{id}
POST /vendors/invite
PUT  /vendors/update
POST /vendors/onboarding
GET  /vendors/nearby/{vehicleId}
GET  /workshop/profile
PATCH /workshop/profile
GET  /workshop/jobs
GET  /workshop/jobs/{id}
POST /workshop/jobs/{id}/accept
POST /workshop/jobs/{id}/complete
GET  /workshop/metrics
```

---

### Phase 14 — Settings & Administration

**Deliverables:** Organization settings, user management (CRUD), role management, cluster management, API key management, profile.

#### Settings sub-pages

| Route | Content | Role |
|-------|---------|------|
| `/settings/organization` | Org name, logo, domain settings | administrator |
| `/settings/users` | User list, invite, edit, deactivate | administrator, fleet_manager |
| `/settings/roles` | Role list, view permissions | administrator |
| `/settings/clusters` | Cluster (sub-group) CRUD | administrator, fleet_manager |
| `/settings/api-keys` | Generate / revoke API keys | administrator |
| `/profile` | Personal profile, password change | all roles |

#### User Invite Flow

```tsx
// Invite modal
const inviteSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['fleet_manager', 'dispatcher', 'driver', 'mechanic', 'finance', 'compliance', 'vendor']),
  cluster_id: z.number().optional(),
})
```

#### API Key Management

```tsx
// Show warning: "This key will only be shown once"
const { mutate: generateKey } = useMutation({
  mutationFn: () => apiClient.post('/api-keys', { name, expires_in_days }),
  onSuccess: (data) => {
    setRevealedKey(data.api_key) // Show in one-time modal
    queryClient.invalidateQueries({ queryKey: ['api-keys'] })
  },
})
```

**API calls:**
```
GET   /users
POST  /users                             invite
PUT   /users/{id}                        edit
DELETE /users/{id}                       deactivate
GET   /roles
GET   /permissions
GET   /clusters
POST  /clusters
PUT   /clusters/{id}
DELETE /clusters/{id}
GET   /api-keys
POST  /api-keys
POST  /api-keys/{id}/rotate
POST  /api-keys/{id}/revoke
DELETE /api-keys/{id}
GET   /organizations/{id}
PUT   /organizations/{id}
```

---

## 9. API Client Layer

### Core Shared Types (`types/index.ts` — excerpt)

```typescript
// Pagination
export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

// Custom API error format
export interface ApiError {
  message: string
  errors: Array<{
    status: string; code: string; title: string; detail: string
    source?: { pointer: string }
  }>
}

// Vehicle
export interface Vehicle {
  id: number
  registration_number: string
  make: string; model: string; year: number
  status: 'active' | 'inactive' | 'maintenance' | 'offline'
  cluster_id: number | null
  organization_id: string
  assigned_driver: UserProfile | null
  device: Device | null
  current_mileage: number
}

// Trip
export interface Trip {
  id: number
  reference: string
  vehicle: Pick<Vehicle, 'id' | 'registration_number'>
  driver: Pick<UserProfile, 'id' | 'name'>
  status: number // FK to Status table
  origin: string; destination: string
  start_time: string; end_time: string | null
  recurring_type: 'one_time' | 'daily' | 'weekly' | 'monthly'
  created_at: string
}

// MaintenanceJob
export interface MaintenanceJob {
  id: number
  reference: string  // MJ-2026-00001
  vehicle: Pick<Vehicle, 'id' | 'registration_number'>
  status: MaintenanceJobStatus
  description: string
  assigned_to: UserProfile | null
  total_cost_kobo: number
  created_at: string
}
export type MaintenanceJobStatus =
  | 'draft' | 'submitted' | 'approved' | 'assigned'
  | 'in_progress' | 'completed' | 'verified' | 'closed' | 'cancelled' | 'rejected'

// Incident
export interface Incident {
  id: number
  reference: string  // INC-XXXXXX
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: IncidentStatus
  vehicle: Pick<Vehicle, 'id' | 'registration_number'>
  reported_by: Pick<UserProfile, 'id' | 'name'>
  description: string
  created_at: string
}
export type IncidentStatus =
  | 'reported' | 'investigating' | 'action_required' | 'action_taken'
  | 'pending_resolution' | 'resolved' | 'closed' | 'cancelled'
  | 'escalated' | 'dismissed'

// Subscription
export interface OrganizationSubscription {
  id: number
  status: 'active' | 'trial' | 'grace' | 'restricted' | 'suspended' | 'expired'
  dunning_stage: DunningStage
  plan: { id: number; name: string; tier: PlanTier; price: number }
  enabled_modules: GatedModule[]
  vehicle_limit: number
  vehicle_count: number
  starts_at: string
  ends_at: string | null
}

// Invoice
export interface Invoice {
  id: number
  invoice_number: string
  amount_kobo: number
  vat_kobo: number
  total_kobo: number
  status: 'paid' | 'unpaid' | 'overdue'
  period_start: string; period_end: string
  pdf_path: string | null
  created_at: string
}
```

### Error Extraction Helper

```typescript
// lib/utils.ts
export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    if (data?.errors?.[0]?.detail) return data.errors[0].detail
    if (data?.message) return data.message
  }
  return 'An unexpected error occurred'
}
```

### React Query + Mutation Pattern

```typescript
// Standard feature hook pattern
// features/vehicles/hooks.ts

export function useVehicles(page: number, q?: string) {
  return useQuery({
    queryKey: ['vehicles', page, q],
    queryFn: () => listVehicles({ page, per_page: 20, q }),
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: () => {
      toast.success('Vehicle deleted')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: (err) => toast.error(extractApiError(err)),
  })
}
```

---

## 10. Full API Route Reference

### Authentication
| Method | Endpoint | Phase |
|--------|----------|-------|
| POST | `/auth/login` | 1 |
| POST | `/auth/refresh` | 1 |
| GET | `/auth/logout` | 1 |
| POST | `/auth/register` | 1 |
| POST | `/auth/password/new-otp` | 1 |
| POST | `/auth/verify-otp` | 1 |
| PUT | `/auth/password/reset` | 1 |

### Vehicles
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/vehicles` | 3 |
| POST | `/vehicles` | 3 |
| GET | `/vehicles/{id}` | 3 |
| PUT | `/vehicles/{id}` | 3 |
| DELETE | `/vehicles/{id}` | 3 |
| PUT | `/vehicles/{id}/assign-device` | 3 |
| POST | `/vehicles/{id}/assign-driver` | 3 |
| POST | `/vehicles/{id}/deassign-driver` | 3 |
| GET | `/vehicles/{id}/driver-history` | 3 |
| GET | `/vehicles/stats` | 2 |
| GET | `/vehicles/performance` | 2 |
| GET | `/vehicles/locations` | 4 |

### Trips
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/trips` | 4 |
| POST | `/trips` | 4 |
| GET | `/trips/{id}` | 4 |
| PUT | `/trips/{id}` | 4 |
| DELETE | `/trips/{id}` | 4 |
| PATCH | `/trips/{id}/change-status` | 4 |
| GET | `/trips/{id}/events` | 4 |
| GET | `/trips/{id}/routes` | 4 |
| GET | `/trips/{id}/checkpoints` | 4 |
| POST | `/trips/{id}/checkpoints/{id}/check-in` | 4 |
| POST | `/trips/{id}/pod/upload` | 4 |
| POST | `/trips/{id}/pod/sign` | 4 |

### Tracking
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/tracker/metrics` | 2 |
| POST | `/tracker/playback` | 4 |
| GET | `/tracker/{device}` | 3 |

### Maintenance
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/maintenances` | 5 |
| POST | `/maintenances/schedule` | 5 |
| GET | `/maintenances/stats` | 2 |
| GET | `/maintenances/upcoming` | 2 |
| POST | `/maintenances/logs/{id}/assign` | 5 |
| POST | `/maintenances/logs/{id}/start` | 5 |
| POST | `/maintenances/logs/{id}/complete` | 5 |
| PATCH | `/maintenances/logs/{id}/progress` | 5 |
| GET | `/maintenances/logs/{id}/parts` | 5 |
| POST | `/maintenances/logs/{id}/parts` | 5 |
| GET | `/maintenance/jobs` | 5 |
| POST | `/maintenance/jobs` | 5 |
| PATCH | `/maintenance/jobs/{id}/transition` | 5 |
| GET | `/maintenance/jobs/{id}/history` | 5 |
| GET | `/maintenance/jobs/{id}/conversation` | 5 |
| POST | `/maintenance/jobs/{id}/messages` | 5 |
| GET | `/maintenance/alerts` | 5 |
| PATCH | `/maintenance/alerts/{id}/acknowledge` | 5 |
| PATCH | `/maintenance/alerts/{id}/snooze` | 5 |
| POST | `/maintenance/alerts/{id}/work-order` | 5 |

### Geofences
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/geofences` | 6 |
| POST | `/geofences` | 6 |
| GET | `/geofences/{id}` | 6 |
| PUT | `/geofences/{id}` | 6 |
| DELETE | `/geofences/{id}` | 6 |

### Incidents
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/incidents` | 7 |
| POST | `/incidents` | 7 |
| GET | `/incidents/{id}` | 7 |
| POST | `/incidents/{id}/investigate` | 7 |
| POST | `/incidents/{id}/resolve` | 7 |
| POST | `/incidents/{id}/close` | 7 |
| POST | `/incidents/{id}/escalate` | 7 |
| POST | `/incidents/{id}/dismiss` | 7 |
| GET | `/incidents/{id}/history` | 7 |
| POST | `/incidents/{id}/messages` | 7 |

### Fuel Management
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/fuel-expenses` | 8 |
| POST | `/fuel-expenses` | 8 |
| POST | `/fuel-expenses/{id}/approve` | 8 |
| POST | `/fuel-expenses/{id}/reject` | 8 |
| GET | `/fuel-card/transactions` | 8 |
| POST | `/fuel-card-providers` | 8 |
| POST | `/fuel-card-providers/{id}/sync` | 8 |
| GET | `/fuel-reconciliation/report` | 8 |
| POST | `/fuel-reconciliation/run` | 8 |
| GET | `/fuel/compliance/ifta-report` | 8 |
| GET | `/fuel/reports/theft-summary` | 8 |

### Analytics
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/analytics/fleet/utilization-summary` | 9 |
| GET | `/analytics/fleet/availability-trend` | 9 |
| GET | `/analytics/drivers/trip-summary` | 9 |
| GET | `/analytics/drivers/compliance` | 9 |
| GET | `/analytics/fuel/consumption-report` | 9 |
| GET | `/analytics/fuel/efficiency-report` | 9 |
| GET | `/analytics/maintenance/schedule-compliance` | 9 |
| GET | `/analytics/incidents/summary` | 9 |
| GET | `/analytics/gps/trip-summary` | 9 |
| GET | `/analytics/insights/fleet-health-score` | 9 |
| GET | `/analytics/insights/predictive-maintenance` | 9 |
| GET | `/analytics/reports/export` | 9 |
| POST | `/analytics/reports/scheduled` | 9 |

### Billing
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/subscriptions/plans` | 10 |
| GET | `/subscriptions/organization` | 10 |
| POST | `/subscriptions/payments/initialize` | 10 |
| POST | `/subscriptions/change-plan` | 10 |
| GET | `/subscriptions/invoices` | 10 |
| GET | `/subscriptions/invoices/{id}/pdf` | 10 |

### Notifications
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/notifications/user/inbox` | 11 |
| PATCH | `/notifications/user/inbox/read` | 11 |
| POST | `/notifications/user/inbox/read-all` | 11 |
| GET | `/notifications/user/channels` | 11 |
| PUT | `/notifications/user/channels` | 11 |
| POST | `/notifications/config/rules` | 11 |

### Webhooks
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/webhooks` | 12 |
| POST | `/webhooks` | 12 |
| GET | `/webhooks/{id}` | 12 |
| PUT | `/webhooks/{id}` | 12 |
| DELETE | `/webhooks/{id}` | 12 |
| POST | `/webhooks/{id}/test` | 12 |
| GET | `/webhooks/{id}/deliveries` | 12 |

### Vendors & Workshop
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/vendors` | 13 |
| GET | `/vendors/directory` | 13 |
| POST | `/vendors/invite` | 13 |
| GET | `/workshop/jobs` | 13 |
| POST | `/workshop/jobs/{id}/accept` | 13 |
| POST | `/workshop/jobs/{id}/complete` | 13 |

### Settings
| Method | Endpoint | Phase |
|--------|----------|-------|
| GET | `/users` | 14 |
| POST | `/users` | 14 |
| PUT | `/users/{id}` | 14 |
| DELETE | `/users/{id}` | 14 |
| GET | `/roles` | 14 |
| GET | `/clusters` | 14 |
| POST | `/clusters` | 14 |
| GET | `/organizations/{id}` | 14 |
| PUT | `/organizations/{id}` | 14 |
| GET | `/api-keys` | 14 |
| POST | `/api-keys` | 14 |
| POST | `/api-keys/{id}/rotate` | 14 |
| POST | `/api-keys/{id}/revoke` | 14 |

---

## 11. Deployment

### Development

```bash
npm run dev
# http://localhost:3000
```

Add `http://localhost:3000` to `config/cors.php` allowed origins in Laravel.

### Production

```bash
npm run build
npm start
# or deploy to Vercel / self-host with PM2
```

### Environment Variables (production)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.eonsfleet.io/v1
NEXT_PUBLIC_PUSHER_APP_KEY=<reverb_app_key>
NEXT_PUBLIC_PUSHER_HOST=reverb.eonsfleet.io
NEXT_PUBLIC_PUSHER_PORT=443
NEXT_PUBLIC_PUSHER_SCHEME=https
```

### Nginx (self-hosted)

```nginx
server {
  listen 443 ssl;
  server_name app.eonsfleet.io;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## Summary: Implementation Phases Timeline

| Phase | Feature | Plans | Roles | Weeks |
|-------|---------|-------|-------|-------|
| 1 | Auth + Shell | All | All | 1 |
| 2 | Dashboard | All | All | 1 |
| 3 | Vehicles & Drivers | All | All except finance | 1.5 |
| 4 | Trip Management | All | All except finance | 1.5 |
| 5 | Maintenance | All (basic) / Growth+ (workflows) | fleet_manager, mechanic, admin | 2 |
| 6 | Geofencing | Growth+ | fleet_manager, admin | 1 |
| 7 | Incidents | Enterprise | fleet_manager, compliance, admin | 1.5 |
| 8 | Fuel Management | Growth+ | fleet_manager, finance, admin | 2 |
| 9 | Analytics & Reports | Growth+ | fleet_manager, compliance, finance, admin | 2 |
| 10 | Billing & Subscriptions | All | finance, admin | 1 |
| 11 | Notifications | All | All | 1 |
| 12 | Webhooks & Integrations | Growth+ | admin | 1 |
| 13 | Vendor & Workshop | All | vendor, fleet_manager, admin | 1.5 |
| 14 | Settings & Administration | All | admin, fleet_manager | 1 |
| **Total** | | | | **~19 weeks** |

---

*End of document. Estimated effort: 2 frontend developers, 9–10 sprint weeks at standard velocity.*
