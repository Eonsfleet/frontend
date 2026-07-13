'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface KpiCardProps {
    label: string;
    value: number;
    description: string;
    icon: LucideIcon;
    active: boolean;
    variant: 'blue' | 'red' | 'amber';
    onClick: () => void;
}

const VARIANT_STYLES = {
    blue: {
        active: 'bg-blue-50 ring-1 ring-blue-200',
        icon: 'text-blue-500',
    },
    red: {
        active: 'bg-red-50 ring-1 ring-red-200',
        icon: 'text-red-500',
    },
    amber: {
        active: 'bg-amber-50 ring-1 ring-amber-200',
        icon: 'text-amber-500',
    },
};

export function KpiCard({
    label,
    value,
    description,
    icon: Icon,
    active,
    variant,
    onClick,
}: KpiCardProps) {
    const styles = VARIANT_STYLES[variant];

    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left px-4 py-3 rounded-xl transition-all select-none cursor-pointer ${
                active ? styles.active : 'bg-white hover:bg-slate-50'
            }`}
        >
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${styles.icon}`} />
                <span className="text-[11px] font-medium text-slate-500">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold text-slate-900">{value}</span>
                <span className="text-[10px] text-slate-400">{description}</span>
            </div>
        </button>
    );
}

export default KpiCard;
