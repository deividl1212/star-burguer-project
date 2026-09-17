# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout.spec.js >> Site de pedidos - Star Burguer >> adicionar ao carrinho atualiza o total
- Location: tests\checkout.spec.js:38:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#addToCartBtn')
    - locator resolved to <button id="addToCartBtn" class="btn-primary">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div id="toast" class="toast"></div> intercepts pointer events
  64 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div id="toast" class="toast"></div> intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - button "Voltar ao início" [ref=e4] [cursor=pointer]:
        - img "Star Burguer" [ref=e5]
        - generic [ref=e6]: STAR BURGUER
      - generic [ref=e7]:
        - button "Sobre nós" [ref=e8] [cursor=pointer]
        - button "Fale conosco" [ref=e12] [cursor=pointer]
        - button "Instagram" [ref=e16] [cursor=pointer]
      - button "Abrir carrinho" [ref=e20] [cursor=pointer]
    - generic [ref=e23]:
      - img "Star Burguer" [ref=e24]
      - heading "STAR BURGUER" [level=1] [ref=e25]: STARBURGUER
      - paragraph [ref=e26]: Hambúrgueres gourmet em kit, prontos para montar. Sabor de restaurante no conforto da sua casa.
    - main [ref=e28]:
      - heading "Nossos Kits" [level=2] [ref=e30]
      - generic [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]: 🔥 Oferta da semana
          - generic [ref=e38]:
            - heading "Kit Star Duplo" [level=3] [ref=e39]
            - generic [ref=e40]: 2 Carnes
            - generic [ref=e41]: R$ 34,99
            - button "Ver kit" [active] [ref=e43] [cursor=pointer]
        - generic [ref=e44]:
          - generic [ref=e45]: 🔥 Oferta da semana
          - generic [ref=e49]:
            - heading "Kit Econômico" [level=3] [ref=e50]
            - generic [ref=e51]: 6 Carnes · 10 Carnes
            - generic [ref=e52]: a partir de R$ 79,90
            - button "Ver kit" [ref=e54] [cursor=pointer]
        - generic [ref=e55]:
          - generic [ref=e56]: 🔥 Oferta da semana
          - generic [ref=e60]:
            - heading "Kit Clássico" [level=3] [ref=e61]
            - generic [ref=e62]: 6 Carnes · 10 Carnes
            - generic [ref=e63]: a partir de R$ 124,90
            - button "Ver kit" [ref=e65] [cursor=pointer]
        - generic [ref=e66]:
          - generic [ref=e67]: 🔥 Oferta da semana
          - generic [ref=e71]:
            - heading "Kit Premium" [level=3] [ref=e72]
            - generic [ref=e73]: 6 Carnes · 10 Carnes
            - generic [ref=e74]: a partir de R$ 144,90
            - button "Ver kit" [ref=e76] [cursor=pointer]
    - contentinfo [ref=e77]:
      - img "Star Burguer" [ref=e78]
      - text: Star Burguer · Peça pelo site, receba a confirmação no WhatsApp <
      - generic [ref=e79]:
        - generic [ref=e80]: ©
        - text: Desenvolvido por Deivid Lima
    - button "0 Ver pedido R$ 0,00" [ref=e81] [cursor=pointer]:
      - generic [ref=e82]:
        - generic [ref=e83]: "0"
        - generic [ref=e84]: Ver pedido
      - generic [ref=e85]: R$ 0,00
  - generic [ref=e87]:
    - button "✕" [ref=e88] [cursor=pointer]
    - generic [ref=e89]:
      - heading "Kit Star Duplo" [level=2] [ref=e92]
      - paragraph [ref=e93]: Mergulhe na conveniência e na delícia dos hambúrgueres gourmet com o Kit Star Burguer. Peça seus kits hoje mesmo e descubra como é fácil e prazeroso apreciar refeições com qualidade de restaurante no conforto da sua casa.
      - generic [ref=e94]: R$ 34,99
      - generic [ref=e96]: O que está incluso
      - list [ref=e97]:
        - listitem [ref=e98]: 🔥 2 Carnes Bovina de 160g
        - listitem [ref=e99]: 🔥 2 Pães Brioche
        - listitem [ref=e100]: 🔥 2 Fatias de Queijo Cheddar
        - listitem [ref=e101]: 🔥 4 Fatias de Bacon
      - generic [ref=e102]: Adicionais (opcional)
      - generic [ref=e103]:
        - generic [ref=e104] [cursor=pointer]:
          - generic [ref=e105]:
            - text: Geleia de Pimenta Sweet Chilli - 120ml
            - generic [ref=e106]: + R$ 7,99
          - generic [ref=e107]:
            - button "−" [ref=e108]
            - generic [ref=e109]: "0"
            - button "+" [ref=e110]
        - generic [ref=e111] [cursor=pointer]:
          - generic [ref=e112]:
            - text: Molho Garrafinha 1un 120ml
            - generic [ref=e113]: + R$ 4,99
          - generic [ref=e114]:
            - button "−" [ref=e115]
            - generic [ref=e116]: "0"
            - button "+" [ref=e117]
        - generic [ref=e118] [cursor=pointer]:
          - generic [ref=e119]:
            - text: Bacon, 4 fatias
            - generic [ref=e120]: + R$ 3,99
          - generic [ref=e121]:
            - button "−" [ref=e122]
            - generic [ref=e123]: "0"
            - button "+" [ref=e124]
        - generic [ref=e125] [cursor=pointer]:
          - generic [ref=e126]:
            - text: Cheddar, 2 fatias
            - generic [ref=e127]: + R$ 1,99
          - generic [ref=e128]:
            - button "−" [ref=e129]
            - generic [ref=e130]: "0"
            - button "+" [ref=e131]
        - generic [ref=e132] [cursor=pointer]:
          - generic [ref=e133]:
            - text: Picles Agridoce - Pote 140ml
            - generic [ref=e134]: + R$ 4,99
          - generic [ref=e135]:
            - button "−" [ref=e136]
            - generic [ref=e137]: "0"
            - button "+" [ref=e138]
      - generic [ref=e139]:
        - generic [ref=e140]: Quantidade
        - generic [ref=e141]:
          - button "−" [ref=e142] [cursor=pointer]
          - generic [ref=e143]: "1"
          - button "+" [ref=e144] [cursor=pointer]
    - generic [ref=e145]:
      - button "Compartilhar Kit" [ref=e146] [cursor=pointer]
      - button "Adicionar · R$ 34,99" [ref=e147] [cursor=pointer]
  - img:
    - generic: STAR
