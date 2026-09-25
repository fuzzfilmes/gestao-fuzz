// "Primeiro acesso / esqueci minha senha"
// Se o e-mail tiver alguma compra ativa, manda o link pra criar (ou redefinir) a senha.
// A resposta é sempre a mesma, pra não revelar quem comprou ou não.

const { clienteAdmin, normalizarEmail, garantirConta } = require('../lib/conta');

const RESPOSTA_PADRAO = {
  ok: true,
  mensagem: 'Se esse e-mail tiver uma compra ativa, você vai receber em instantes um link para criar sua senha. Confira também o spam.'
};

function resposta(status, corpo) {
  return { statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) };
}

async function processar(email, sb) {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ...RESPOSTA_PADRAO, enviado: false };

  const { data, error } = await sb.from('acessos')
    .select('produto, nome')
    .eq('email', email)
    .eq('status', 'ativo')
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return { ...RESPOSTA_PADRAO, enviado: false };

  const resultado = await garantirConta(sb, email, { nome: data[0].nome, reenviar: true });
  return { ...RESPOSTA_PADRAO, enviado: true, resultado };
}

exports.processar = processar;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resposta(405, { erro: 'use POST' });
  let corpo = {};
  try { corpo = JSON.parse(event.body || '{}'); } catch (e) { /* segue com vazio */ }

  try {
    await processar(normalizarEmail(corpo.email), clienteAdmin());
    // não devolve "enviado"/"resultado" pro navegador
    return resposta(200, RESPOSTA_PADRAO);
  } catch (e) {
    console.error('[primeiro-acesso]', e);
    return resposta(500, { ok: false, mensagem: 'Não conseguimos enviar agora. Tente de novo em alguns minutos.' });
  }
};
