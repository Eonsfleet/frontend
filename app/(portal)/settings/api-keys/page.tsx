import { redirect } from 'next/navigation'

export default function ApiKeysSettingsRedirect() {
    redirect('/integrations?tab=api')
}
