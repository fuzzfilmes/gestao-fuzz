# Ferramentas — como colocar no ar

Site com login para quem comprou na Hotmart. Hoje tem a **Calculadora de Orçamento**; o Gerador de Propostas entra no mesmo site depois.

```
Comprou na Hotmart ──► Hotmart avisa o site (webhook)
                         │
                         ├─ grava o acesso no banco (Supabase)
                         └─ envia e-mail "Crie sua senha"
                                   │
Cliente clica no link ──► cria a senha ──► Minhas ferramentas ──► Calculadora
                                                                   (1ª vez: configuração em 5 etapas)
Reembolso/chargeback ──► Hotmart avisa ──► acesso revogado automaticamente
```

## O que tem na pasta

| Arquivo | O que é |
|---|---|
| `public/index.html` | Login + "Minhas ferramentas" |
| `public/definir-senha.html` | Onde o cliente cria a senha (link do e-mail) |
| `public/calculadora/configurar.html` | Configuração inicial em 5 etapas |
| `public/calculadora/index.html` | A calculadora |
| `public/calculadora/catalogo.js` | Áreas e serviços sugeridos — edite aqui pra mudar o catálogo |
| `public/assets/config.js` | **Você preenche**: chaves públicas do Supabase, links de compra, e-mail de suporte |
| `netlify/functions/hotmart-webhook.js` | Recebe os avisos da Hotmart |
| `netlify/functions/primeiro-acesso.js` | Botão "Primeiro acesso ou esqueci a senha" |
| `supabase/schema.sql` | Estrutura do banco |
| `testes/webhook.test.js` | Testes do webhook (`npm test`) |

**Modo demonstração:** enquanto `config.js` estiver com `COLE_AQUI`, o site funciona sem login e salva tudo no navegador. Serve pra testar agora, e depois — com `?demo` no final do link — pra deixar um "teste grátis" na landing page.

---

## 1. Supabase (banco + login) — ~10 min

Use um **projeto novo**, separado do Painel de Gestão da Fuzz.

