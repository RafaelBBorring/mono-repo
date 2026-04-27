-- Migration: Add 'magic' to ritual_type constraint + seed 18 magic rituals
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Update the constraint
ALTER TABLE public.alchemy_rituals DROP CONSTRAINT IF EXISTS alchemy_rituals_ritual_type_check;
ALTER TABLE public.alchemy_rituals ADD CONSTRAINT alchemy_rituals_ritual_type_check
  CHECK (ritual_type IN ('alchemy', 'spell', 'rune', 'magic'));

-- 2. Seed magic rituals (idempotent upsert)
INSERT INTO public.alchemy_rituals (id, ritual_type, name, circle, category, pe_cost, min_level, action_cost, duration, range, short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback)
VALUES
  ('magic-basica-bola-fogo', 'magic', 'Bola de Fogo', 1, 'Ataque', 8, 1, 'Acao Padrao', 'Instantaneo', '18m',
   'Condensa chama arcanica e a lanca como projétil explosivo.',
   'Causa 3d8+10 de dano de fogo em um alvo ou area de 3m. Criaturas na area testam Esquiva DT 14; sucesso causa metade do dano. Pode incendiar objetos inflamaveis.',
   'neutro', 'Escola de Fogo', 'Combustao arcana', 'Nao pode ser conjurada underwater ou em vacuo.', 1, 2, 4,
   '["school:fogo", "area", "projétil"]'::jsonb,
   'Magia basica ofensiva de fogo. Dano direto e limpo para Magos iniciantes.'),

  ('magic-basica-escudo-arcano', 'magic', 'Escudo Arcano', 1, 'Defesa', 6, 1, 'Reacao', '1 rodada', 'Pessoal',
   'Um pane de mana solido absorve o proximo impacto.',
   'Quando atingido por ataque, recebe +8 na Defesa contra esse ataque. Se ainda sofrer dano, reduz 5 do total. Nao funciona contra dano verdadeiro.',
   'neutro', 'Escola de Protecao', 'Barreira de mana', 'So pode ser usado 1 vez por rodada.', 1, 2, 4,
   '["school:arcano", "reacao", "defesa"]'::jsonb,
   'Magia basica defensiva. Reacao limpa para sobrevivencia.'),

  ('magic-basica-rajada-forca', 'magic', 'Rajada de Forca', 1, 'Ataque', 5, 1, 'Acao Padrao', 'Instantaneo', '18m',
   'Um jato de energia cinetica pura golpeia o alvo.',
   'Ataque magico que causa 2d10+8 de dano concussivo e empurra o alvo 3m. Criaturas uma categoria maior resistem ao empurrao automaticamente.',
   'neutro', 'Escola Cinetica', 'Forca e impulso', 'Nao atraverra barreiras magicas.', 1, 2, 3,
   '["school:arcano", "concussivo", "empurrao"]'::jsonb,
   'Magia basica de utilidade ofensiva com controle posicional.'),

  ('magic-basica-deteccao-magica', 'magic', 'Deteccao Arcana', 1, 'Utilidade', 4, 1, 'Acao Bonus', 'Cena', 'Pessoal',
   'Os sentidos arcanos se abrem e revelam residuos magicos.',
   'Detecta presencas magicas em 30m. Identifica escola e intensidade de efeitos ativos. +5 em Percepcao contra criaturas magicas ou ilusoes.',
   'neutro', 'Escola de Leitura', 'Assinatura e ressonancia', 'Causa dor de cabeca leve: -1 em testes de CON ate o fim da cena.', 1, 2, 3,
   '["school:arcano", "deteccao", "sentidos"]'::jsonb,
   'Utilitario basico de informacao arcanica.'),

  ('magic-basica-iluminacao', 'magic', 'Luz Astral', 1, 'Utilidade', 3, 1, 'Acao Bonus', '1 hora', 'Pessoal',
   'Uma esfera de luz pura flutua ao redor do conjurador.',
   'Ilumina 12m com luz branca. Criaturas sombrias na area sofrem -2 em Furtividade. Pode ser lancada em um objeto para ilumina-lo permanentemente por 1 hora.',
   'neutro', 'Escola de Luz', 'Foton e radiacao', 'A luz denuncia a posicao do conjurador.', 1, 2, 2,
   '["school:arcano", "luz", "utilidade"]'::jsonb,
   'Magia basica de exploracao e contra-escuridao.'),

  ('magic-intermediaria-tentaculos-gelo', 'magic', 'Tentaculos de Gelo', 2, 'Controle', 16, 6, 'Acao Padrao', '3 rodadas', 'Area 6m a 15m',
   'Estacas de gelo surgem do chao e prendem tudo na area.',
   'Criaturas na area testam Reflexo DT 16. Falha: sofrem 3d10+14 de dano gelido, ficam lentas e nao podem se mover. Sucesso: metade do dano e lentidao por 1 rodada. A area e considerada terreno dificil.',
   'neutro', 'Escola de Gelo', 'Cristalizacao e imobilizacao', 'Derreter o gelo com fogo intenso exige acao completa.', 2, 2, 7,
   '["school:gelo", "area", "controle"]'::jsonb,
   'Magia intermediaria de zoneamento gelado com dano e controle.'),

  ('magic-intermediaria-chuva-canivetes', 'magic', 'Chuva de Canivetes', 2, 'Ataque', 18, 7, 'Acao Padrao', 'Instantaneo', 'Area 5m a 18m',
   'Laminas arcanas chovem do ceu sobre uma area.',
   'Criaturas na area sofrem 4d10+16 de dano cortante e testam Reflexo DT 17. Falha: tambem sofrem sangramento (2d6 por rodada por 2 rodadas). Sucesso: metade do dano sem sangramento.',
   'neutro', 'Escola de Laminas', 'Forma e corte', 'O conjurador nao pode manter outra magia de area ativa no mesmo turno.', 2, 2, 7,
   '["school:arcano", "area", "corte"]'::jsonb,
   'Magia intermediaria ofensiva de area com sangramento condicional.'),

  ('magic-intermediaria-barreira-mana', 'magic', 'Barreira de Mana', 2, 'Defesa', 20, 6, 'Acao Padrao', '3 rodadas', 'Pessoal',
   'Um casulo de mana absorve impacto e protege o conjurador.',
   'Recebe 60 de vida temporaria. Enquanto ativa, reduz dano magico em 5 por golpe. Ao terminar, recupera 2d8 de Energia se ainda tiver PV temporarios.',
   'neutro', 'Escola de Protecao', 'Absorcao e amortecimento', 'Nao pode usar outra magia defensiva simultanea.', 2, 2, 7,
   '["school:arcano", "barreira", "vida-temp"]'::jsonb,
   'Magia intermediaria defensiva com auto-recuperacao.'),

  ('magic-intermediaria-toque-paralisante', 'magic', 'Toque Paralisante', 2, 'Controle', 14, 5, 'Acao Padrao', '1 rodada', 'Toque',
   'O toque do mago congela os nervos do alvo.',
   'Alvo testa Fortitude DT 17. Falha: fica paralisado por 1 rodada e perde acao de movimento no turno seguinte. Sucesso: fica lento por 1 rodada.',
   'neutro', 'Escola de Biocinese', 'Sistema nervoso e estase', 'Exige toque: o conjurador precisa estar adjacente.', 2, 2, 6,
   '["school:arcano", "paralisia", "toque"]'::jsonb,
   'Magia intermediaria de controle forte com restricao de alcance.'),

  ('magic-intermediaria-salto-relampago', 'magic', 'Salto Relampago', 2, 'Mobilidade', 12, 5, 'Acao Bonus', 'Instantaneo', 'Pessoal',
   'Eletricidade arcan envolve o corpo e o lanca em alta velocidade.',
   'Teleporta ate 15m para ponto visivel. Inimigos adjacentes ao ponto de partida sofrem 2d8+8 de dano eletrico. Nao provoca ataques de oportunidade.',
   'neutro', 'Escola de Eletricidade', 'Carga e deslocamento', 'Nao atravessa barreiras condutoras ou grades runicas.', 2, 2, 6,
   '["school:eletrico", "teleporte", "dano-area"]'::jsonb,
   'Magia intermediaria de mobilidade com dano colateral.'),

  ('magic-avancada-meteoro', 'magic', 'Meteoro Arcano', 3, 'Ataque', 28, 12, 'Acao Padrao', 'Instantaneo', 'Area 8m a 30m',
   'Condensa energia arcan e a lanca como um meteoro de mana pura.',
   'Criaturas na area testam Reflexo DT 20. Falha: sofrem 7d10+25 de dano arcano e ficam caidas. Sucesso: metade do dano. O terreno na area fica incandescente: dano 1d8/rodada por 2 rodadas para quem entrar.',
   'neutro', 'Escola de Destruição', 'Massa e impacto', 'O conjurador nao pode mover-se no turno em que conjurar.', 3, 2, 10,
   '["school:arcano", "area", "destruicao"]'::jsonb,
   'Magia avancada de dano massivo em area com efeito residual.'),

  ('magic-avancada-tempestade-eletrica', 'magic', 'Tempestade Eletrica', 3, 'Ataque', 26, 11, 'Acao Completa', '2 rodadas', 'Area 12m a 24m',
   'Nuvens arcanas formam uma tempestade controlada de raios.',
   'No inicio de cada rodada, escolha ate 3 alvos na area. Cada um sofre 4d10+18 de dano eletrico e testa Fortitude DT 20; falha fica atordoado ate o fim do turno.',
   'neutro', 'Escola de Eletricidade', 'Carga e atmosfera', 'Exige ceu visivel. Em ambientes fechados, dano reduz em 30%.', 3, 2, 9,
   '["school:eletrico", "area", "tempestade"]'::jsonb,
   'Magia avancada de dano sustentado com controle de alvos.'),

  ('magic-avancada-prisao-cristal', 'magic', 'Prisao de Cristal', 3, 'Controle', 24, 12, 'Acao Padrao', '3 rodadas', '18m',
   'Cristais arcanos crescem ao redor do alvo e o aprisionam.',
   'Alvo testa Fortitude DT 20. Falha: fica aprisionado em cristal (paralisado, reducao de dano 10) por 3 rodadas. Cada rodada pode testar FOR DT 20 para quebrar. O cristal tem 80 PV e pode ser destruido.',
   'neutro', 'Escola de Cristalizacao', 'Forma e contencao', 'Se o cristal for quebrado por forca, estilhaços causam 2d8 de dano ao prisioneiro.', 3, 2, 9,
   '["school:gelo", "prissão", "controle"]'::jsonb,
   'Magia avancada de controle duro com saida por forca.'),

  ('magic-avancada-drenar-magia', 'magic', 'Drenar Magia', 3, 'Controle', 22, 13, 'Acao Padrao', 'Instantaneo', 'Toque',
   'Absorve o poder magico de um alvo e o converte em energia propria.',
   'Alvo testa Vontade DT 21. Falha: perde metade da Energia atual e nao pode usar habilidades magicas por 1 rodada. O conjurador recupera 50% da Energia drenada como propria.',
   'neutro', 'Escola de Absorcao', 'Transferencia e vazio', 'Se o alvo resistir, o conjurador perde 10 Energia.', 3, 2, 9,
   '["school:arcano", "dreno", "anti-magia"]'::jsonb,
   'Magia avancada anti-conjurador com auto-recuperacao condicional.'),

  ('magic-suprema-apocalipse-arcano', 'magic', 'Apocalipse Arcano', 4, 'Ataque', 40, 20, 'Acao Completa', 'Instantaneo', 'Area 15m centrada no conjurador',
   'Toda a mana do mago e liberada em uma onda destruiva.',
   'Criaturas na area sofrem 12d12+50 de dano arcano e testam Fortitude DT 24. Falha: tambem ficam surdas e cegas por 1 rodada. Sucesso: metade do dano sem condicoes. Aliados escolhidos sofrem apenas 25% do dano.',
   'neutro', 'Escola de Destruição', 'Ignicao total de mana', 'Apos conjurar, o mago fica sem Energia e sofre exaustao por 1 rodada (-3 em tudo).', 4, 3, 15,
   '["school:arcano", "ultimate", "area-massiva"]'::jsonb,
   'Magia suprema de dano catastrofico com auto-penalizacao severa.'),

  ('magic-suprema-singularidade', 'magic', 'Singularidade Gravitacional', 4, 'Controle', 38, 19, 'Acao Completa', '3 rodadas', 'Area 9m a 24m',
   'Cria um ponto de gravidade extrema que atrai e esmaga.',
   'Centro da area: criaturas testam Fortitude DT 24. Falha: sofrem 8d12+35 de dano esmagador e sao arrastadas 5m ao centro. Sucesso: metade do dano e arrasto 2m. Projeteis que cruzam a area causam -50% dano. Quem estiver no centro no inicio do turno sofre dano novamente.',
   'neutro', 'Escola de Gravidade', 'Massa e curvatura extrema', 'O conjurador tambem sofre -10m de deslocamento enquanto mantiver a singularidade.', 4, 3, 14,
   '["school:gravidade", "singularidade", "zoneamento"]'::jsonb,
   'Magia suprema de zoneamento severo com dano sustentado no centro.'),

  ('magic-suprema-dominio-elemental', 'magic', 'Dominio Elemental', 4, 'Suporte', 35, 18, 'Acao Bonus', 'Combate', 'Pessoal',
   'O mago se funde com os elementos e opera com maestria absoluta.',
   'Durante o combate inteiro, recebe +5 em Poder, +3d10 no dano de todas as magias, e resistencia 50% ao elemento escolhido (fogo, gelo, eletrico ou arcano). Magias de circulo 1-2 custam -3 PE.',
   'neutro', 'Escola de Maestria', 'Harmonia elemental', 'Ao terminar, sofre 2d10 de dano verdadeiro por sobrecarga arcana.', 4, 3, 15,
   '["school:arcano", "buff", "elemental"]'::jsonb,
   'Magia suprema de buff com custo de vida e economia de PE.')
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  circle = excluded.circle,
  category = excluded.category,
  pe_cost = excluded.pe_cost,
  min_level = excluded.min_level,
  action_cost = excluded.action_cost,
  duration = excluded.duration,
  range = excluded.range,
  short_description = excluded.short_description,
  effect = excluded.effect,
  source_kind = excluded.source_kind,
  source_name = excluded.source_name,
  law_name = excluded.law_name,
  price = excluded.price,
  rupture_risk = excluded.rupture_risk,
  protocol_layer = excluded.protocol_layer,
  pp_estimate = excluded.pp_estimate,
  tags = excluded.tags,
  ai_feedback = excluded.ai_feedback;
