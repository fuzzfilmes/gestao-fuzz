// Testa as funções com um "Supabase de mentira" em memória. Rode: npm test
const assert = require('assert');
process.env.HOTMART_HOTTOK = 'tok-secreto';
process.env.PRODUTOS_HOTMART = JSON.stringify({ '111': ['calculadora'], '222': ['calculadora', 'propostas'] });
process.env.SUPABASE_URL = 'http://fake'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake';
process.env.URL = 'https://ferramentas.exemplo.com';

function fakeSb() {
  const db = { acessos: [], eventos_hotmart: [], usuarios: new Set(), emails: [] };
  const q = (tabela) => {
    const st = { filtros: [], patch: null };
    const api = {
      insert: async (row) => { db[tabela].push(row); return { error: null }; },
      upsert: async (rows) => {
        for (const r of rows) {
          const i = db.acessos.findIndex((a) => a.transacao === r.transacao && a.produto === r.produto);
          if (i >= 0) db.acessos[i] = { ...db.acessos[i], ...r }; else db.acessos.push({ ...r });
        }
        return { error: null };
      },
      update: (patch) => { st.patch = patch; return api; },
      select: () => api,
      eq: (c, v) => { st.filtros.push([c, v]); return st.patch ? api.run() : api; },
      limit: async () => ({ data: db[tabela].filter((r) => st.filtros.every(([c, v]) => r[c] === v)), error: null }),
      run: async () => { db[tabela].filter((r) => st.filtros.every(([c, v]) => r[c] === v)).forEach((r) => Object.assign(r, st.patch)); return { error: null }; }
    };
    return api;
  };
  return {
    db,
    from: q,
    auth: {
      admin: { inviteUserByEmail: async (email, o) => {
        if (db.usuarios.has(email)) return { error: { message: 'A user with this email address has already been registered' } };
        db.usuarios.add(email); db.emails.push(['convite', email, o.redirectTo]); return { error: null };
      } },
      resetPasswordForEmail: async (email, o) => { db.emails.push(['reset', email, o.redirectTo]); return { error: null }; }
    }
  };
}

const wh = require('../netlify/functions/hotmart-webhook');
const pa = require('../netlify/functions/primeiro-acesso');
const compra = (evento, prod, trans, email = 'Fulano@Email.com') =>
  ({ event: evento, data: { buyer: { email, name: 'Fulano' }, product: { id: prod }, purchase: { transaction: trans } } });

(async () => {
  const sb = fakeSb();

  // 1. compra aprovada → acesso + convite
  let r = await wh.processar(compra('PURCHASE_APPROVED', 111, 'HP1'), sb);
  assert.deepStrictEqual(r.liberado, ['calculadora']);
  assert.strictEqual(sb.db.acessos[0].email, 'fulano@email.com', 'e-mail minúsculo');
  assert.strictEqual(sb.db.emails[0][0], 'convite');
  assert.strictEqual(sb.db.emails[0][2], 'https://ferramentas.exemplo.com/definir-senha.html');

  // 2. reenvio do mesmo aviso (Hotmart repete) → não duplica
  await wh.processar(compra('PURCHASE_APPROVED', 111, 'HP1'), sb);
  assert.strictEqual(sb.db.acessos.length, 1);

  // 3. mesma pessoa compra o combo → 2 linhas novas, sem novo convite
  r = await wh.processar(compra('PURCHASE_APPROVED', 222, 'HP2'), sb);
  assert.strictEqual(r.conta, 'conta-existente');
  assert.strictEqual(sb.db.acessos.length, 3);
  assert.strictEqual(sb.db.emails.length, 1);

  // 4. reembolso da 1ª compra → só ela é revogada; calculadora continua ativa pelo combo
  await wh.processar(compra('PURCHASE_REFUNDED', 111, 'HP1'), sb);
  const ativos = sb.db.acessos.filter((a) => a.status === 'ativo').map((a) => a.transacao + ':' + a.produto).sort();
  assert.deepStrictEqual(ativos, ['HP2:calculadora', 'HP2:propostas']);

  // 5. produto não mapeado / evento desconhecido → ignora com 200
  r = await wh.processar(compra('PURCHASE_APPROVED', 999, 'HP3'), sb);
  assert.strictEqual(r.ignorado, 'dados');
  r = await wh.processar(compra('SUBSCRIPTION_CANCELLATION', 111, 'HP4'), sb);
  assert.strictEqual(r.ignorado, 'evento');

  // 6. handler: token errado → 401; certo → 200 (com Supabase falso não chega a conectar: testamos só o 401)
  const h = await wh.handler({ httpMethod: 'POST', headers: { 'X-HOTMART-HOTTOK': 'errado' }, body: JSON.stringify(compra('PURCHASE_APPROVED', 111, 'X')) });
  assert.strictEqual(h.statusCode, 401);
  const h2 = await wh.handler({ httpMethod: 'GET', headers: {}, body: '' });
  assert.strictEqual(h2.statusCode, 405);

  // 7. primeiro acesso: quem comprou recebe link; quem não comprou não (mas a resposta é igual)
  const antes = sb.db.emails.length;
  let p = await pa.processar('fulano@email.com', sb);
  assert.strictEqual(p.enviado, true);
  assert.strictEqual(sb.db.emails[antes][0], 'reset');
  p = await pa.processar('nuncacomprou@email.com', sb);
  assert.strictEqual(p.enviado, false);

  // 8. cortesia manual (sem conta ainda) → primeiro acesso manda convite
  sb.db.acessos.push({ transacao: 'CORTESIA-1', produto: 'calculadora', email: 'amigo@email.com', status: 'ativo' });
  p = await pa.processar('amigo@email.com', sb);
  assert.strictEqual(p.resultado, 'convite-enviado');

  console.log('✓ todos os testes passaram (' + sb.db.eventos_hotmart.length + ' avisos registrados)');
})().catch((e) => { console.error('✗', e); process.exit(1); });
