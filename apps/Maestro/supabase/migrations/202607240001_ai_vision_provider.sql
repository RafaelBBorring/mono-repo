alter table public.ai_provider_configs
  add column if not exists vision_model text,
  add column if not exists vision_endpoint_url text,
  add column if not exists vision_api_key_ciphertext text;
