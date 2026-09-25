// Funções compartilhadas pelas funções serverless (webhook e primeiro acesso).
const { createClient } = require('@supabase/supabase-js');

function clienteAdmin() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas no Netlify');
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

function urlDoSite() {
  // URL é preenchida automaticamente pelo Netlify; SITE_URL permite forçar o domínio próprio
  return (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
}

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Garante que a pessoa tenha conta e receba um e-mail pra criar/redefinir a senha.
// - não tem conta  → convite ("crie sua senha")
// - já tem conta   → só manda link de redefinição se `reenviar` for true
async function garantirConta(sb, email, { nome, reenviar = false } = {}) {
  const redirectTo = urlDoSite() + '/definir-senha.html';
  const { error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo, data: { nome: nome || '' } });
  if (!error) return 'convite-enviado';

  const jaExiste = /already|registered|exists/i.test(error.message || '');
  if (!jaExiste) throw error;
  if (!reenviar) return 'conta-existente';

  const { error: e2 } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (e2) throw e2;
  return 'link-redefinicao-enviado';
}

module.exports = { clienteAdmin, urlDoSite, normalizarEmail, garantirConta };
