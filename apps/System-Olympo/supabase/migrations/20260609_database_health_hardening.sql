do $$
begin
  if to_regclass('public.characters') is not null then
    execute 'create index if not exists characters_user_updated_at_idx on public.characters (user_id, updated_at desc)';
    execute 'create index if not exists characters_updated_at_idx on public.characters (updated_at desc)';
  end if;

  if to_regclass('public.ability_reviews') is not null then
    execute 'create index if not exists ability_reviews_character_id_idx on public.ability_reviews (character_id)';
  end if;

  if to_regclass('public.grimorios') is not null then
    execute 'create index if not exists grimorios_character_created_at_idx on public.grimorios (character_id, created_at)';
  end if;

  if to_regclass('public.legendary_weapons') is not null then
    execute 'create index if not exists legendary_weapons_updated_at_idx on public.legendary_weapons (updated_at desc)';
  end if;

  if to_regclass('public.alchemy_rituals') is not null then
    execute 'create index if not exists alchemy_rituals_circle_name_idx on public.alchemy_rituals (circle, name)';
  end if;

  if to_regclass('public.spells') is not null then
    execute 'create index if not exists spells_circle_name_idx on public.spells (circle, name)';
  end if;

  if to_regclass('public.runes') is not null then
    execute 'create index if not exists runes_circle_name_idx on public.runes (circle, name)';
  end if;

  if to_regclass('public.magics') is not null then
    execute 'create index if not exists magics_circle_name_idx on public.magics (circle, name)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.characters') is not null then execute 'analyze public.characters'; end if;
  if to_regclass('public.ability_reviews') is not null then execute 'analyze public.ability_reviews'; end if;
  if to_regclass('public.grimorios') is not null then execute 'analyze public.grimorios'; end if;
  if to_regclass('public.legendary_weapons') is not null then execute 'analyze public.legendary_weapons'; end if;
  if to_regclass('public.alchemy_rituals') is not null then execute 'analyze public.alchemy_rituals'; end if;
  if to_regclass('public.spells') is not null then execute 'analyze public.spells'; end if;
  if to_regclass('public.runes') is not null then execute 'analyze public.runes'; end if;
  if to_regclass('public.magics') is not null then execute 'analyze public.magics'; end if;
end $$;
