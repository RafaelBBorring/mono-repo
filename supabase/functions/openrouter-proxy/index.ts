import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found.' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const body = await req.json()
    const { messages, temperature, max_tokens } = body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required.' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SITE_URL') ?? 'https://rafaelbborring.github.io',
        'X-Title': 'Sistema Olympo 2.0',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: temperature ?? 0.35,
        max_tokens: max_tokens ?? 8192,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
