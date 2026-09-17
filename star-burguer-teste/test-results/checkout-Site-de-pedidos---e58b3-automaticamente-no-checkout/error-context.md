# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout.spec.js >> Site de pedidos - Star Burguer >> prêmio pendente da roleta é aplicado automaticamente no checkout
- Location: tests\checkout.spec.js:71:3

# Error details

```
TypeError: (intermediate value) is not iterable
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
  17 |   await page.locator('#addToCartBtn').click();
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
> 82 |     const [tokenRow] = await insertToken.json();
     |                        ^ TypeError: (intermediate value) is not iterable
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