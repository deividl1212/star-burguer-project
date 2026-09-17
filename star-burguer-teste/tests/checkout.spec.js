
const { test, expect } = require('@playwright/test');

const SUPABASE_URL = 'https://wwvtvkiirgcmshcdtoof.supabase.co';
const ANON_KEY = 'sb_publishable_h2J1igNGdjcrwBhbEGWusg_JKoYV6O9';

/** Fluxo comum: abre o catálogo, escolhe o primeiro kit e adiciona ao carrinho. */
async function adicionarPrimeiroKitAoCarrinho(page) {
  await page.goto('/');
  await page.getByText('Faça seu pedido agora').click();

  // Abre o primeiro kit e espera o modal do produto REALMENTE abrir
  await page.locator('.kit-cta').first().click();
  await expect(page.locator('#productOverlay')).toHaveClass(/open/);

  // Adiciona ao carrinho e espera o modal fechar (confirma que a ação completou)
  await page.locator('#addToCartBtn').click();
  await expect(page.locator('#productOverlay')).not.toHaveClass(/open/);
}

/** Abre o carrinho e depois o checkout, esperando cada modal abrir de verdade. */
async function irParaCheckout(page) {
  await page.locator('#floatingCart').click();
  await expect(page.locator('#cartOverlay')).toHaveClass(/open/);

  await page.getByText('Finalize seu pedido agora').click();
  await expect(page.locator('#checkoutOverlay')).toHaveClass(/open/);
}

test.describe('Site de pedidos - Star Burguer', () => {

  test('cardápio carrega e mostra os kits', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Faça seu pedido agora').click();
    await expect(page.locator('.kit-cta').first()).toBeVisible();
  });

  test('adicionar ao carrinho atualiza o total', async ({ page }) => {
    await adicionarPrimeiroKitAoCarrinho(page);

    const totalCarrinho = page.locator('#fcTotal');
    await expect(totalCarrinho).not.toHaveText('R$ 0,00');
  });

  test('bloqueia envio sem nome e sem telefone', async ({ page }) => {
    await adicionarPrimeiroKitAoCarrinho(page);
    await irParaCheckout(page);

    await page.getByText('Retirada').click();
    await page.getByText('Dinheiro').click();
    await page.getByText('Não').click();
    await page.fill('#inputData', new Date().toISOString().slice(0, 10));
    await page.fill('#inputHora', '19:00');
    await page.getByText('Enviar pedido pelo WhatsApp').click();

    await expect(page.locator('#fieldNome')).toHaveClass(/invalid/);
    await expect(page.locator('#fieldTelefone')).toHaveClass(/invalid/);
  });

  test('cupom inválido mostra mensagem de erro', async ({ page }) => {
    await adicionarPrimeiroKitAoCarrinho(page);
    await irParaCheckout(page);

    await page.fill('#inputTelefone', '85999999999');
    await page.fill('#inputCupom', 'CODIGO-QUE-NAO-EXISTE');
    await page.getByText('Aplicar').click();

    await expect(page.locator('#cupomMsg')).not.toHaveText('');
  });

  test('prêmio pendente da roleta é aplicado automaticamente no checkout', async ({ page, request }) => {
    const telefoneTeste = '85' + Math.floor(10000000 + Math.random() * 89999999);

    const insertToken = await request.post(`${SUPABASE_URL}/rest/v1/roleta_tokens`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        Prefer: 'return=representation',
      },
      data: { telefone: telefoneTeste },
    });
    const [tokenRow] = await insertToken.json();

    await request.post(`${SUPABASE_URL}/rest/v1/rpc/girar_roleta`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      data: { p_token: tokenRow.token, p_nome: 'Teste Automatizado' },
    });

    await adicionarPrimeiroKitAoCarrinho(page);
    await irParaCheckout(page);

    await page.fill('#inputTelefone', telefoneTeste);
    await page.locator('#inputTelefone').blur();

    await expect(page.getByText('🎉 Prêmio aplicado!')).toBeVisible({ timeout: 5000 });
  });

});