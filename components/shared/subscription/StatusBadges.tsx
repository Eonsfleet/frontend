import { cn } from '@/lib/utils'
import type {
    SubscriptionStatus,
    PocStatus,
    BillingGroupStatus,
    InvoiceStatus,
    PaymentStatus,
} from '@/types/subscription'

type BadgeTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'blue'

const TONE_CLASSES: Record<BadgeTone, string> = {
    slate: 'bg-slate-100 text-slate-500 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
}

function TextBadge({ label, tone, className }: { label: string; tone: BadgeTone; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                TONE_CLASSES[tone],
                className,
            )}
        >
            {label}
        </span>
    )
}

const SUBSCRIPTION_STATUS_CONFIG: Record<SubscriptionStatus, { label: string; tone: BadgeTone }> = {
    DRAFT: { label: 'Draft', tone: 'slate' },
    PENDING_ACTIVATION: { label: 'Pending Activation', tone: 'blue' },
    ACTIVE: { label: 'Active', tone: 'emerald' },
    PAST_DUE: { label: 'Past Due', tone: 'amber' },
    SUSPENDED: { label: 'Suspended', tone: 'rose' },
    CANCELLED: { label: 'Cancelled', tone: 'slate' },
    EXPIRED: { label: 'Expired', tone: 'rose' },
}

export function SubscriptionStatusBadge({ status, className }: { status: SubscriptionStatus; className?: string }) {
    const cfg = SUBSCRIPTION_STATUS_CONFIG[status]
    return <TextBadge label={cfg.label} tone={cfg.tone} className={className} />
}

const POC_STATUS_CONFIG: Record<PocStatus, { label: string; tone: BadgeTone }> = {
    DRAFT: { label: 'Draft', tone: 'slate' },
    PENDING_APPROVAL: { label: 'Pending Approval', tone: 'amber' },
    SCHEDULED: { label: 'Scheduled', tone: 'blue' },
    ACTIVE: { label: 'Active', tone: 'emerald' },
    EXPIRED: { label: 'Expired', tone: 'rose' },
    CONVERTED: { label: 'Converted', tone: 'blue' },
    CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

export function PocStatusBadge({ status, className }: { status: PocStatus; className?: string }) {
    const cfg = POC_STATUS_CONFIG[status]
    return <TextBadge label={cfg.label} tone={cfg.tone} className={className} />
}

const BILLING_GROUP_STATUS_CONFIG: Record<BillingGroupStatus, { label: string; tone: BadgeTone }> = {
    PENDING: { label: 'Pending', tone: 'slate' },
    ACTIVE: { label: 'Active', tone: 'emerald' },
    PAST_DUE: { label: 'Past Due', tone: 'amber' },
    SUSPENDED: { label: 'Suspended', tone: 'rose' },
    CANCELLED: { label: 'Cancelled', tone: 'slate' },
    COMPLETED: { label: 'Completed', tone: 'blue' },
}

export function BillingGroupStatusBadge({ status, className }: { status: BillingGroupStatus; className?: string }) {
    const cfg = BILLING_GROUP_STATUS_CONFIG[status]
    return <TextBadge label={cfg.label} tone={cfg.tone} className={className} />
}

const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
    DRAFT: { label: 'Draft', tone: 'slate' },
    ISSUED: { label: 'Issued', tone: 'blue' },
    PARTIALLY_PAID: { label: 'Partially Paid', tone: 'amber' },
    PAID: { label: 'Paid', tone: 'emerald' },
    OVERDUE: { label: 'Overdue', tone: 'rose' },
    VOID: { label: 'Void', tone: 'slate' },
    CANCELLED: { label: 'Cancelled', tone: 'slate' },
}

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
    const cfg = INVOICE_STATUS_CONFIG[status]
    return <TextBadge label={cfg.label} tone={cfg.tone} className={className} />
}

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
    PENDING: { label: 'Pending', tone: 'slate' },
    PROCESSING: { label: 'Processing', tone: 'blue' },
    SUCCESSFUL: { label: 'Successful', tone: 'emerald' },
    FAILED: { label: 'Failed', tone: 'rose' },
    CANCELLED: { label: 'Cancelled', tone: 'slate' },
    REFUNDED: { label: 'Refunded', tone: 'amber' },
    PARTIALLY_REFUNDED: { label: 'Partially Refunded', tone: 'amber' },
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
    const cfg = PAYMENT_STATUS_CONFIG[status]
    return <TextBadge label={cfg.label} tone={cfg.tone} className={className} />
}

const BILLING_CYCLE_LABEL: Record<'MONTHLY' | 'ANNUAL', string> = {
    MONTHLY: 'Monthly',
    ANNUAL: 'Annual',
}

export function BillingCycleBadge({ cycle, className }: { cycle: 'MONTHLY' | 'ANNUAL'; className?: string }) {
    return <TextBadge label={BILLING_CYCLE_LABEL[cycle]} tone="slate" className={className} />
}
