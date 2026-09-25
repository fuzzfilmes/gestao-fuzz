// Catálogo base da Calculadora: áreas de atuação, serviços sugeridos e unidades.
// O usuário liga/desliga, ajusta preços e cria serviços próprios na configuração.
window.Catalogo = (function () {
  const AREAS = [
    { id: 'video',  nome: 'Vídeo',               desc: 'Captação, edição, roteiro, motion' },
    { id: 'foto',   nome: 'Fotografia',          desc: 'Eventos, ensaios, retratos, tratamento' },
    { id: 'design', nome: 'Design',              desc: 'Identidade, peças, social media' },
    { id: 'audio',  nome: 'Podcast e áudio',     desc: 'Gravação, edição, cortes' },
    { id: 'live',   nome: 'Transmissão ao vivo', desc: 'Lives, eventos online, streaming' }
  ];

  // cobranca: 'entrega' = multiplica pela quantidade de entregas do pacote
  //           'unico'   = entra uma vez só no orçamento (equipamento, deslocamento…)
  const SERVICOS = [
    { id: 'video_pre',       area: 'video',  nome: 'Roteiro e pré-produção', unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'video_captacao',  area: 'video',  nome: 'Captação',               unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'video_edicao',    area: 'video',  nome: 'Edição',                 unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'video_motion',    area: 'video',  nome: 'Motion / animação',      unidade: 'hora',    cobranca: 'entrega', ativo: false },
    { id: 'video_terc',      area: 'video',  nome: 'Edição terceirizada',    unidade: 'video',   cobranca: 'entrega', ativo: false, preco: 90 },

    { id: 'foto_cobertura',  area: 'foto',   nome: 'Cobertura fotográfica',  unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'foto_ensaio',     area: 'foto',   nome: 'Ensaio fotográfico',     unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'foto_retrato',    area: 'foto',   nome: 'Retrato individual',     unidade: 'pessoa',  cobranca: 'entrega', ativo: false, preco: 60 },
    { id: 'foto_tratamento', area: 'foto',   nome: 'Tratamento de fotos',    unidade: 'foto',    cobranca: 'entrega', ativo: true,  preco: 10 },

    { id: 'design_briefing', area: 'design', nome: 'Briefing e reuniões',    unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'design_criacao',  area: 'design', nome: 'Criação',                unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'design_ajustes',  area: 'design', nome: 'Rodada extra de ajustes',unidade: 'hora',    cobranca: 'entrega', ativo: true },

    { id: 'audio_gravacao',  area: 'audio',  nome: 'Gravação',               unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'audio_edicao',    area: 'audio',  nome: 'Edição do episódio',     unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'audio_cortes',    area: 'audio',  nome: 'Cortes para redes',      unidade: 'corte',   cobranca: 'entrega', ativo: false, preco: 40 },

    { id: 'live_operacao',   area: 'live',   nome: 'Operação da transmissão',unidade: 'hora',    cobranca: 'entrega', ativo: true },
    { id: 'live_kit',        area: 'live',   nome: 'Kit de transmissão',     unidade: 'diaria',  cobranca: 'unico',   ativo: true,  preco: 1200 },

    // equipamentos e custos — valem pra qualquer área
    { id: 'extra_drone',     area: 'extra',  nome: 'Drone',                  unidade: 'diaria',  cobranca: 'unico',   ativo: false, preco: 300 },
    { id: 'extra_equip',     area: 'extra',  nome: 'Aluguel de equipamento', unidade: 'diaria',  cobranca: 'unico',   ativo: false, preco: 0 },
    { id: 'extra_estudio',   area: 'extra',  nome: 'Estúdio',                unidade: 'hora',    cobranca: 'unico',   ativo: false, preco: 0, horaPropria: true },
    { id: 'extra_desloc',    area: 'extra',  nome: 'Deslocamento',           unidade: 'km',      cobranca: 'unico',   ativo: true,  preco: 1.5 }
  ];

  // singular, plural e sufixo curto
  const UNIDADES = {
    hora:    { s: 'hora',    p: 'horas',    curto: 'h' },
    foto:    { s: 'foto',    p: 'fotos',    curto: 'foto(s)' },
    pessoa:  { s: 'pessoa',  p: 'pessoas',  curto: 'pessoa(s)' },
    video:   { s: 'vídeo',   p: 'vídeos',   curto: 'vídeo(s)' },
    peca:    { s: 'peça',    p: 'peças',    curto: 'peça(s)' },
    corte:   { s: 'corte',   p: 'cortes',   curto: 'corte(s)' },
    km:      { s: 'km',      p: 'km',       curto: 'km' },
    diaria:  { s: 'diária',  p: 'diárias',  curto: 'diária(s)' },
    unidade: { s: 'unidade', p: 'unidades', curto: 'un.' }
  };

  const SUGESTOES_TRABALHO = {
    video:  ['Vídeo institucional', 'Vídeo para redes sociais', 'Cobertura de evento', 'Vídeo de casamento'],
    foto:   ['Cobertura fotográfica', 'Ensaio', 'Fotos corporativas', 'Fotos de produto'],
    design: ['Identidade visual', 'Social media', 'Peças gráficas', 'Apresentação'],
    audio:  ['Podcast', 'Cortes de podcast'],
    live:   ['Transmissão ao vivo']
  };

  function unidadeTexto(unidade, qtd) {
    const u = UNIDADES[unidade] || UNIDADES.unidade;
    return Math.abs(qtd) === 1 ? u.s : u.p;
  }

  // configuração nova, a partir das áreas escolhidas
  function configPadrao() {
    return {
      versao: 1,
      areas: [],
      valorHora: 80,
      calcHora: { renda: 5000, custos: 800, horasSemana: 25 },
      servicos: SERVICOS.map((s) => ({
        id: s.id, area: s.area, nome: s.nome, unidade: s.unidade, cobranca: s.cobranca, ativo: s.ativo,
        preco: s.preco != null ? s.preco : null,          // null = usa a hora base
        usaHoraBase: s.unidade === 'hora' && s.preco == null && !s.horaPropria,
        custom: false
      })),
      imposto: { pct: 6, modo: 'informativo' },
      desconto: { ativo: false, pct: 10 },
      validade: 15,
      negocio: { nome: '', contato: '', logo: '' }
    };
  }

  // completa configs antigas com serviços novos do catálogo (pra atualizações futuras)
  function completar(cfg) {
    const base = configPadrao();
    const c = Object.assign({}, base, cfg || {});
    c.imposto = Object.assign({}, base.imposto, (cfg || {}).imposto);
    c.desconto = Object.assign({}, base.desconto, (cfg || {}).desconto);
    c.negocio = Object.assign({}, base.negocio, (cfg || {}).negocio);
    c.calcHora = Object.assign({}, base.calcHora, (cfg || {}).calcHora);
    const ids = new Set((c.servicos || []).map((s) => s.id));
    c.servicos = (c.servicos || []).concat(base.servicos.filter((s) => !ids.has(s.id)));
    return c;
  }

  function precoDe(servico, cfg) {
    if (servico.usaHoraBase) return Number(cfg.valorHora) || 0;
    return Number(servico.preco) || 0;
  }

  // serviços que aparecem na calculadora
  function servicosVisiveis(cfg) {
    return cfg.servicos.filter((s) => s.ativo && (s.custom || s.area === 'extra' || cfg.areas.includes(s.area)));
  }

  function nomeArea(id) {
    if (id === 'extra') return 'Equipamentos e custos';
    if (id === 'custom') return 'Meus serviços';
    const a = AREAS.find((x) => x.id === id);
    return a ? a.nome : id;
  }

  return { AREAS, SERVICOS, UNIDADES, SUGESTOES_TRABALHO, unidadeTexto, configPadrao, completar, precoDe, servicosVisiveis, nomeArea };
})();
