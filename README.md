# Star Burguer — Site + Painel Administrativo

## Estrutura do projeto

```
star-burguer-project/
├── config.js          → único lugar com as credenciais (WhatsApp, Instagram, Supabase)
├── index.html          → site público (cardápio, carrinho, checkout)
├── styles.css
├── script.js
├── admin/
│   ├── index.html      → painel administrativo (login + edição de kits)
│   ├── admin.css
│   └── admin.js
└── supabase/
    └── schema.sql       → script para criar as tabelas no Supabase
```

## Passo 1 — Criar a conta e o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **New Project**. Escolha um nome (ex: `star-burguer`) e uma senha para o banco (guarde essa senha em outro lugar — não é a mesma senha do painel admin).
3. Aguarde cerca de 2 minutos enquanto o Supabase cria o projeto.

## Passo 2 — Rodar o script que cria as tabelas

1. No painel do Supabase, vá em **SQL Editor** (ícone no menu lateral).
2. Clique em **New query**.
3. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo e cole no editor.
4. Clique em **Run**. Isso cria as tabelas `kits` e `kit_opcoes`, configura a segurança (RLS) e já insere os 4 kits que estão no protótipo.

## Passo 3 — Criar o usuário administrador (o login do seu cliente)

1. No menu lateral, vá em **Authentication > Users**.
2. Clique em **Add user > Create new user**.
3. Preencha e-mail e senha (esse é o login que vai ser usado em `/admin`).
4. Marque a opção para já confirmar o e-mail automaticamente (**Auto Confirm User**), já que não vamos configurar envio de e-mail agora.

## Passo 4 — Pegar as credenciais e preencher o `config.js`

1. No menu lateral, vá em **Project Settings > API**.
2. Copie o **Project URL** e a chave **anon public**.
3. Abra o arquivo `config.js` na raiz do projeto e substitua:

```js
window.STAR_BURGUER_CONFIG = {
  WHATSAPP_NUMBER: "5599999999999",       // número real da loja
  INSTAGRAM_URL: "https://instagram.com/starburguer", // Instagram real
  SUPABASE_URL: "SUA_URL_DO_SUPABASE",     // cole o Project URL aqui
  SUPABASE_ANON_KEY: "SUA_CHAVE_ANON_DO_SUPABASE" // cole a chave anon aqui
};
```

Assim que esse arquivo for salvo com os valores reais, tanto o site público quanto o painel `/admin` passam a usar o Supabase automaticamente — antes disso, o site público continua funcionando com os dados de exemplo fixos (só para não quebrar enquanto você configura).

## Passo 5 — Testar localmente

1. Abra a pasta no VS Code.
2. Clique com o botão direito em `index.html` → **Open with Live Server** → confira o cardápio.
3. Acesse `/admin` (ex: `http://127.0.0.1:5500/admin/`) → faça login com o e-mail/senha criados no Passo 3 → confira se consegue editar um kit e ver a mudança refletir no site público (pode precisar recarregar a página do site).

## Passo 6 — Publicar no Vercel

1. Crie uma conta gratuita em [vercel.com](https://vercel.com).
2. Publique esta pasta como um novo projeto (Vercel detecta automaticamente que é um site estático — nenhuma configuração de build é necessária).
3. Pronto: o link público vai pra divulgação, e `seusite.vercel.app/admin` é o acesso do seu cliente.

## Como o site decide se usa o Supabase ou os dados fixos

O `script.js` verifica se `config.js` tem credenciais reais (ou seja, diferentes do texto `SUA_URL_DO_SUPABASE`). Se tiver, ele busca os kits no Supabase; se não tiver, usa a lista fixa (a mesma dos 4 kits do protótipo), só para não travar o desenvolvimento antes de configurar tudo.

## Segurança: como fica protegido

- **Leitura** dos kits é pública (qualquer um pode ver o cardápio) — é assim que o site público funciona sem login.
- **Escrita** (criar, editar, excluir) só é permitida para quem estiver autenticado — essa regra fica no próprio banco de dados (Row Level Security), então mesmo que alguém tentasse mexer diretamente sem passar pela tela de login, o Supabase recusaria a alteração.

## Dúvidas frequentes

**Preciso saber programar para editar produtos agora?**
Não. Depois de configurado, todo o cadastro de produtos é feito visualmente pelo painel `/admin` — nome, descrição, preço, itens inclusos, ativar/desativar. Não precisa mexer em nenhum arquivo de código para isso.

**O botão de pedido já funciona?**
Sim — ele monta a mensagem e abre o WhatsApp com o número configurado em `config.js`.

**Posso adicionar fotos reais dos produtos depois?**
Sim, mas isso não está incluso nesta versão (hoje o site usa um ícone ilustrativo de hambúrguer). Adicionar upload de fotos reais é um próximo passo natural, usando o Supabase Storage.
