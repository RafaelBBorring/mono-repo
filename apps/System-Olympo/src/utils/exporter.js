export function exportSheet(char, derived) {
  const line = '═'.repeat(45)
  const sep = '─'.repeat(45)
  const mod = (v) => {
    const m = Math.floor((v - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  const vidaVal = char.vidaOverride ?? derived.vida
  const energiaVal = char.energiaOverride ?? derived.energia
  const peVal = char.peOverride ?? derived.pe

  let t = ''
  t += `${line}\n`
  t += `FICHA DE PERSONAGEM — SISTEMA OLYMPO 2.0\n`
  t += `${line}\n`
  t += `NOME: ${char.nome || '---'}            RAÇA: ${char.raca || '---'}\n`
  t += `CLASSE: ${char.classe || '---'}        NÍVEL: ${char.nivel || 1}\n`
  t += `${sep}\n`
  t += `ATRIBUTOS\n`
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const total = (a) => (attrs[a] || 0) + (sk[a] || 0)
  t += `  FOR ${total('FOR')} (${mod(total('FOR'))})   DES ${total('DES')} (${mod(total('DES'))})\n`
  t += `  CON ${total('CON')} (${mod(total('CON'))})   INT ${total('INT')} (${mod(total('INT'))})\n`
  t += `  APA ${total('APA')} (${mod(total('APA'))})   AM  ${total('AM')} (${mod(total('AM'))})\n`
  t += `${sep}\n`
  t += `RECURSOS\n`
  t += `  VIDA: ${vidaVal}${char.vidaOverride !== null ? ' (ajustado)' : ''}   ENERGIA: ${energiaVal}${char.energiaOverride !== null ? ' (ajustado)' : ''}   PE: ${peVal}${char.peOverride !== null ? ' (ajustado)' : ''}\n`
  t += `${sep}\n`
  t += `COMBATE\n`
  t += `  CA: ${derived.ca}   REAÇÕES: ${derived.reacoes}   PERCEPÇÃO PASSIVA: ${derived.percepcao}\n`
  t += `  DANO BASE: ${derived.danoBase}\n`
  t += `${sep}\n`
  t += `PERÍCIAS TREINADAS\n`
  const pericias = char.pericias || {}
  for (const [k, v] of Object.entries(pericias)) {
    if (v > 0) t += `  ${k}: Grau ${v}\n`
  }
  t += `${sep}\n`
  t += `TRIAGEM PRINCIPAL: ${char.triagemPrincipal || 'Nenhuma'} (Nível ${char.triagemPrincipalNivel || 0})\n`
  if (char.triagemPrincipal === 'TANK' && char.triagemPrincipalNivel >= 0.1) {
    t += `  Tank +5 Vida/nível: +${(char.nivel || 1) * 5} Vida total\n`
  }
  t += `SUB-TRIAGEM: ${char.subTriagem || 'Nenhuma'} (Nível ${char.subTriagemNivel || 0})\n`
  t += `${sep}\n`
  t += `MÓDULOS DE EVOLUÇÃO\n`
  for (const m of (char.modulosAdquiridos || [])) {
    t += `  ${m.name || m} ${(m.boughtCount || 1) > 1 ? `(×${m.boughtCount || 1})` : ''}\n`
  }
  t += `${sep}\n`
  t += `ARMA: ${char.arma || 'Nenhuma'} (${char.armaRank || 'Comum'})\n`
  t += `ARTE MARCIAL: ${char.arteMarcial || 'Nenhuma'} — ${char.arteMarcialGrau || 'Novato'}\n`
  t += `${sep}\n`
  t += `HABILIDADES\n`
  for (const h of (char.habilidades || [])) {
    t += `  [${h.tipo}] ${h.nome || '---'}: ${h.descricao || ''} | PP: ${h.ppEstimado || 0} | Status: ${h.status || 'Pendente'}\n`
    if (h.custoEnergia) t += `    Custo: ${h.custoEnergia} Energia | Duração: ${h.duracao || '-'}\n`
  }
  t += `${sep}\n`
  t += `NOTAS: ${char.notas || ''}\n`
  const inv = char.inventario || []
  if (inv.length > 0) {
    t += `${sep}\n`
    t += `INVENTÁRIO\n`
    for (const item of inv) {
      t += `  ${item.nome || 'Item'}${item.descricao ? ': ' + item.descricao : ''}\n`
    }
  }
  t += `${line}\n`
  return t
}
