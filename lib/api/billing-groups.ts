// Client Portal API layer for the asset-based billing-group model described in
// docs/eonsfleet_frontend_ui_subscription_specification.md.
//
// The backend does not expose billing-group, POC, or payments-list endpoints yet
// (only /subscriptions/assets, /subscriptions/organization/current, and
// /subscriptions/invoices — see lib/api/billing.ts). Every function below is
// mocked against the contract this UI needs, following the same in-memory mock
// pattern already used for payment methods / billing requests in lib/api/billing.ts.
// Swap the function bodies for real apiClient calls once the endpoints exist —
// callers (react-query hooks) do not need to change.
import type {
    SubscriptionOverview,
    SubscriptionNotice,
    SubscriptionActivityEvent,
    BillingGroupSummary,
    BillingGroupDetail,
    EligibleAsset,
    BillingPreview,
    InvoiceListItem,
    InvoiceDetail,
    PaymentListItem,
    CurrentPlan,
    PlanOption,
    PocOverview,
    PocAsset,
    Money,
} from '@/types/subscription'

function delay<T>(value: T, ms = 400): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function money(amount: number, currency = 'NGN'): Money {
    return { amount, currency }
}

// ─── Overview (spec section 7) ────────────────────────────────────────────────

export const getSubscriptionOverview = async (): Promise<SubscriptionOverview> => {
    return delay({
        organizationName: 'EonsFleet Logistics Ltd',
        subscriptionType: 'PRODUCTION',
        status: 'ACTIVE',
        plan: { name: 'Standard', billingCycle: 'MONTHLY' },
        billableAssets: { total: 1300, billingGroupCount: 2 },
        nearestRenewal: { date: '2026-08-28', amount: money(1500000) },
        outstandingBalance: { amount: money(500000), overdueInvoiceCount: 1 },
        gracePeriodEndsAt: null,
    })
}

export const getSubscriptionNotices = async (): Promise<SubscriptionNotice[]> => {
    return delay([
        {
            id: 'notice-1',
            message: 'Invoice INV-2026-0028 is due on 3 August 2026.',
            actionLabel: 'View invoice',
            actionHref: '/subscription/invoices/INV-2026-0028',
            severity: 'warning',
        },
        {
            id: 'notice-2',
            message: '12 assets are scheduled for billing removal on 28 August 2026.',
            actionLabel: 'View billing group',
            actionHref: '/subscription/billing-groups/bg-1',
            severity: 'info',
        },
    ])
}

export const getSubscriptionActivity = async (): Promise<SubscriptionActivityEvent[]> => {
    return delay([
        { id: 'act-1', type: 'payment_received', label: 'Payment received', timestamp: '2026-07-20T10:15:00Z', amount: money(1500000) },
        { id: 'act-2', type: 'invoice_issued', label: 'Invoice issued', timestamp: '2026-07-14T09:00:00Z', amount: money(1500000) },
        { id: 'act-3', type: 'assets_added', label: 'Assets added', timestamp: '2026-07-01T08:30:00Z', assetCount: 20 },
        { id: 'act-4', type: 'billing_group_created', label: 'Billing group created', timestamp: '2026-06-28T12:00:00Z', assetCount: 300 },
    ])
}

// ─── Billing groups (spec section 8) ──────────────────────────────────────────