```

# Test source

```ts
  1  | 
  2  | const { test, expect } = require('@playwright/test');
  3  | 
  4  | const SUPABASE_URL = 'https://wwvtvkiirgcmshcdtoof.supabase.co';
  5  | const ANON_KEY = 'sb_publishable_h2J1igNGdjcrwBhbEGWusg_JKoYV6O9';
  6  | 
  7  | /** Fluxo comum: abre o catálogo, escolhe o primeiro kit e adiciona ao carrinho. */
  8  | async function adicionarPrimeiroKitAoCarrinho(page) {
  9  |   await page.goto('/');
  10 |   await page.getByText('Faça seu pedido agora').click();
  11 | 
  12 |   // Abre o primeiro kit e espera o modal do produto REALMENTE abrir
  13 |   await page.locator('.kit-cta').first().click();
  14 |   await expect(page.locator('#productOverlay')).toHaveClass(/open/);
  15 | 
  16 |   // Adiciona ao carrinho e espera o modal fechar (confirma que a ação completou)
> 17 |   await page.locator('#addToCartBtn').click();
     |                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  18 |   await expect(page.locator('#productOverlay')).not.toHaveClass(/open/);
  19 | }
  20 | 
  21 | /** Abre o carrinho e depois o checkout, esperando cada modal abrir de verdade. */
  22 | async function irParaCheckout(page) {
  23 |   await page.locator('#floatingCart').click();
  24 |   await expect(page.locator('#cartOverlay')).toHaveClass(/open/);
  25 | 
  26 |   await page.getByText('Finalize seu pedido agora').click();
  27 |   await expect(page.locator('#checkoutOverlay')).toHaveClass(/open/);
  28 | }
  29 | 
  30 | test.describe('Site de pedidos - Star Burguer', () => {
  31 | 
  32 |   test('cardápio carrega e mostra os kits', async ({ page }) => {
  33 |     await page.goto('/');
  34 |     await page.getByText('Faça seu pedido agora').click();
  35 |     await expect(page.locator('.kit-cta').first()).toBeVisible();
  36 |   });
  37 | 
  38 |   test('adicionar ao carrinho atualiza o total', async ({ page }) => {
  39 |     await adicionarPrimeiroKitAoCarrinho(page);
  40 | 
  41 |     const totalCarrinho = page.locator('#fcTotal');
  42 |     await expect(totalCarrinho).not.toHaveText('R$ 0,00');
  43 |   });
  44 | 
  45 |   test('bloqueia envio sem nome e sem telefone', async ({ page }) => {
  46 |     await adicionarPrimeiroKitAoCarrinho(page);
  47 |     await irParaCheckout(page);
  48 | 
  49 |     await page.getByText('Retirada').click();
  50 |     await page.getByText('Dinheiro').click();
  51 |     await page.getByText('Não').click();
  52 |     await page.fill('#inputData', new Date().toISOString().slice(0, 10));
  53 |     await page.fill('#inputHora', '19:00');
  54 |     await page.getByText('Enviar pedido pelo WhatsApp').click();
  55 | 
  56 |     await expect(page.locator('#fieldNome')).toHaveClass(/invalid/);
  57 |     await expect(page.locator('#fieldTelefone')).toHaveClass(/invalid/);
  58 |   });
  59 | 
  60 |   test('cupom inválido mostra mensagem de erro', async ({ page }) => {
  61 |     await adicionarPrimeiroKitAoCarrinho(page);
  62 |     await irParaCheckout(page);
  63 | 
  64 |     await page.fill('#inputTelefone', '85999999999');
  65 |     await page.fill('#inputCupom', 'CODIGO-QUE-NAO-EXISTE');
  66 |     await page.getByText('Aplicar').click();
  67 | 
  68 |     await expect(page.locator('#cupomMsg')).not.toHaveText('');
  69 |   });
  70 | 
  71 |   test('prêmio pendente da roleta é aplicado automaticamente no checkout', async ({ page, request }) => {
  72 |     const telefoneTeste = '85' + Math.floor(10000000 + Math.random() * 89999999);
  73 | 
  74 |     const insertToken = await request.post(`${SUPABASE_URL}/rest/v1/roleta_tokens`, {
  75 |       headers: {
  76 |         apikey: ANON_KEY,
  77 |         Authorization: `Bearer ${ANON_KEY}`,
  78 |         Prefer: 'return=representation',
  79 |       },
  80 |       data: { telefone: telefoneTeste },
  81 |     });
  82 |     const [tokenRow] = await insertToken.json();
  83 | 
  84 |     await request.post(`${SUPABASE_URL}/rest/v1/rpc/girar_roleta`, {
  85 |       headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  86 |       data: { p_token: tokenRow.token, p_nome: 'Teste Automatizado' },
  87 |     });
  88 | 
  89 |     await adicionarPrimeiroKitAoCarrinho(page);
  90 |     await irParaCheckout(page);
  91 | 
  92 |     await page.fill('#inputTelefone', telefoneTeste);
  93 |     await page.locator('#inputTelefone').blur();
  94 | 
  95 |     await expect(page.getByText('🎉 Prêmio aplicado!')).toBeVisible({ timeout: 5000 });
  96 |   });
  97 | 
  98 | });
```