-- ============================================================
-- MIGRATION: Separate tables for each entity type
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. SPELLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS spells (
  id TEXT PRIMARY KEY DEFAULT CONCAT('spell-', SUBSTRING(gen_random_uuid()::text, 1, 12)),
  name TEXT NOT NULL,
  circle INTEGER DEFAULT 1,
  category TEXT DEFAULT 'Ataque',
  pe_cost INTEGER DEFAULT 0,
  min_level INTEGER DEFAULT 1,
  action_cost TEXT DEFAULT 'Ação Padrão',
  duration TEXT DEFAULT 'Instantâneo',
  "range" TEXT DEFAULT 'Pessoal',
  short_description TEXT DEFAULT '',
  effect TEXT NOT NULL DEFAULT '',
  source_kind TEXT DEFAULT 'neutro',
  source_name TEXT DEFAULT '',
  law_name TEXT DEFAULT '',
  price TEXT DEFAULT '',
  rupture_risk INTEGER DEFAULT 1,
  protocol_layer INTEGER DEFAULT 2,
  pp_estimate INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  ai_feedback TEXT DEFAULT '',
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE spells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spells_select_all" ON spells FOR SELECT USING (true);

INSERT INTO spells (id, name, circle, category, pe_cost, min_level, action_cost, duration, "range", short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback, created_by, updated_at)
SELECT id, name, circle, category, pe_cost, min_level, action_cost, duration, "range", short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback, created_by, updated_at
FROM alchemy_rituals WHERE ritual_type = 'spell'
ON CONFLICT (id) DO NOTHING;

-- 2. RUNES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS runes (
  id TEXT PRIMARY KEY DEFAULT CONCAT('rune-', SUBSTRING(gen_random_uuid()::text, 1, 12)),
  name TEXT NOT NULL,
  circle INTEGER DEFAULT 1,
  category TEXT DEFAULT 'Ataque',
  pe_cost INTEGER DEFAULT 0,
  min_level INTEGER DEFAULT 1,
  action_cost TEXT DEFAULT 'Ação Padrão',
  duration TEXT DEFAULT 'Instantâneo',
  "range" TEXT DEFAULT 'Pessoal',
  short_description TEXT DEFAULT '',
  effect TEXT NOT NULL DEFAULT '',
  source_kind TEXT DEFAULT 'neutro',
  source_name TEXT DEFAULT '',
  law_name TEXT DEFAULT '',
  price TEXT DEFAULT '',
  rupture_risk INTEGER DEFAULT 1,
  protocol_layer INTEGER DEFAULT 2,
  pp_estimate INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  ai_feedback TEXT DEFAULT '',
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE runes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runes_select_all" ON runes FOR SELECT USING (true);

INSERT INTO runes (id, name, circle, category, pe_cost, min_level, action_cost, duration, "range", short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback, created_by, updated_at)
SELECT id, name, circle, category, pe_cost, min_level, action_cost, duration, "range", short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback, created_by, updated_at
FROM alchemy_rituals WHERE ritual_type = 'rune'
ON CONFLICT (id) DO NOTHING;

-- 3. MAGICS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS magics (
  id TEXT PRIMARY KEY DEFAULT CONCAT('magic-', SUBSTRING(gen_random_uuid()::text, 1, 12)),
  name TEXT NOT NULL,
  circle INTEGER DEFAULT 1,
  category TEXT DEFAULT 'Ataque',
  pe_cost INTEGER DEFAULT 0,
  min_level INTEGER DEFAULT 1,
  action_cost TEXT DEFAULT 'Ação Padrão',
  duration TEXT DEFAULT 'Instantâneo',
  "range" TEXT DEFAULT 'Pessoal',
  short_description TEXT DEFAULT '',
  effect TEXT NOT NULL DEFAULT '',
  source_kind TEXT DEFAULT 'neutro',
  source_name TEXT DEFAULT '',
  law_name TEXT DEFAULT '',
  price TEXT DEFAULT '',
  rupture_risk INTEGER DEFAULT 1,
  protocol_layer INTEGER DEFAULT 2,
  pp_estimate INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  ai_feedback TEXT DEFAULT '',
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE magics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "magics_select_all" ON magics FOR SELECT USING (true);

INSERT INTO magics (id, name, circle, category, pe_cost, min_level, action_cost, duration, "range", short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback, created_by, updated_at)
SELECT id, name, circle, category, pe_cost, min_level, action_cost, duration, "range", short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback, created_by, updated_at
FROM alchemy_rituals WHERE ritual_type = 'magic'
ON CONFLICT (id) DO NOTHING;

-- 4. LEGENDARY WEAPONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS legendary_weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base TEXT DEFAULT 'custom',
  dano TEXT DEFAULT '',
  attr TEXT DEFAULT 'AM',
  power_level TEXT DEFAULT 'notavel',
  effect TEXT DEFAULT '',
  lore TEXT DEFAULT '',
  image TEXT DEFAULT '',
  habilidades JSONB DEFAULT '{"passivas":[],"ativas":[],"ultimates":[]}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE legendary_weapons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legendary_weapons_select_all" ON legendary_weapons FOR SELECT USING (true);

-- Migrate existing mystic weapons (column mapping)
INSERT INTO legendary_weapons (name, base, dano, attr, power_level, effect, lore, image, habilidades, created_by, updated_at)
SELECT
  name,
  COALESCE(NULLIF("range", ''), NULLIF(law_name, ''), 'custom'),
  COALESCE(NULLIF(price, ''), ''),
  COALESCE(NULLIF(action_cost, ''), 'AM'),
  COALESCE(
    (SELECT split_part(t, ':', 2) FROM unnest(tags) AS t WHERE t LIKE 'power_level:%' LIMIT 1),
    'notavel'
  ),
  COALESCE(NULLIF(effect, ''), ''),
  COALESCE(
    CASE WHEN ai_feedback ~ '^\s*\{' THEN ai_feedback::json->>'lore' ELSE '' END,
    ''
  ),
  COALESCE(
    (SELECT split_part(t, ':', 2) FROM unnest(tags) AS t WHERE t LIKE 'image:%' LIMIT 1),
    ''
  ),
  CASE
    WHEN ai_feedback ~ '^\s*\{' AND (ai_feedback::json->'habilidades') IS NOT NULL THEN
      (ai_feedback::json->'habilidades')::jsonb
    ELSE '{"passivas":[],"ativas":[],"ultimates":[]}'::jsonb
  END,
  created_by,
  COALESCE(updated_at, NOW())
FROM alchemy_rituals
WHERE ritual_type = 'mystic_weapon';

-- 5. Clean up: remove migrated rows from alchemy_rituals (optional — uncomment when ready)
-- DELETE FROM alchemy_rituals WHERE ritual_type IN ('spell', 'rune', 'magic', 'mystic_weapon');