const MOCK_BILLING_GROUPS: BillingGroupDetail[] = [
    {
        id: 'bg-1',
        name: 'July 2026 onboarding',
        plan: 'Standard',
        assetCount: 300,
        unitPrice: money(5000),
        billingCycle: 'MONTHLY',
        currentPeriodStart: '2026-07-28',
        currentPeriodEnd: '2026-08-27',
        nextRenewal: '2026-08-28',
        renewalAmount: money(1500000),
        status: 'ACTIVE',
        subtotal: money(1500000),
        discount: money(0),
        tax: money(0),
        total: money(1500000),
        billingStart: '2026-01-28',
        cancellationState: 'none',
        assets: Array.from({ length: 6 }, (_, i) => ({
            id: i + 1,
            assetType: 'Vehicle' as const,
            label: `Vehicle ${i + 1}`,
            registrationNumber: `ABC-${100 + i}`,
            deviceStatus: 'online' as const,
            billingStart: '2026-01-28',
            billingEnd: null,
            status: 'active' as const,
            removalDate: null,
        })),
        invoices: [
            { invoiceNumber: 'INV-2026-0028', period: 'Jul 2026', issuedDate: '2026-07-14', dueDate: '2026-08-03', amount: money(1500000), status: 'ISSUED' },
            { invoiceNumber: 'INV-2026-0012', period: 'Jun 2026', issuedDate: '2026-06-14', dueDate: '2026-07-03', amount: money(1500000), status: 'PAID' },
        ],
        activity: [
            { id: 'bg1-act-1', type: 'invoice_issued', label: 'Invoice issued', timestamp: '2026-07-14T09:00:00Z', amount: money(1500000) },
            { id: 'bg1-act-2', type: 'billing_group_created', label: 'Billing group created', timestamp: '2026-01-28T08:00:00Z', assetCount: 300 },
        ],
    },
    {
        id: 'bg-2',
        name: 'August 2026 onboarding',
        plan: 'Standard',
        assetCount: 1000,
        unitPrice: money(5000),
        billingCycle: 'MONTHLY',
        currentPeriodStart: '2026-08-15',
        currentPeriodEnd: '2026-09-14',
        nextRenewal: '2026-09-15',
        renewalAmount: money(5000000),
        status: 'ACTIVE',
        subtotal: money(5000000),
        discount: money(0),
        tax: money(0),
        total: money(5000000),
        billingStart: '2026-02-15',
        cancellationState: 'none',
        assets: Array.from({ length: 4 }, (_, i) => ({
            id: 1000 + i,
            assetType: 'Vehicle' as const,
            label: `Vehicle ${1000 + i}`,
            registrationNumber: `XYZ-${900 + i}`,
            deviceStatus: 'online' as const,
            billingStart: '2026-02-15',
            billingEnd: null,
            status: 'active' as const,
            removalDate: null,
        })),
        invoices: [
            { invoiceNumber: 'INV-2026-0031', period: 'Aug 2026', issuedDate: '2026-08-15', dueDate: '2026-09-04', amount: money(5000000), status: 'DRAFT' },
        ],
        activity: [
            { id: 'bg2-act-1', type: 'billing_group_created', label: 'Billing group created', timestamp: '2026-02-15T08:00:00Z', assetCount: 1000 },
        ],
    },
]

export const getBillingGroups = async (): Promise<BillingGroupSummary[]> => {
    return delay(MOCK_BILLING_GROUPS.map(({ assets: _assets, invoices: _invoices, activity: _activity, ...summary }) => summary))
}

export const getBillingGroupDetail = async (id: string): Promise<BillingGroupDetail | null> => {
    return delay(MOCK_BILLING_GROUPS.find((g) => g.id === id) ?? null)
}

// ─── Add assets flow (spec section 9) ─────────────────────────────────────────

export const getEligibleAssets = async (): Promise<EligibleAsset[]> => {
    return delay([
        { id: 2001, assetType: 'Vehicle', label: 'Vehicle 2001', registrationNumber: 'LND-201', hasDevice: true, vehicleType: 'Truck', onboardingDate: '2026-07-01', location: 'Lagos', eligible: true, ineligibleReason: null },
        { id: 2002, assetType: 'Vehicle', label: 'Vehicle 2002', registrationNumber: 'LND-202', hasDevice: true, vehicleType: 'Van', onboardingDate: '2026-07-02', location: 'Lagos', eligible: true, ineligibleReason: null },
        { id: 2003, assetType: 'Vehicle', label: 'Vehicle 2003', registrationNumber: 'LND-203', hasDevice: false, vehicleType: 'Truck', onboardingDate: '2026-07-03', location: 'Abuja', eligible: false, ineligibleReason: 'No tracking device installed.' },
        { id: 1, assetType: 'Vehicle', label: 'Vehicle 1', registrationNumber: 'ABC-100', hasDevice: true, vehicleType: 'Truck', onboardingDate: '2026-01-28', location: 'Lagos', eligible: false, ineligibleReason: 'Already billed under July 2026 onboarding.' },
    ])
}

export const previewBillingGroup = async (input: {
    assetIds: number[]
    billingCycle: 'MONTHLY' | 'ANNUAL'
    billingStart: string
}): Promise<BillingPreview> => {
    const unitPriceAmount = 5000
    const subtotal = unitPriceAmount * input.assetIds.length
    const start = new Date(input.billingStart)
    const nextRenewal = new Date(start)
    nextRenewal.setMonth(nextRenewal.getMonth() + (input.billingCycle === 'ANNUAL' ? 12 : 1))

    return delay({
        assetCount: input.assetIds.length,
        unitPrice: money(unitPriceAmount),
        subtotal: money(subtotal),
        discount: money(0),
        tax: money(0),
        total: money(subtotal),
        billingStart: input.billingStart,
        nextRenewal: nextRenewal.toISOString().slice(0, 10),
        isNegotiatedPrice: false,
    })
}

export interface CreateBillingGroupResult {
    billingGroupId: string
    invoiceNumber: string
    amount: Money
    nextRenewal: string
}

