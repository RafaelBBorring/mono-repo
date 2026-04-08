/**
 * CHYPER — config.js
 * Game configuration, difficulties, phases, and word pools.
 * v1.1.0
 */

/* ── DIFFICULTY PRESETS ─────────────────────────────────────────────────── */
const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'EASY',
    desc: 'Mais lento, menos palavras. Ideal para iniciantes.',
    speedMult:    0.62,
    spawnMult:    1.6,
    maxOnScreen:  4,
    livesBonus:   2,
    scoreBonus:   1.0,
  },
  normal: {
    id: 'normal',
    label: 'NORMAL',
    desc: 'Velocidade balanceada. A experiência padrão.',
    speedMult:    0.95,
    spawnMult:    1.0,
    maxOnScreen:  6,
    livesBonus:   0,
    scoreBonus:   1.25,
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    desc: 'Rápido e implacável. Só para hackers experientes.',
    speedMult:    1.38,
    spawnMult:    0.72,
    maxOnScreen:  8,
    livesBonus:  -1,
    scoreBonus:   1.6,
  },
  insane: {
    id: 'insane',
    label: 'INSANE',
    desc: 'Caos total. Você foi avisado.',
    speedMult:    1.90,
    spawnMult:    0.52,
    maxOnScreen:  10,
    livesBonus:  -2,
    scoreBonus:   2.2,
  },
};

/* ── PHASE DEFINITIONS ──────────────────────────────────────────────────── */
const PHASES = [
  {
    id: 1,
    name: 'FIREWALL EXTERNO',
    goal: 250,
    baseLives: 5,
    baseSpeed: 0.72,
    baseSpawnRate: 3200,
    wordSizes: ['short', 'short', 'medium'],
    desc: 'Derrube o firewall externo.<br>Palavras simples. Aqueça os dedos.',
  },
  {
    id: 2,
    name: 'CAMADA DE REDE',
    goal: 500,
    baseLives: 5,
    baseSpeed: 1.00,
    baseSpawnRate: 2700,
    wordSizes: ['short', 'medium', 'medium'],
    desc: 'Infiltrando a camada de rede.<br>Velocidade aumentando. Mantenha o foco.',
  },
  {
    id: 3,
    name: 'CRIPTOGRAFIA AES-256',
    goal: 850,
    baseLives: 4,
    baseSpeed: 1.32,
    baseSpawnRate: 2300,
    wordSizes: ['medium', 'medium', 'long'],
    desc: 'Quebrando criptografia de 256-bit.<br>Palavras mais longas. Sem erros.',
  },
  {
    id: 4,
    name: 'NÚCLEO DO SISTEMA',
    goal: 1300,
    baseLives: 4,
    baseSpeed: 1.68,
    baseSpawnRate: 1900,
    wordSizes: ['medium', 'long', 'long'],
    desc: 'Acesso ao núcleo central.<br>Alta velocidade. Concentração máxima.',
  },
  {
    id: 5,
    name: 'ROOT ACCESS',
    goal: 1800,
    baseLives: 3,
    baseSpeed: 2.10,
    baseSpawnRate: 1600,
    wordSizes: ['long', 'long', 'xlarge'],
    desc: 'Escalando privilégios para root.<br>Fase final. Pressão máxima.',
  },
];

/* ── WORD POOLS ─────────────────────────────────────────────────────────── */
const WORDS = {
  short: [
    'hack','root','sudo','exec','ping','port','node','code','void','null',
    'data','init','kill','fork','echo','grep','curl','ssh','api','cpu',
    'ram','log','git','bin','key','hex','tcp','udp','vpn','dns',
    'url','php','sql','xml','css','zip','tar','iso','arp','ipc',
    'net','raw','tty','uid','pid','srv','map','bus','asm','err',
  ],
  medium: [
    'bypass','access','kernel','socket','buffer','packet','server','client',
    'daemon','script','binary','crypto','signal','inject','tunnel','cipher',
    'vector','module','thread','plugin','parser','router','switch','bridge',
    'debug','stack','queue','cache','frame','token','proxy','shell',
    'encode','decode','header','cookie','session','malloc','struct',
    'filter','listen','memory','offset','output','return','define',
    'import','export','extern','static','inline','signed','printf',
  ],
  long: [
    'overflow','callback','assembly','protocol','database','loopback',
    'backdoor','firewall','rootkit','payload','sandbox','runtime',
    'compiler','executor','debugger','listener','endpoint','redirect',
    'intercept','handshake','injection','decryption','algorithm',
    'penetrate','enumerate','checksum','localhost','signature','directory',
    'escalation','exfiltrate','shellcode','obfuscate','serialize',
    'polymorphic','steganography','subprocess','threading',
  ],
  xlarge: [
    'vulnerability','authentication','cryptography','initialization',
    'configuration','administration','exploitation','infrastructure',
    'identification','authorization','implementation','investigation',
    'deserialization','decompilation','reconnaissance','fragmentation',
    'bruteforce','spoofing','mitigation','persistence',
  ],
};

/* ── POINTS TABLE ───────────────────────────────────────────────────────── */
function calcPoints(word, phaseId) {
  const base = Math.ceil(word.length * (phaseId * 0.7 + 0.8));
  return base;
}

/* ── WORD TIER (for color) ──────────────────────────────────────────────── */
function wordTier(word) {
  if (word.length <= 5)  return 1;
  if (word.length <= 8)  return 2;
  if (word.length <= 12) return 3;
  return 4;
}
