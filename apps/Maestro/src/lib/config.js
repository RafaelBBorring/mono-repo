const appUrl = import.meta.env.VITE_APP_URL?.trim() || window.location.origin
const appBaseUrl = appUrl.split('#')[0].replace(/\/$/, '')

export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '',
  appUrl,
  miroWebSdkUrl: import.meta.env.VITE_MIRO_WEB_SDK_URL?.trim() || `${appBaseUrl}/#/app/miro-capture`,
  demoEnabled: import.meta.env.VITE_ENABLE_DEMO !== 'false',
}

export const hasSupabaseConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey)
