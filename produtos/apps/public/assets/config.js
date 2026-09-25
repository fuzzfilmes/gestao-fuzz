// =====================================================================
// CONFIGURAÇÃO DO SITE — preencha depois de criar o projeto no Supabase
// (Supabase → Project Settings → API). Estas duas chaves são PÚBLICAS,
// podem ficar aqui. A chave "service_role" NUNCA entra neste arquivo.
//
// Enquanto SUPABASE_URL estiver com "COLE_AQUI", o site roda em
// MODO DEMONSTRAÇÃO: sem login, dados salvos só no navegador.
// =====================================================================
window.FERRAMENTAS_CONFIG = {
  SUPABASE_URL: 'https://ekvzilcgbnyukosurcrg.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_K6HlbbhjIu-ip5FJ0_Zl2A_bCM_Yux7',

  MARCA: 'Fuzz Ferramentas',                      // nome da linha de produtos (troque quando definir)
  SUPORTE: 'suporte@SEU-DOMINIO.com.br',       // e-mail de suporte exibido nas telas

  // link de compra (checkout Hotmart) de cada ferramenta — aparece pra quem não tem acesso
  LINKS_COMPRA: {
    calculadora: 'https://pay.hotmart.com/COLE_AQUI',
    propostas:   'https://pay.hotmart.com/COLE_AQUI'
  }
};