export const createBillingGroup = async (input: {
    assetIds: number[]
    plan: string
    billingCycle: 'MONTHLY' | 'ANNUAL'
    billingStart: string
}): Promise<CreateBillingGroupResult> => {
    const preview = await previewBillingGroup(input)
    return delay(
        {
            billingGroupId: `bg-${Date.now().toString().slice(-4)}`,
            invoiceNumber: `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
            amount: preview.total,
            nextRenewal: preview.nextRenewal,
        },
        700,
    )
}

// ─── Asset removal (spec section 10) ──────────────────────────────────────────

export const scheduleAssetRemoval = async (input: {
    billingGroupId: string
    assetId: number
    effectiveDate: string
    reason: string
}): Promise<{ success: true }> => {
    return delay({ success: true }, 500)
}

export const requestImmediateRemoval = async (input: {
    billingGroupId: string
    assetId: number
    reason: string
}): Promise<{ success: true }> => {
    return delay({ success: true }, 500)
}

// ─── Invoices (spec section 11) ───────────────────────────────────────────────

const MOCK_INVOICES: InvoiceDetail[] = [
    {
        id: 'INV-2026-0028',
        invoiceNumber: 'INV-2026-0028',
        issuedDate: '2026-07-14',
        billingPeriod: 'Jul 2026',
        dueDate: '2026-08-03',
        amount: money(1500000),
        amountPaid: money(0),
        balance: money(1500000),
        status: 'ISSUED',
        billingGroupId: 'bg-1',
        payable: true,
        organizationName: 'EonsFleet Logistics Ltd',
        subtotal: money(1500000),
        discount: money(0),
        tax: money(0),
        lineItems: [
            { description: 'Asset subscription: July onboarding', quantity: 300, unitPrice: money(5000), discount: money(0), tax: money(0), total: money(1500000) },
        ],
    },
    {
        id: 'INV-2026-0012',
        invoiceNumber: 'INV-2026-0012',
        issuedDate: '2026-06-14',
        billingPeriod: 'Jun 2026',
        dueDate: '2026-07-03',
        amount: money(1500000),
        amountPaid: money(1500000),
        balance: money(0),
        status: 'PAID',
        billingGroupId: 'bg-1',
        payable: false,
        organizationName: 'EonsFleet Logistics Ltd',
        subtotal: money(1500000),
        discount: money(0),
        tax: money(0),
        lineItems: [
            { description: 'Asset subscription: July onboarding', quantity: 300, unitPrice: money(5000), discount: money(0), tax: money(0), total: money(1500000) },
        ],
    },
    {
        id: 'INV-2026-0031',
        invoiceNumber: 'INV-2026-0031',
        issuedDate: '2026-08-15',
        billingPeriod: 'Aug 2026',
        dueDate: '2026-09-04',
        amount: money(5000000),
        amountPaid: money(0),
        balance: money(5000000),
        status: 'DRAFT',
        billingGroupId: 'bg-2',
        payable: false,
        organizationName: 'EonsFleet Logistics Ltd',
        subtotal: money(5000000),
        discount: money(0),
        tax: money(0),
        lineItems: [
            { description: 'Asset subscription: August onboarding', quantity: 1000, unitPrice: money(5000), discount: money(0), tax: money(0), total: money(5000000) },
        ],
    },
]

export const getSubscriptionInvoices = async (): Promise<InvoiceListItem[]> => {
    return delay(MOCK_INVOICES.map(({ lineItems: _lineItems, organizationName: _organizationName, subtotal: _subtotal, discount: _discount, tax: _tax, ...item }) => item))
}

export const getSubscriptionInvoiceDetail = async (id: string): Promise<InvoiceDetail | null> => {
    return delay(MOCK_INVOICES.find((inv) => inv.id === id) ?? null)
}

export interface InitiatePaymentResult {
    reference: string
    checkoutUrl: string
}

export const initiateInvoicePayment = async (invoiceId: string): Promise<InitiatePaymentResult> => {
    return delay({
        reference: `EONS-TXN-${Math.floor(Math.random() * 90000000 + 10000000)}`,
        checkoutUrl: 'https://checkout.paystack.com/mock-session',
    }, 600)
}

export type PaymentVerificationState = 'pending' | 'successful' | 'failed'

export const verifyPayment = async (reference: string): Promise<{ state: PaymentVerificationState }> => {
    // Backend confirmation, never mark successful from a browser redirect alone (spec section 11.3).
    return delay({ state: 'successful' }, 1200)
}

// ─── Payments (spec section 12) ───────────────────────────────────────────────

export const getSubscriptionPayments = async (): Promise<PaymentListItem[]> => {
    return delay([
        { id: 'pay-1', reference: 'EONS-TXN-88776655', invoiceNumber: 'INV-2026-0012', date: '2026-06-15', method: 'Card', amount: money(1500000), provider: 'Paystack', status: 'SUCCESSFUL' },
        { id: 'pay-2', reference: 'EONS-TXN-88776600', invoiceNumber: 'INV-2026-0001', date: '2026-05-15', method: 'Bank Transfer', amount: money(1500000), provider: 'Flutterwave', status: 'SUCCESSFUL' },
    ])
}

// ─── Plan & features (spec section 13) ────────────────────────────────────────

export const getCurrentPlan = async (): Promise<CurrentPlan> => {
    return delay({
        name: 'Standard',
        billingCycle: 'MONTHLY',
        pricePerAsset: money(5000),
        currentAssets: 1300,
        estimatedRecurringTotal: money(6500000),
        planStartDate: '2026-01-28',
        features: [
            { category: 'Tracking', name: 'Live GPS tracking', state: 'included' },
            { category: 'Tracking', name: 'Geofencing', state: 'included' },
            { category: 'Operations', name: 'Maintenance scheduling', state: 'included' },
            { category: 'Operations', name: 'Custom roles', state: 'not_included' },
            { category: 'Fuel', name: 'Fuel monitoring', state: 'limited', limitLabel: 'Up to 500 assets' },
            { category: 'Reporting', name: 'Standard reports', state: 'included' },
            { category: 'Reporting', name: 'Custom report builder', state: 'not_included' },
            { category: 'Integrations', name: 'Webhooks', state: 'not_included' },
            { category: 'Support', name: 'Priority support', state: 'not_included' },
        ],
    })
}

export const getPlanOptions = async (): Promise<PlanOption[]> => {
    return delay([
        { id: 'starter', name: 'Starter', pricePerAsset: money(3500), supportedCycles: ['MONTHLY', 'ANNUAL'], keyFeatures: ['Live GPS tracking', 'Basic reporting'], assetLimit: 'Up to 50 assets', isCurrent: false, cta: 'Request upgrade' },
        { id: 'standard', name: 'Standard', pricePerAsset: money(5000), supportedCycles: ['MONTHLY', 'ANNUAL'], keyFeatures: ['Live GPS tracking', 'Maintenance scheduling', 'Fuel monitoring'], assetLimit: 'Up to 2,000 assets', isCurrent: true, cta: 'Current plan' },
        { id: 'enterprise', name: 'Enterprise', pricePerAsset: money(6500), supportedCycles: ['MONTHLY', 'ANNUAL'], keyFeatures: ['Everything in Standard', 'Custom roles', 'Webhooks', 'Priority support'], assetLimit: 'Unlimited', isCurrent: false, cta: 'Request upgrade' },
        { id: 'custom', name: 'Custom', pricePerAsset: null, supportedCycles: ['MONTHLY', 'ANNUAL'], keyFeatures: ['Negotiated pricing', 'Dedicated account manager'], assetLimit: 'Negotiated', isCurrent: false, cta: 'Contact sales' },
    ])
}

export interface PlanChangeRequestInput {
    requestedPlanId: string
    effectiveDate: string
    note?: string
}

export const submitPlanChangeRequest = async (input: PlanChangeRequestInput): Promise<{ success: true }> => {
    return delay({ success: true }, 600)
}

// ─── POC experience (spec section 14) ─────────────────────────────────────────

export const getPocOverview = async (): Promise<PocOverview | null> => {
    // A Production organization would get null here (no active POC). Demo data
    // matches the spec's worked example so the POC experience is reviewable.
    return delay({
        daysRemaining: 6,
        assetsUsed: 12,
        assetLimit: 20,
        startDate: '2026-07-12',
        endDate: '2026-08-03',
        accountManager: 'Amaka Okafor',
        status: 'ACTIVE',
    })
}

export const getPocAssets = async (): Promise<PocAsset[]> => {
    return delay(
        Array.from({ length: 12 }, (_, i) => ({
            id: 3000 + i,
            assetType: 'Vehicle' as const,
            label: `Vehicle ${3000 + i}`,
            registrationNumber: `POC-${300 + i}`,
            hasDevice: true,
            activatedDate: '2026-07-12',
            status: 'active' as const,
        })),
    )
}

export interface ConvertPocInput {
    planId: string
    billingCycle: 'MONTHLY' | 'ANNUAL'
    assetIds: number[]
}

export interface ConvertPocResult {
    subscriptionId: string
    billingGroupId: string
    invoiceNumber: string
}

export const convertPocToProduction = async (input: ConvertPocInput): Promise<ConvertPocResult> => {
    return delay({
        subscriptionId: `sub-${Date.now().toString().slice(-4)}`,
        billingGroupId: `bg-${Date.now().toString().slice(-4)}`,
        invoiceNumber: `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
    }, 800)
}
