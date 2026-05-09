import { getSupabaseAdmin } from '../lib/supabase'

export async function uploadGrimorioImage(file, grimorioId) {
  const ext = file.name.split('.').pop() || 'png'
  const path = `grimorios/${grimorioId}-${Date.now()}.${ext}`
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from('grimorios')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('grimorios').getPublicUrl(path)
  return urlData.publicUrl
}
