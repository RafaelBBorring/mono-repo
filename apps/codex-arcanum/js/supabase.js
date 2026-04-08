// ============================================================
// supabase.js — Configuração do cliente Supabase
//
// ATENÇÃO: a SUPABASE_ANON_KEY abaixo precisa ser substituída
// pela chave correta do seu projeto.
//
// Como pegar a chave certa:
//   1. Acesse https://supabase.com e entre no seu projeto
//   2. No menu lateral, clique em "Project Settings" (engrenagem)
//   3. Clique em "API"
//   4. Copie o valor em "Project API keys" → "anon" "public"
//      A chave começa com "eyJ..." (é um JWT longo)
//
// A chave que estava aqui ("sb_publishable_...") é o formato
// errado — era uma chave de outro serviço e por isso o banco
// não conectava.
// ============================================================

const SUPABASE_URL  = 'https://frpyfaxvquxutwmyqhxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycHlmYXh2cXV4dXR3bXlxaHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTQ0NDYsImV4cCI6MjA5MTE3MDQ0Nn0.f1feqhJuRJuhzhL-ebxaw7hhK8-gmlDKYCeI-ArUAqY'; // substitua pela chave "eyJ..."

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSession() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  return session;
}

async function getUser() {
  const { data: { user } } = await window.supabaseClient.auth.getUser();
  return user;
}

// Aguarda o evento INITIAL_SESSION do Supabase v2, que garante que a sessão
// foi restaurada do localStorage antes de prosseguir. Isso evita o problema
// de getSession() retornar null no primeiro tick assíncrono da página.
function waitForSession() {
  return new Promise((resolve) => {
    const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          subscription.unsubscribe();
          resolve(session);
        } else if (event === 'SIGNED_OUT') {
          subscription.unsubscribe();
          resolve(null);
        }
      }
    );
  });
}

window.supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
  }
});
