/**
 * index.js — Indice de Prompts do Sistema Olympo 2.0
 *
 * Cada prompt e exportado como funcao que retorna { system, user } ou string.
 * Tokens estimados sao aproximados (ratio ~3 chars/token).
 */
export { buildBalanceSystemPrompt } from './balanceSystemPrompt'
export { buildBalanceUserPrompt } from './balanceUserPrompt'
export { buildWeaponAbilitiesPrompt } from './weaponAbilitiesPrompt'
export { buildAbilityGenerationPrompt } from './abilityGenerationPrompt'
export { buildLegendaryWeaponPrompt } from './legendaryWeaponPrompt'
export { buildMysticDraftPrompt } from './mysticDraftPrompt'
export { buildAbilityChatPrompt } from './abilityChatPrompt'
export { buildEquipmentAbilitiesPrompt } from './equipmentAbilitiesPrompt'
export { buildEnchantmentPrompt } from './enchantmentPrompt'
