
//ARQUIVO DE CONFIGURAÇÃO DO PLAYWRIGHT 

// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests', //AQUI ELE DIZ PARA PROCURAR O ARQUIVO DE TESTE NA PASTA TESTS
  timeout: 30000, // AQUI ELE DIZ QUE O TESTE DEVE SER FEITO EM 30 SEGUNDOS, SE NÃO RETORNA COMO FALHO
  use: { //USE O ENDEREÇO 
    baseURL: 'https://starburguer.vercel.app', // ENDEREÇO DO SITE
    headless: true, //RODA UM NAVEGADOR INVISIVEL 
    screenshot: 'only-on-failure', //TIRA PRINT DE UMA TELA QUANDO UM TESTE DA ERRADO
  },
});