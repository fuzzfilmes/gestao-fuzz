# Como configurar sua própria instância do Painel de Gestão

Este guia é pra você (a pessoa testando a ferramenta) configurar sua
própria cópia — com seu próprio banco de dados, separado do da Fuzz.
Ao final, você cria sua conta de login com seu próprio email e senha,
direto no painel — ninguém mais precisa criar isso pra você.

Não precisa saber programar, só seguir os passos em ordem. Se travar
em algum, chama quem te passou esse guia.

## 1. Criar uma conta e um projeto no Supabase

O Supabase é o serviço que guarda seus dados (clientes, demandas,
financeiro etc.) — como se fosse o "banco de dados" do painel, só seu.

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (dá pra usar login do Google).
2. Clique em **New project**.
3. Escolha um nome (ex: o nome da sua empresa), uma senha de banco (guarde num lugar seguro — raramente vai precisar dela) e a região mais próxima de você.
4. Espere uns 2 minutos até o projeto ficar pronto.

## 2. Criar as tabelas (rodar o script de configuração)

1. No menu à esquerda do projeto, clique em **SQL Editor** → **New query**.
2. Abra o arquivo `supabase_bootstrap.sql` que você recebeu junto com este guia.
3. Copie todo o conteúdo dele e cole na tela do SQL Editor.
4. Clique em **Run**. Deve terminar sem erro — isso cria toda a estrutura de dados que o painel precisa.

## 3. Pegar as chaves de conexão

1. No menu à esquerda, vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie os valores de **Project URL** e da chave **anon public** — vai precisar deles no próximo passo.

## 4. Configurar e publicar o painel

Essa parte depende de como você recebeu o código:

- **Se você recebeu um link já publicado:** peça pra quem te passou o link configurar as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (do passo 3) no serviço onde o site está publicado — normalmente é rápido, é só colar os dois valores.
- **Se você recebeu o código-fonte:** copie o arquivo `.env.example` pra um novo arquivo chamado `.env` na mesma pasta, e cole ali a URL e a chave do passo 3. Depois é só publicar (por exemplo no [Netlify](https://netlify.com), gratuito pra esse tipo de site).

## 5. Criar sua conta

1. Acesse o site publicado.
2. Clique em **"Não tem conta? Criar conta"**, na tela de login.
3. Preencha seu email e uma senha (mínimo 6 caracteres).
4. Se o Supabase pedir confirmação por email, verifique sua caixa de entrada e clique no link — depois disso já pode entrar normalmente.

Pronto — seus dados a partir daqui ficam só na sua conta, isolados de qualquer outra pessoa que use o mesmo painel (inclusive da Fuzz).

## 6. Primeiros passos dentro do painel

O painel vem com nomes e categorias usados pela Fuzz (produção de vídeo). Depois de entrar:

1. Vá em **Configurações** e ajuste **Tipos de produção**, **Categorias de despesa** e **Status de demandas** pra refletir o seu negócio.
2. Cadastre 1–2 clientes de teste.
3. Crie uma demanda de teste pra ver o fluxo de status.
4. Se quiser testar o Financeiro, configure **Configurações → Saúde financeira** (% de imposto, reserva, INSS e o pró-labore do mês).

---

**Sobre segurança:** o arquivo `.env` nunca deve ser compartilhado publicamente nem subido pro GitHub. A chave "anon public" do Supabase é segura de expor no site (é feita pra isso) — quem protege seus dados de verdade é a Row Level Security (RLS), que o `supabase_bootstrap.sql` já configura em cada tabela: cada conta só enxerga os próprios dados, mesmo dividindo a mesma estrutura de banco com outras contas.
