import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { handleOpenRouterRequest } from '../_shared/openrouter.ts'

serve(handleOpenRouterRequest)
