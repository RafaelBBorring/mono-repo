import { getPublicStorageUrl, uploadAdminFile } from '../lib/supabase'

export async function uploadGrimorioImage(file, grimorioId) {
  const ext = file.name.split('.').pop() || 'png'
  const path = `grimorios/${grimorioId}-${Date.now()}.${ext}`
  const { error } = await uploadAdminFile('grimorios', path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data: urlData } = getPublicStorageUrl('grimorios', path)
  return urlData.publicUrl
}
