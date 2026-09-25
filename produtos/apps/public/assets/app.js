// Núcleo compartilhado: login, verificação de acesso e configurações na nuvem.
// Cada página define window.RAIZ ('./' na raiz, '../' dentro de uma pasta) antes de carregar este arquivo.
(function () {
  const C = window.FERRAMENTAS_CONFIG || {};
  const RAIZ = window.RAIZ || './';

  const configurado = !!C.SUPABASE_URL && !/COLE_AQUI/.test(C.SUPABASE_URL);
  let pedidoDemo = false;
  try {
    if (new URLSearchParams(location.search).has('demo')) sessionStorage.setItem('modo_demo', '1');
    pedidoDemo = sessionStorage.getItem('modo_demo') === '1';
  } catch (e) { /* storage bloqueado */ }
  const DEMO = !configurado || pedidoDemo;

  let sb = null;
  if (!DEMO) {
    if (!window.supabase) throw new Error('Biblioteca do Supabase não carregou');
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  // ------------------------------------------------------------------
  // armazenamento local (só no modo demonstração)
  const local = {
    ler(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    apagar(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  function url(caminho) { return RAIZ + caminho; }

  function mensagemErro(e) {
    const m = (e && (e.message || e.error_description)) || String(e || '');
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (/password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/same password|different from the old/i.test(m)) return 'A nova senha precisa ser diferente da anterior.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    if (/failed to fetch|network/i.test(m)) return 'Sem conexão com o servidor. Confira sua internet.';
    return m || 'Algo deu errado. Tente novamente.';
  }

  const App = {
    demo: DEMO,
    config: C,
    url,
    mensagemErro,

    async sessao() {
      if (DEMO) return local.ler('demo_sessao');
      const { data } = await sb.auth.getSession();
      const s = data && data.session;
      return s ? { email: s.user.email, id: s.user.id, nome: (s.user.user_metadata || {}).nome || '' } : null;
    },

    async entrar(email, senha) {
      email = String(email || '').trim().toLowerCase();
      if (DEMO) {
        if (!email) throw new Error('Digite um e-mail.');
        const s = { email, id: 'demo', nome: '' };
        local.gravar('demo_sessao', s);
        return s;
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      return { email: data.user.email, id: data.user.id };
    },

    async sair() {
      if (DEMO) { local.apagar('demo_sessao'); return; }
      await sb.auth.signOut();
    },

    // pede o link de primeiro acesso / redefinição (função serverless)
    async pedirLinkDeSenha(email) {
      email = String(email || '').trim().toLowerCase();
      if (DEMO) return { ok: true, mensagem: 'Modo demonstração: nenhum e-mail é enviado. É só entrar com qualquer e-mail.' };
      const r = await fetch('/api/primeiro-acesso', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email })
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.mensagem || 'Não conseguimos enviar agora.');
      return corpo;
    },

    // usado na página definir-senha (a sessão vem do link do e-mail)
    async aguardarSessaoDoLink(ms = 4000) {
      if (DEMO) return local.ler('demo_sessao') || { email: 'demo@exemplo.com' };
      const inicio = Date.now();
      while (Date.now() - inicio < ms) {
        const s = await App.sessao();
        if (s) return s;
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    },

    async definirSenha(senha) {
      if (DEMO) return;
      const { error } = await sb.auth.updateUser({ password: senha });
      if (error) throw error;
    },

    async produtosLiberados() {
      if (DEMO) return ['calculadora', 'propostas'];
      const { data, error } = await sb.from('acessos').select('produto').eq('status', 'ativo');
      if (error) throw error;
      return [...new Set((data || []).map((l) => l.produto))];
    },

    async lerConfig(app) {
      if (DEMO) return local.ler('demo_cfg_' + app);
      const { data, error } = await sb.from('configuracoes').select('dados').eq('app', app).maybeSingle();
      if (error) throw error;
      return data ? data.dados : null;
    },

    async salvarConfig(app, dados) {
      if (DEMO) {
        if (!local.gravar('demo_cfg_' + app, dados)) throw new Error('O navegador não deixou salvar (talvez a logo esteja grande demais).');
        return;
      }
      const s = await App.sessao();
      const { error } = await sb.from('configuracoes').upsert(
        { user_id: s.id, app, dados, atualizado_em: new Date().toISOString() },
        { onConflict: 'user_id,app' }
      );
      if (error) throw error;
    },

    // Porteiro das páginas de ferramenta: exige login + compra ativa.
    // Devolve a sessão, ou redireciona / mostra a tela de bloqueio.
    async exigirAcesso(produto) {
      const s = await App.sessao();
      if (!s) {
        location.replace(url('index.html') + '?volta=' + encodeURIComponent(location.pathname + location.search));
        return new Promise(() => { });
      }
      let liberados = [];
      try { liberados = await App.produtosLiberados(); }
      catch (e) { App.telaBloqueio('Não conseguimos verificar seu acesso', mensagemErro(e), null); return new Promise(() => { }); }
      if (!liberados.includes(produto)) {
        App.telaBloqueio(
          'Sua conta ainda não tem esta ferramenta',
          'Você entrou como ' + s.email + '. Se já comprou, confira se usou este mesmo e-mail na compra — ou fale com o suporte: ' + (C.SUPORTE || ''),
          (C.LINKS_COMPRA || {})[produto]
        );
        return new Promise(() => { });
      }
      return s;
    },

    telaBloqueio(titulo, texto, linkCompra) {
      document.body.innerHTML =
        '<div class="centro"><div class="cartao visor"><span class="br-tr"></span><span class="br-bl"></span>' +
        '<div class="eyebrow">Acesso</div><h1></h1><p class="sub"></p>' +
        (linkCompra && !/COLE_AQUI/.test(linkCompra) ? '<a class="btn" id="bl-comprar">Quero esta ferramenta</a>' : '') +
        '<a class="btn sec" href="' + url('index.html') + '">Voltar para minhas ferramentas</a>' +
        '</div></div>';
      document.querySelector('h1').textContent = titulo;
      document.querySelector('p.sub').textContent = texto;
      const b = document.getElementById('bl-comprar');
      if (b) b.href = linkCompra;
    },

    faixaDemo() {
      if (!DEMO) return;
      const d = document.createElement('div');
      d.className = 'demo-banner';
      d.textContent = configurado
        ? 'MODO DEMONSTRAÇÃO — seus dados ficam só neste navegador'
        : 'MODO DEMONSTRAÇÃO — Supabase ainda não configurado (assets/config.js). Dados salvos só neste navegador.';
      document.body.prepend(d);
    },

    // reduz uma imagem pra no máx. `largura` px e devolve dataURL PNG
    reduzirImagem(file, largura = 480) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Não consegui ler essa imagem. Tente um PNG ou JPG.'));
          img.onload = () => {
            const escala = Math.min(1, largura / img.width);
            const cv = document.createElement('canvas');
            cv.width = Math.round(img.width * escala);
            cv.height = Math.round(img.height * escala);
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            resolve(cv.toDataURL('image/png'));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    },

    escapar(t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
  };

  window.App = App;
})();