1. [supabase.com](https://supabase.com) → **New project** (região São Paulo).
2. **SQL Editor → New query** → cole todo o `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**:
   - deixe Email ligado;
   - **desligue "Allow new users to sign up"** — só quem compra ganha conta (o convite continua funcionando);
   - deixe "Confirm email" ligado.
4. **Authentication → URL Configuration**:
   - Site URL: `https://ferramentas.fuzzfilmes.com` (o endereço do passo 2);
   - Redirect URLs: adicione `https://ferramentas.fuzzfilmes.com/definir-senha.html`.
5. **Authentication → Emails (SMTP)**: configure um SMTP próprio (ex: [Resend](https://resend.com), gratuito até 3.000 e-mails/mês). ⚠️ O e-mail padrão do Supabase só envia poucas mensagens por hora — serve pra teste, **não pra vender**.
6. **Authentication → Emails → Templates** — troque pra português:
   - **Invite user** — assunto: `Seu acesso às ferramentas está liberado`
     ```html
     <h2>Compra confirmada! 🎬</h2>
     <p>Clique no botão abaixo para criar sua senha e começar a usar:</p>
     <p><a href="{{ .ConfirmationURL }}">Criar minha senha</a></p>
     <p>Depois é só entrar com este e-mail e a senha que você criou.</p>
     ```
   - **Reset password** — assunto: `Crie ou redefina sua senha`
     ```html
     <p>Recebemos um pedido para criar/redefinir sua senha.</p>
     <p><a href="{{ .ConfirmationURL }}">Definir senha</a></p>
     <p>Se não foi você, ignore este e-mail.</p>
     ```
7. **Project Settings → API**: anote `Project URL`, a chave `anon public` e a chave `service_role` (secreta).

## 2. Mandar o código pro GitHub

No Terminal:

```bash
cd ~/Documents/gestao-fuzz
git add produtos/apps
git commit -m "Adiciona site de ferramentas (login + calculadora)"
git push
```

O Painel de Gestão não muda nada — ele só vai fazer um deploy igual ao atual.

## 3. Criar o site no Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new project** (ou *Add new site*) → **Import an existing project**.
2. Escolha **GitHub** → autorize, se pedir → selecione o repositório **fuzzfilmes/gestao-fuzz**.
3. Na tela de configuração do build:

   | Campo | Preencha |
   |---|---|
   | Branch to deploy | `main` (a mesma do painel) |
   | **Base directory** | `produtos/apps` ← o mais importante |
   | Build command | deixe **vazio** |
   | Publish directory | `produtos/apps/public` (o Netlify costuma preencher sozinho a partir do `netlify.toml`) |
   | Functions directory | `produtos/apps/netlify/functions` (idem) |

4. **Ainda não clique em Deploy** se aparecer a seção *Environment variables* nessa tela — já adicione as 5 variáveis abaixo por ali. Se não aparecer, faça o deploy e adicione depois em **Project configuration → Environment variables → Add a variable** (uma de cada vez, escopo "All", mesmo valor pra todos os contextos):

   | Key | Value | Onde pegar |
   |---|---|---|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Project Settings → API → Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ…` (bem longa) | Supabase → Project Settings → API → `service_role` (clique em *Reveal*). **Secreta.** Marque "Contains secret values" |
   | `HOTMART_HOTTOK` | o token da Hotmart | passo 5 (pode deixar pra depois) |
   | `PRODUTOS_HOTMART` | `{"ID":["calculadora"]}` | passo 5 (pode deixar pra depois) |
   | `SITE_URL` | `https://ferramentas.fuzzfilmes.com` | o endereço final do site (passo 3.6) |

5. **Deploy**. Em 1–2 minutos aparece um endereço tipo `https://nome-aleatorio.netlify.app`. Abra: deve aparecer a tela de login com a faixa amarela "MODO DEMONSTRAÇÃO" — normal, ainda falta o passo 4.
6. **Domínio próprio** (recomendado): **Domain management → Add a domain** → `ferramentas.fuzzfilmes.com`. O Netlify mostra um registro **CNAME** pra você criar onde o domínio fuzzfilmes.com é gerenciado (Registro.br, Cloudflare, Hostinger…). O HTTPS ativa sozinho em alguns minutos depois que o DNS propagar.
7. **Renomear** (opcional): Project configuration → Change project name → ex. `ferramentas-fuzz`.

> Sempre que mudar uma variável de ambiente, faça **Deploys → Trigger deploy → Deploy project** pra ela valer.

## 4. Preencher as chaves públicas no site

Abra `produtos/apps/public/assets/config.js` e troque:

```js
SUPABASE_URL: 'https://xxxx.supabase.co',          // Project URL
SUPABASE_ANON_KEY: 'eyJ…',                         // chave "anon public" (NÃO a service_role)
MARCA: 'Nome da linha de produtos',
SUPORTE: 'suporte@fuzzfilmes.com',
SITE_VENDA: 'https://SUA-LANDING-PAGE',            // aparece na marca-d'água do teste grátis
LINKS_COMPRA: { calculadora: 'https://pay.hotmart.com/…', propostas: '…' }
```

Depois `git add`, `git commit`, `git push` — o Netlify publica sozinho. A faixa amarela some e o login passa a ser de verdade.

**Teste grátis na landing page:** use o link `https://ferramentas.fuzzfilmes.com/?demo`. Nesse modo tudo funciona, mas os dados ficam só no navegador da pessoa e os PDF/PNG saem com a faixa "VERSÃO DE DEMONSTRAÇÃO".

## 5. Cadastrar o webhook na Hotmart

1. **Pegue o ID de cada produto**: Hotmart → **Produtos** → abra o produto → o número aparece na página/URL do produto (ex: `4567890`).
2. **Abra a tela de webhook**: menu **Ferramentas** → **Webhook** (às vezes aparece como "Webhook (API e notificações)").
3. **Copie o Hottok** que aparece nessa tela (token de verificação) → no Netlify, variável `HOTMART_HOTTOK`.
4. **Cadastrar/Adicionar webhook**:
   - **Nome:** `Liberação de acesso — ferramentas`
   - **URL:** `https://ferramentas.fuzzfilmes.com/api/hotmart-webhook`
   - **Produtos:** selecione a Calculadora e todos os combos/pacotes que incluem ela (ou "todos os produtos")
   - **Versão:** `2.0.0`
   - **Eventos:** marque **Compra aprovada**, **Compra completa**, **Compra reembolsada**, **Chargeback**, **Compra cancelada** e **Protesto**
   - Salve.
5. **Monte o `PRODUTOS_HOTMART`** no Netlify, numa linha só, dizendo o que cada ID libera:
   ```json
   {"4567890":["calculadora"],"4567891":["propostas"],"4567892":["calculadora","propostas"]}
   ```
   → **Trigger deploy** no Netlify.
6. **Teste**: na lista de webhooks da Hotmart, use a opção de **enviar teste** do seu webhook. Depois confira no Supabase → **Table Editor → eventos_hotmart**: deve aparecer uma linha. A coluna `resultado` diz o que aconteceu (o teste da Hotmart costuma vir com produto fictício, então `ignorado: … produto não mapeado` é um resultado **bom** — prova que a conexão e o Hottok estão certos).
   - Se não aparecer nada: Netlify → **Logs → Functions → hotmart-webhook**. `401` = Hottok errado; `500` = chave do Supabase errada.
7. **Teste de verdade**: crie um cupom de 100% (ou use um produto de R$ 1 em rascunho) e compre com um e-mail seu. Deve chegar o e-mail "Crie sua senha" → criar senha → cair em "Minhas ferramentas" com a Calculadora liberada. Depois reembolse e veja o acesso sumir.

> Os nomes dos menus da Hotmart e do Netlify mudam de vez em quando. Se algo não bater, me mande um print que eu ajusto o passo.

---

## Dia a dia

- **Cliente não recebeu o e-mail:** peça pra clicar em *"Primeiro acesso ou esqueci a senha"* na tela de login (confere spam também).
- **Comprou com outro e-mail:** Supabase → Table Editor → `acessos` → edite o campo `email` da compra dele.
- **Liberar cortesia:** rode no SQL Editor:
  ```sql
  insert into acessos (transacao, produto, email, origem)
  values ('CORTESIA-001', 'calculadora', 'fulano@email.com', 'manual');
  ```
  e a pessoa usa *"Primeiro acesso"* pra criar a senha.
- **Ver o que a Hotmart mandou:** tabela `eventos_hotmart` (coluna `resultado`).
- **Custo:** o plano gratuito do Supabase aguenta tranquilamente os primeiros milhares de clientes. Atenção: projetos gratuitos **pausam após 7 dias sem nenhum acesso** — com vendas rolando isso não acontece, mas vale ficar de olho no começo.
