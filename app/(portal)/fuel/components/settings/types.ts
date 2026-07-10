export interface GeneralFuelSettings {
    fuelUnit: string
    economyUnit: string
    currency: string
    decimalPrecision: string
    timeZone: string
    dateFormat: string
    tankCapacity: string
    idleDetectionMinutes: string
}

export interface ThresholdSettings {
    low: string
    critical: string
    refuelFull: string
    applyTo: 'all' | 'groups'
}

export interface IdleDetectionSettings {
    speedThreshold: string
    timeThreshold: string
}

export interface AlertChannelSettings {
    inApp: boolean
    email: boolean
    sms: boolean
    webhook: boolean
}

export interface AlertsSettings {
    channels: AlertChannelSettings
    quietFrom: string
    quietTo: string
    dailySummaryEnabled: boolean
    summaryTime: string
}

export interface DataRefreshSettings {
    interval: string
}

export interface ViewPreferenceSettings {
    landingPage: string
    dateRange: string
}

export interface SystemPreferenceSettings {
    manualEntry: boolean
    bulkImport: boolean
    theftDetection: boolean
}

export interface FuelSettingsFormState {
    general: GeneralFuelSettings
    thresholds: ThresholdSettings
    idleDetection: IdleDetectionSettings
    alerts: AlertsSettings
    dataRefresh: DataRefreshSettings
    viewPreferences: ViewPreferenceSettings
    systemPreferences: SystemPreferenceSettings
}

export const TIME_OPTIONS: { value: string; label: string }[] = Array.from({ length: 24 }, (_, hour) => {
    const period = hour < 12 ? 'AM' : 'PM'
    const displayHour = hour % 12 === 0 ? 12 : hour % 12
    return {
        value: `${String(hour).padStart(2, '0')}:00`,
        label: `${String(displayHour).padStart(2, '0')}:00 ${period}`,
    }
})

export const DEFAULT_FUEL_SETTINGS: FuelSettingsFormState = {
    general: {
        fuelUnit: 'liters',
        economyUnit: 'km_l',
        currency: 'ngn',
        decimalPrecision: '2',
        timeZone: 'gmt+1_lagos',
        dateFormat: 'MMM_DD_YYYY',
        tankCapacity: '200',
        idleDetectionMinutes: '5',
    },
    thresholds: {
        low: '15',
        critical: '8',
        refuelFull: '95',
        applyTo: 'all',
    },
    idleDetection: {
        speedThreshold: '5',
        timeThreshold: '5',
    },
    alerts: {
        channels: { inApp: true, email: true, sms: false, webhook: false },
        quietFrom: '22:00',
        quietTo: '06:00',
        dailySummaryEnabled: true,
        summaryTime: '08:00',
    },
    dataRefresh: {
        interval: '5',
    },
    viewPreferences: {
        landingPage: 'overview',
        dateRange: 'last_7_days',
    },
    systemPreferences: {
        manualEntry: true,
        bulkImport: true,
        theftDetection: true,
    },
}
