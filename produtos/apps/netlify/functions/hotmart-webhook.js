// Recebe os avisos de compra da Hotmart (Webhook 2.0) e libera/revoga o acesso.
//
// Variáveis de ambiente (Netlify → Site configuration → Environment variables):
//   HOTMART_HOTTOK             token "Hottok" que aparece na tela de Webhook da Hotmart
//   PRODUTOS_HOTMART           mapa ID do produto Hotmart → ferramentas liberadas, em JSON:
//                              {"1234567":["calculadora"],"7654321":["calculadora","propostas"]}
//   SUPABASE_URL               URL do projeto Supabase
//   SUPABASE_SERVICE_ROLE_KEY  chave "service_role" (secreta! nunca vai pro navegador)
//   SITE_URL                   (opcional) domínio final, ex: https://ferramentas.seudominio.com.br

const crypto = require('crypto');
const { clienteAdmin, normalizarEmail, garantirConta } = require('../lib/conta');

const LIBERAR = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
const REVOGAR = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'PURCHASE_PROTEST'];

function mesmoToken(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

function ferramentasDoProduto(produtoId) {
  let mapa = {};
  try { mapa = JSON.parse(process.env.PRODUTOS_HOTMART || '{}'); }
  catch (e) { throw new Error('PRODUTOS_HOTMART não é um JSON válido'); }
  const lista = mapa[String(produtoId)];
  return Array.isArray(lista) ? lista : [];
}

function resposta(status, corpo) {
  return { statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) };
}

// Lógica separada do handler pra poder ser testada sem a Hotmart
async function processar(corpo, sb) {
  const evento = corpo.event || '';
  const d = corpo.data || {};
  const email = normalizarEmail(d.buyer && d.buyer.email);
  const nome = (d.buyer && d.buyer.name) || '';
  const produtoId = d.product && d.product.id;
  const transacao = (d.purchase && d.purchase.transaction) || '';

  const registrar = (resultado) => sb.from('eventos_hotmart').insert({
    evento, transacao, email, produto_id: produtoId != null ? String(produtoId) : null, resultado, payload: corpo
  });

  const ferramentas = ferramentasDoProduto(produtoId);

  if (!LIBERAR.includes(evento) && !REVOGAR.includes(evento)) {
    await registrar('ignorado: evento não tratado');
    return { ok: true, ignorado: 'evento' };
  }
  if (!email || !transacao || ferramentas.length === 0) {
    await registrar('ignorado: faltou e-mail, transação ou produto não mapeado');
    return { ok: true, ignorado: 'dados' };
  }

  if (LIBERAR.includes(evento)) {
    const agora = new Date().toISOString();
    const linhas = ferramentas.map((produto) => ({
      transacao, produto, email, nome, status: 'ativo', origem: 'hotmart', atualizado_em: agora
    }));
    const { error } = await sb.from('acessos').upsert(linhas, { onConflict: 'transacao,produto' });
    if (error) throw error;

    const conta = await garantirConta(sb, email, { nome });
    await registrar('liberado: ' + ferramentas.join(',') + ' / ' + conta);
    return { ok: true, liberado: ferramentas, conta };
  }

  // revogar: só as linhas desta transação
  const { error } = await sb.from('acessos')
    .update({ status: 'revogado', atualizado_em: new Date().toISOString() })
    .eq('transacao', transacao);
  if (error) throw error;
  await registrar('revogado: ' + ferramentas.join(','));
  return { ok: true, revogado: ferramentas };
}

exports.processar = processar;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resposta(405, { erro: 'use POST' });

  let corpo;
  try { corpo = JSON.parse(event.body || '{}'); }
  catch (e) { return resposta(400, { erro: 'JSON inválido' }); }

  const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const token = headers['x-hotmart-hottok'] || corpo.hottok;
  if (!mesmoToken(token, process.env.HOTMART_HOTTOK)) return resposta(401, { erro: 'hottok inválido' });

  try {
    const r = await processar(corpo, clienteAdmin());
    return resposta(200, r);
  } catch (e) {
    console.error('[hotmart-webhook]', e);
    // 500 faz a Hotmart tentar de novo mais tarde
    return resposta(500, { erro: 'falha ao processar', detalhe: String(e.message || e) });
  }
};
