import { redirect } from 'next/navigation'

export default function WebhooksSettingsRedirect() {
    redirect('/integrations?tab=webhooks')
}
