// Asset-based subscription domain types.
// See docs/eonsfleet_frontend_ui_subscription_specification.md section 37.

export type SubscriptionType = 'POC' | 'PRODUCTION'

export type SubscriptionStatus =
    | 'DRAFT'
    | 'PENDING_ACTIVATION'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'SUSPENDED'
    | 'CANCELLED'
    | 'EXPIRED'

export type PocStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'SCHEDULED'
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CONVERTED'
    | 'CANCELLED'

export type BillingCycle = 'MONTHLY' | 'ANNUAL'

export type BillingGroupStatus =
    | 'PENDING'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'SUSPENDED'
    | 'CANCELLED'
    | 'COMPLETED'

export type InvoiceStatus =
    | 'DRAFT'
    | 'ISSUED'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'OVERDUE'
    | 'VOID'
    | 'CANCELLED'

export type PaymentStatus =
    | 'PENDING'
    | 'PROCESSING'
    | 'SUCCESSFUL'
    | 'FAILED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED'

export interface Money {
    amount: number
    currency: string
}

export interface BillingAsset {
    id: number
    assetType: 'Vehicle' | 'Device'
    label: string
    registrationNumber: string | null
    deviceStatus: 'online' | 'offline' | 'none'
    billingStart: string
    billingEnd: string | null
    status: 'active' | 'removed' | 'scheduled_removal'
    removalDate: string | null
}

export interface BillingGroupSummary {
    id: string
    name: string
    plan: string
    assetCount: number
    unitPrice: Money
    billingCycle: BillingCycle
    currentPeriodStart: string
    currentPeriodEnd: string
    nextRenewal: string
    renewalAmount: Money
    status: BillingGroupStatus
}

export interface BillingGroupInvoiceRef {
    invoiceNumber: string
    period: string
    issuedDate: string
    dueDate: string
    amount: Money
    status: InvoiceStatus
}

export interface BillingGroupActivityEvent {
    id: string
    type: string
    label: string
    timestamp: string
    amount?: Money
    assetCount?: number
}

export interface BillingGroupDetail extends BillingGroupSummary {
    subtotal: Money
    discount: Money
    tax: Money
    total: Money
    billingStart: string
    cancellationState: 'none' | 'scheduled' | 'cancelled'
    assets: BillingAsset[]
    invoices: BillingGroupInvoiceRef[]
    activity: BillingGroupActivityEvent[]
}

export interface EligibleAsset {
    id: number
    assetType: 'Vehicle' | 'Device'
    label: string
    registrationNumber: string | null
    hasDevice: boolean
    vehicleType: string | null
    onboardingDate: string
    location: string | null
    eligible: boolean
    ineligibleReason: string | null
}

export interface BillingPreview {
    assetCount: number
    unitPrice: Money
    subtotal: Money
    discount: Money
    tax: Money
    total: Money
    billingStart: string
    nextRenewal: string
    isNegotiatedPrice: boolean
}

export interface SubscriptionOverview {
    organizationName: string
    subscriptionType: SubscriptionType
    status: SubscriptionStatus
    plan: { name: string; billingCycle: BillingCycle }
    billableAssets: { total: number; billingGroupCount: number }
    nearestRenewal: { date: string; amount: Money } | null
    outstandingBalance: { amount: Money; overdueInvoiceCount: number }
    gracePeriodEndsAt: string | null
}

export interface SubscriptionNotice {
    id: string
    message: string
    actionLabel: string
    actionHref: string
    severity: 'info' | 'warning' | 'critical'
}

export interface SubscriptionActivityEvent {
    id: string
    type: string
    label: string
    timestamp: string
    amount?: Money
    assetCount?: number
}

export interface InvoiceListItem {
    id: string
    invoiceNumber: string
    issuedDate: string
    billingPeriod: string
    dueDate: string
    amount: Money
    amountPaid: Money
    balance: Money
    status: InvoiceStatus
    billingGroupId: string
    payable: boolean
}

export interface InvoiceLineItem {
    description: string
    quantity: number
    unitPrice: Money
    discount: Money
    tax: Money
    total: Money
}

export interface InvoiceDetail extends InvoiceListItem {
    organizationName: string
    subtotal: Money
    discount: Money
    tax: Money
    lineItems: InvoiceLineItem[]
}

export interface PaymentListItem {
    id: string
    reference: string
    invoiceNumber: string
    date: string
    method: string
    amount: Money
    provider: string
    status: PaymentStatus
}

export interface PlanFeature {
    category: 'Tracking' | 'Operations' | 'Fuel' | 'Reporting' | 'Integrations' | 'Support'
    name: string
    state: 'included' | 'not_included' | 'limited'
    limitLabel?: string
}

export interface CurrentPlan {
    name: string
    billingCycle: BillingCycle
    pricePerAsset: Money
    currentAssets: number
    estimatedRecurringTotal: Money
    planStartDate: string
    features: PlanFeature[]
}

export interface PlanOption {
    id: string
    name: 'Starter' | 'Standard' | 'Enterprise' | 'Custom'
    pricePerAsset: Money | null
    supportedCycles: BillingCycle[]
    keyFeatures: string[]
    assetLimit: string
    isCurrent: boolean
    cta: 'Request upgrade' | 'Contact sales' | 'Current plan'
}

export interface PocOverview {
    daysRemaining: number
    assetsUsed: number
    assetLimit: number
    startDate: string
    endDate: string
    accountManager: string | null
    status: PocStatus
}

export interface PocAsset {
    id: number
    assetType: 'Vehicle' | 'Device'
    label: string
    registrationNumber: string | null
    hasDevice: boolean
    activatedDate: string
    status: 'active' | 'inactive'
}

export interface ManualAssetInput {
    assetType: 'Vehicle' | 'Device'
    label: string
    registrationNumber: string
    vehicleType: string
}
