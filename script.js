(function(){
  "use strict";

  /* ============ CONFIG ============
     Os valores reais (WhatsApp, Instagram, Supabase) ficam em config.js,
     na raiz do projeto — é o único lugar que precisa ser editado. */
  var CFG = window.STAR_BURGUER_CONFIG || {};
  var WHATSAPP_NUMBER = CFG.WHATSAPP_NUMBER || "5599999999999";
  var INSTAGRAM_URL = CFG.INSTAGRAM_URL || "https://instagram.com/starburguer";
  var SUPABASE_URL = CFG.SUPABASE_URL || "SUA_URL_DO_SUPABASE";
  var SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || "SUA_CHAVE_ANON_DO_SUPABASE";

  // Cores de cada "tier" (nível) de kit, usadas no brilho por trás do ícone
  var TIER_COLORS = {
    bronze: "#c98a4a",
    prata: "#b8b8c2",
    ouro: "#f5b319",
    premium: "#e8262a"
  };

  /* ============ DADOS DOS PRODUTOS ============
     Se o Supabase ainda não estiver configurado (SUPABASE_URL/KEY acima), o site usa
     esta lista fixa como fallback, só para você conseguir testar sem depender de nada.
     Assim que as credenciais forem preenchidas, os dados passam a vir do banco
     automaticamente e ficam editáveis pelo painel /admin. */
  var DESC_PADRAO = "Mergulhe na conveniência e na delícia dos hambúrgueres gourmet com o Kit Star Burguer. Peça seus kits hoje mesmo e descubra como é fácil e prazeroso apreciar refeições com qualidade de restaurante no conforto da sua casa.";

  var KITS = [
    {
      id: "duplo",
      nome: "Kit Star Duplo",
      tier: "bronze",
      tierColor: TIER_COLORS.bronze,
      desc: DESC_PADRAO,
      opcoes: [
        { label: "2 Carnes", preco: 34.99, itens: ["2 Carnes Bovina de 160g","2 Pães Brioche","2 Fatias de Queijo Cheddar","4 Fatias de Bacon"] }
      ]
    },
    {
      id: "economico",
      nome: "Kit Econômico",
      tier: "prata",
      tierColor: TIER_COLORS.prata,
      desc: DESC_PADRAO,
      opcoes: [
        { label: "6 Carnes", preco: 79.90, itens: ["6 Carnes Bovina de 160g","6 Pães Brioche","6 Fatias de Queijo Cheddar","Molhos"] },
        { label: "10 Carnes", preco: 119.90, itens: ["10 Carnes Bovina de 160g","10 Pães Brioche","10 Fatias de Queijo Cheddar","Molhos"] }
      ]
    },
    {
      id: "classico",
      nome: "Kit Clássico",
      tier: "ouro",
      tierColor: TIER_COLORS.ouro,
      desc: DESC_PADRAO,
      opcoes: [
        { label: "6 Carnes", preco: 124.90, itens: ["6 Carnes Bovina de 160g","6 Pães Brioche","6 Fatias de Queijo Cheddar","12 Fatias de Bacon","Picles Agridoce","Molhos"] },
        { label: "10 Carnes", preco: 149.90, itens: ["10 Carnes Bovina de 160g","10 Pães Brioche","10 Fatias de Queijo Cheddar","20 Fatias de Bacon","Picles Agridoce","Molhos"] }
      ]
    },
    {
      id: "premium",
      nome: "Kit Premium",
      tier: "premium",
      tierColor: TIER_COLORS.premium,
      desc: DESC_PADRAO,
      opcoes: [
        { label: "6 Carnes", preco: 144.90, itens: ["6 Carnes Bovina de 160g","6 Pães Brioche","6 Fatias de Queijo Cheddar","12 Fatias de Bacon","Picles Agridoce","Cebola Roxa","Tomate","Alface Americana","Molhos"] },
        { label: "10 Carnes", preco: 189.90, itens: ["10 Carnes Bovina de 160g","10 Pães Brioche","10 Fatias de Queijo Cheddar","20 Fatias de Bacon","Picles Agridoce","Cebolas Roxas","Tomate","Alface Americana","Molhos"] }
      ]
    }
  ];

  function supabaseConfigurado(){
    return SUPABASE_URL.indexOf("SUA_URL") === -1 && SUPABASE_ANON_KEY.indexOf("SUA_CHAVE") === -1;
  }

  var supabaseClient = null;
  function getSupabaseClient(){
    if (!supabaseClient && window.supabase){
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
  }

  /* Busca os kits no Supabase e converte para o mesmo formato usado no site.
     Se der qualquer erro (ou não estiver configurado ainda), mantém a lista fixa acima. */
  function carregarKitsDoSupabase(){
    if (!supabaseConfigurado()) return Promise.resolve(false);
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(false);

    return client
      .from("kits")
      .select("id, nome, descricao, tier, ativo, ordem, destaque, kit_opcoes ( id, label, preco, preco_promocional, itens, ordem )")
      .eq("ativo", true)
      .order("destaque", { ascending: false })
      .order("ordem", { ascending: true })

      .then(function(res){
        if (res.error || !res.data || res.data.length === 0){
          console.warn("Não foi possível carregar os kits do Supabase, usando dados locais.", res.error);
          return false;
        }
        KITS = res.data.map(function(row){
          var opcoesOrdenadas = (row.kit_opcoes || []).slice().sort(function(a,b){ return a.ordem - b.ordem; });
          return {
            id: row.id,
            nome: row.nome,
            tier: row.tier,
            tierColor: TIER_COLORS[row.tier] || TIER_COLORS.ouro,
            desc: row.descricao,
            destaque: !!row.destaque,
            opcoes: opcoesOrdenadas.map(function(o){
              return { label: o.label, preco: Number(o.preco), precoPromocional: o.preco_promocional != null ? Number(o.preco_promocional) : null, itens: o.itens || [] };
            })
          };
        });
        return true;
      })
      .catch(function(err){
        console.warn("Erro ao conectar no Supabase, usando dados locais.", err);
        return false;
      });
  }

  /* ============ ESTADO ============ */
  var cart = []; // { kitId, optIndex, qty }
  var activeKitId = null;
  var activeOptIndex = 0;
  var activeQty = 1;
  var activeAdicionais = []; // ids dos adicionais marcados no modal atual
  var adicionaisCache = [];
  var deliveryType = "entrega"; // ou "retirada"
  var paymentMethod = null;
  var needsChange = null; // true = precisa troco, false = não precisa, null = não escolhido ainda
  var trocoPara = "";
  var appliedCoupon = null; // { cupom_id, codigo, tipo_desconto, valor, aplica_todos_kits, kits_aplicaveis }
  var bairrosCache = [];
  var selectedBairroId = null;

  /* ============ HELPERS ============ */
 function brl(v){
    return "R$ " + v.toFixed(2).replace(".", ",");
  }

  ffunction dataLocalHoje(){
    var d = new Date();
    var ano = d.getFullYear();
    var mes = String(d.getMonth() + 1).padStart(2, "0");
    var dia = String(d.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
  }

  function checkHorarioProximo(){
    var avisoEl = document.getElementById("horarioAviso");
    if (!avisoEl) return;
    var dataVal = document.getElementById("inputData").value;
    var horaVal = document.getElementById("inputHora").value;

    if (!dataVal || !horaVal || dataVal !== dataLocalHoje()){
      avisoEl.textContent = "";
      return;
    }

    var partesHora = horaVal.split(":");
    var alvo = new Date();
    alvo.setHours(parseInt(partesHora[0], 10), parseInt(partesHora[1], 10), 0, 0);

    var diffMinutos = (alvo.getTime() - Date.now()) / 60000;

    if (diffMinutos >= 0 && diffMinutos < 45){
      avisoEl.textContent = "⚠️ Esse horário está muito próximo. A entrega pode levar até 45 minutos.";
    } else if (diffMinutos < 0){
      avisoEl.textContent = "⚠️ Esse horário já passou. Escolha um horário mais adiante.";
    } else {
      avisoEl.textContent = "";
    }
  }
  function findKit(id){ return KITS.find(function(k){ return k.id === id; }); }

  function showToast(msg){
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function(){ t.classList.remove("show"); }, 1800);
  }

  /* ============ NAVEGAÇÃO ENTRE TELAS ============ */
  function goToCatalog(){
    document.getElementById("welcomeScreen").classList.add("hidden");
    document.getElementById("catalogScreen").classList.remove("hidden");
    window.scrollTo(0,0);
  }
  function goToWelcome(){
    document.getElementById("catalogScreen").classList.add("hidden");
    document.getElementById("welcomeScreen").classList.remove("hidden");
    window.scrollTo(0,0);
  }
  function openSobre(){
    document.getElementById("sobreOverlay").classList.add("open");
  }
  function closeSobre(){
    document.getElementById("sobreOverlay").classList.remove("open");
  }
  function openContato(){
    var msg = "Olá! Gostaria de falar com a Star Burguer 🍔";
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg), "_blank");
  }
  function openInstagram(){
    window.open(INSTAGRAM_URL, "_blank");
  }

  /* ============ PROMOÇÃO (BANNER) ============ */
  function carregarPromocaoAtiva(){
    if (!supabaseConfigurado()) return;
    var client = getSupabaseClient();
    if (!client) return;

    client
      .from("promocoes")
      .select("id, titulo, descricao, item_brinde, quantidade_brinde, texto_validade, ativo")
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
      .limit(1)
      .then(function(res){
        if (res.error || !res.data || res.data.length === 0) return;
        renderPromoBanner(res.data[0]);
      });
  }

  function renderPromoBanner(promo){
    var el = document.getElementById("promoBanner");
    if (!el) return;
    el.innerHTML =
      '<div class="promo-banner">' +
        '<span class="promo-banner-tag">🔥 Super Promoção</span>' +
        '<h3>' + promo.titulo + '</h3>' +
        (promo.descricao ? '<p>' + promo.descricao + '</p>' : '') +
        '<div class="promo-banner-brinde">🎁 Leve grátis: ' + promo.quantidade_brinde + 'x ' + promo.item_brinde + '</div>' +
       (promo.texto_validade ? '<span class="promo-banner-validade">' + promo.texto_validade + '</span>' : '') +
      '</div>';
  }

  /* ============ BAIRROS / TAXA DE ENTREGA ============ */
  function carregarBairros(){
    if (!supabaseConfigurado()) return;
    var client = getSupabaseClient();
    if (!client) return;

    client
      .from("bairros")
      .select("id, nome, distancia_km, taxa, ordem, ativo")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .then(function(res){
        if (res.error || !res.data) return;
        bairrosCache = res.data;
      });
  }

 function findBairro(id){ return bairrosCache.find(function(b){ return b.id === id; }); }

  /* ============ ADICIONAIS ============ */
  function carregarAdicionais(){
    if (!supabaseConfigurado()) return;
    var client = getSupabaseClient();
    if (!client) return;

    client
      .from("adicionais")
      .select("id, nome, preco, tamanho, ordem, ativo")
      .eq("ativo", true)
      .order("tamanho", { ascending: true })
      .order("ordem", { ascending: true })
      .then(function(res){
        if (res.error || !res.data) return;
        adicionaisCache = res.data;
      });
  }

  function findAdicional(id){ return adicionaisCache.find(function(a){ return a.id === id; }); }

  function tamanhoDaOpcao(label){
    var m = (label || "").match(/\d+/);
    return m ? m[0] : null;
  }

  function adicionaisParaOpcao(opt){
    var tam = tamanhoDaOpcao(opt.label);
    if (!tam) return [];
    return adicionaisCache.filter(function(a){ return a.tamanho === tam; });
  }

  function normalizarTexto(s){
    return (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim();
  }

  function buscarCep(cepRaw){
    var cep = cepRaw.replace(/\D/g, "");
    var msgEl = document.getElementById("cepMsg");
    if (cep.length !== 8){
      if (msgEl) msgEl.textContent = "";
      return;
    }
    if (msgEl){ msgEl.style.color = "var(--cream-dim)"; msgEl.textContent = "Buscando..."; }

    fetch("https://viacep.com.br/ws/" + cep + "/json/")
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (!msgEl) return;
        if (data.erro){
          msgEl.style.color = "var(--red)";
          msgEl.textContent = "CEP não encontrado. Preencha manualmente.";
          return;
        }

        var inputEndereco = document.getElementById("inputEndereco");
        if (inputEndereco && data.logradouro){
          inputEndereco.value = data.logradouro;
        }

        var bairroApi = normalizarTexto(data.bairro);
        var bairroEncontrado = bairrosCache.find(function(b){
          return normalizarTexto(b.nome) === bairroApi;
        });

        if (bairroEncontrado){
          selectedBairroId = bairroEncontrado.id;
          var selectEl = document.getElementById("inputBairro");
          if (selectEl) selectEl.value = bairroEncontrado.id;
          var taxaMsgEl = document.getElementById("bairroTaxaMsg");
          if (taxaMsgEl){
            taxaMsgEl.textContent = Number(bairroEncontrado.taxa) === 0
              ? "Entrega grátis para este bairro."
              : "Taxa de entrega: " + brl(Number(bairroEncontrado.taxa));
          }
          msgEl.style.color = "var(--gold)";
          msgEl.textContent = "Endereço e bairro preenchidos automaticamente.";
          renderCheckoutFooter();
        } else {
          msgEl.style.color = "var(--cream-dim)";
          msgEl.textContent = "Endereço preenchido. Selecione seu bairro na lista abaixo.";
        }
      })
      .catch(function(){
        if (msgEl){
          msgEl.style.color = "var(--red)";
          msgEl.textContent = "Não foi possível buscar o CEP agora. Preencha manualmente.";
        }
      });
  }

  var ruaSearchTimeout = null;

  function buscarRuaSugestoes(termo){
    var container = document.getElementById("ruaSugestoes");
    if (!container) return;

    if (termo.length < 3){
      container.innerHTML = "";
      container.classList.remove("show");
      return;
    }

    fetch("https://viacep.com.br/ws/PR/Cascavel/" + encodeURIComponent(termo) + "/json/")
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (!Array.isArray(data) || data.length === 0){
          container.innerHTML = "";
          container.classList.remove("show");
          return;
        }
        container.innerHTML = data.slice(0, 8).map(function(item, i){
          return '<div class="rua-sugestao-item" data-idx="' + i + '">' +
            '<strong>' + item.logradouro + '</strong>' +
            '<span>' + item.bairro + '</span>' +
          '</div>';
        }).join("");
        container.classList.add("show");

        container.querySelectorAll("[data-idx]").forEach(function(el){
          el.addEventListener("click", function(){
            var item = data[parseInt(el.getAttribute("data-idx"), 10)];
            selecionarRuaSugerida(item);
          });
        });
      })
      .catch(function(){
        container.innerHTML = "";
        container.classList.remove("show");
      });
  }

  function selecionarRuaSugerida(item){
    var inputEndereco = document.getElementById("inputEndereco");
    if (inputEndereco) inputEndereco.value = item.logradouro;

    var container = document.getElementById("ruaSugestoes");
    if (container){ container.innerHTML = ""; container.classList.remove("show"); }

    var bairroApi = normalizarTexto(item.bairro);
    var bairroEncontrado = bairrosCache.find(function(b){
      return normalizarTexto(b.nome) === bairroApi;
    });

    var cepMsgEl = document.getElementById("cepMsg");
    if (bairroEncontrado){
      selectedBairroId = bairroEncontrado.id;
      var selectEl = document.getElementById("inputBairro");
      if (selectEl) selectEl.value = bairroEncontrado.id;
      var taxaMsgEl = document.getElementById("bairroTaxaMsg");
      if (taxaMsgEl){
        taxaMsgEl.textContent = Number(bairroEncontrado.taxa) === 0
          ? "Entrega grátis para este bairro."
          : "Taxa de entrega: " + brl(Number(bairroEncontrado.taxa));
      }
      renderCheckoutFooter();
    } else if (cepMsgEl){
      cepMsgEl.style.color = "var(--cream-dim)";
      cepMsgEl.textContent = "Selecione seu bairro na lista abaixo.";
    }
  }

  function taxaEntregaAtual(){
    if (deliveryType !== "entrega") return 0;
    var b = findBairro(selectedBairroId);
    return b ? Number(b.taxa) : 0;
  }

  /* ============ RENDER: MENU ============ */
  function renderMenu(){
    var list = document.getElementById("menuList");
   list.innerHTML = KITS.map(function(kit){
      var precosEfetivos = kit.opcoes.map(function(o){ return o.precoPromocional != null ? o.precoPromocional : o.preco; });
      var min = Math.min.apply(null, precosEfetivos);
      var multi = kit.opcoes.length > 1;
      var opcaoDoMenorPreco = kit.opcoes[precosEfetivos.indexOf(min)];
      var temPromo = opcaoDoMenorPreco.precoPromocional != null;
      return (
        '<div class="kit-card ' + (kit.tier === "premium" ? "tier-premium" : "") + (kit.destaque ? " kit-destaque" : "") + '" data-kit="' + kit.id + '">' +
          (kit.destaque ? '<span class="destaque-badge">🔥 Oferta da semana</span>' : '') +
          '<div class="kit-icon-wrap" style="--tier-color:' + kit.tierColor + '">' +
            '<svg viewBox="0 0 64 64"><use href="#burger-icon"/></svg>' +
          '</div>' +
          '<div class="kit-info">' +
            '<h3>' + kit.nome + '</h3>' +
            '<span class="kit-tag">' + kit.opcoes.map(function(o){return o.label;}).join(" · ") + '</span>' +
            '<div class="price-row">' +
              (temPromo ? '<span class="price-old num">' + brl(opcaoDoMenorPreco.preco) + '</span>' : "") +
              '<span class="price-pill num ' + (temPromo ? "price-promo" : "") + '">' + (multi ? "a partir de " : "") + brl(min) + '</span>' +
            '</div>' +
            '<button class="kit-cta" data-open="' + kit.id + '">Ver kit</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    list.querySelectorAll("[data-open]").forEach(function(btn){
      btn.addEventListener("click", function(){ openProduct(btn.getAttribute("data-open")); });
    });
  }


  /* ============ PRODUTO (MODAL) ============ */
  function openProduct(kitId){
    var kit = findKit(kitId);
    activeKitId = kitId;
    activeOptIndex = 0;
    activeQty = 1;
    activeAdicionais = [];
    renderProductSheet(kit);
    document.getElementById("productOverlay").classList.add("open");
  }
  function renderProductSheet(kit){
    var sheet = document.getElementById("productSheet");
    var opt = kit.opcoes[activeOptIndex];
    sheet.innerHTML =
      '<button class="sheet-close" id="closeProduct">✕</button>' +
      '<div class="sheet-scroll">' +
        '<svg class="icon-hero" viewBox="0 0 64 64"><use href="#burger-icon"/></svg>' +
        '<h2>' + kit.nome + '</h2>' +
        '<p class="desc">' + kit.desc + '</p>' +
        (kit.opcoes.length > 1 ?
          '<div class="option-list" id="optionList">' +
            kit.opcoes.map(function(o, i){
              var precoEfetivo = o.precoPromocional != null ? o.precoPromocional : o.preco;
              var temPromo = o.precoPromocional != null;
              return '<div class="option ' + (i === activeOptIndex ? "selected" : "") + '" data-opt="' + i + '">' +
                '<span class="option-label"><span class="radio"></span>' + o.label + '</span>' +
                '<span class="option-price-wrap">' +
                  (temPromo ? '<span class="price-old num" style="font-size:0.78rem;">' + brl(o.preco) + '</span>' : "") +
                  '<span class="option-price num ' + (temPromo ? "price-promo" : "") + '">' + brl(precoEfetivo) + '</span>' +
                '</span>' +
              '</div>';
            }).join("") +
          '</div>'
          : (function(){
              var precoEfetivo = opt.precoPromocional != null ? opt.precoPromocional : opt.preco;
              var temPromo = opt.precoPromocional != null;
              return '<div class="price-row" style="margin-bottom:16px;">' +
                (temPromo ? '<span class="price-old num" style="font-size:0.95rem;">' + brl(opt.preco) + '</span>' : "") +
                '<span class="price-pill num ' + (temPromo ? "price-promo" : "") + '" style="font-size:1.1rem;">' + brl(precoEfetivo) + '</span>' +
              '</div>';
            })()
        ) +
        '<div class="includes-title">O que está incluso</div>' +
        '<ul class="includes">' + opt.itens.map(function(it){ return "<li>" + it + "</li>"; }).join("") + '</ul>' +
        (adicionaisParaOpcao(opt).length > 0 ?
          '<div class="includes-title">Adicionais (opcional)</div>' +
          '<div class="adicionais-list" id="adicionaisList">' +
            adicionaisParaOpcao(opt).map(function(a){
              return '<label class="adicional-item">' +
                '<span class="adicional-check-label"><input type="checkbox" class="adicionalCheckbox" value="' + a.id + '" ' + (activeAdicionais.indexOf(a.id) !== -1 ? "checked" : "") + '> ' + a.nome + '</span>' +
                '<span class="adicional-preco num">+ ' + brl(Number(a.preco)) + '</span>' +
              '</label>';
            }).join("") +
          '</div>'
          : "") +
        '<div class="qty-row">' +

          '<span style="font-size:0.85rem; color:var(--cream-dim);">Quantidade</span>' +
          '<div class="qty-control">' +
            '<button id="qtyMinus">−</button><span id="qtyValue">' + activeQty + '</span><button id="qtyPlus">+</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-footer">' +
        '<button class="btn-primary" id="addToCartBtn">Adicionar · <span id="addToCartPrice" class="num"></span></button>' +
      '</div>';

    document.getElementById("closeProduct").addEventListener("click", closeProduct);
    if (kit.opcoes.length > 1){
      sheet.querySelectorAll("[data-opt]").forEach(function(el){
        el.addEventListener("click", function(){
          activeOptIndex = parseInt(el.getAttribute("data-opt"), 10);
          renderProductSheet(kit);
        });
      });
    }
    document.getElementById("qtyMinus").addEventListener("click", function(){
      if (activeQty > 1){ activeQty--; updateQtyUI(kit); }
    });
    document.getElementById("qtyPlus").addEventListener("click", function(){
      activeQty++; updateQtyUI(kit);
    });
    document.querySelectorAll(".adicionalCheckbox").forEach(function(chk){
      chk.addEventListener("change", function(){
        var id = this.value;
        if (this.checked){
          if (activeAdicionais.indexOf(id) === -1) activeAdicionais.push(id);
        } else {
          activeAdicionais = activeAdicionais.filter(function(x){ return x !== id; });
        }
        updateQtyUI(kit);
      });
    });
    document.getElementById("addToCartBtn").addEventListener("click", function(){
      addToCart(kit.id, activeOptIndex, activeQty, activeAdicionais.slice());
      closeProduct();
      showToast("Adicionado ao pedido!");
    });
    updateQtyUI(kit);
  }

  function precoAdicionaisSelecionados(){
    return activeAdicionais.reduce(function(sum, id){
      var a = findAdicional(id);
      return sum + (a ? Number(a.preco) : 0);
    }, 0);
  }

  function precoEfetivoOpcao(opt){
    return opt.precoPromocional != null ? opt.precoPromocional : opt.preco;
  }

  function updateQtyUI(kit){
    document.getElementById("qtyValue").textContent = activeQty;
    var opt = kit.opcoes[activeOptIndex];
    var precoUnit = precoEfetivoOpcao(opt) + precoAdicionaisSelecionados();
    document.getElementById("addToCartPrice").textContent = brl(precoUnit * activeQty);
  }
  function closeProduct(){
    document.getElementById("productOverlay").classList.remove("open");
  }

 /* ============ CARRINHO ============ */
  function chaveAdicionais(ids){
    return (ids || []).slice().sort().join(",");
  }

  function addToCart(kitId, optIndex, qty, adicionaisIds){
    adicionaisIds = adicionaisIds || [];
    var chave = chaveAdicionais(adicionaisIds);
    var existing = cart.find(function(c){
      return c.kitId === kitId && c.optIndex === optIndex && chaveAdicionais(c.adicionaisIds) === chave;
    });
    if (existing){ existing.qty += qty; }
    else { cart.push({ kitId: kitId, optIndex: optIndex, qty: qty, adicionaisIds: adicionaisIds }); }
    renderFloatingCart();
  }

  function precoUnitItem(item){
    var kit = findKit(item.kitId);
    var opt = kit.opcoes[item.optIndex];
    var extras = (item.adicionaisIds || []).reduce(function(sum, id){
      var a = findAdicional(id);
      return sum + (a ? Number(a.preco) : 0);
    }, 0);
    return precoEfetivoOpcao(opt) + extras;
  }

  function cartTotal(){
    return cart.reduce(function(sum, item){
      return sum + precoUnitItem(item) * item.qty;
    }, 0);
  }
  function cartCount(){
    return cart.reduce(function(sum, item){ return sum + item.qty; }, 0);
  }

  function renderFloatingCart(){
    var count = cartCount();
    var fc = document.getElementById("floatingCart");
    document.getElementById("fcCount").textContent = count;
    document.getElementById("fcTotal").textContent = brl(cartTotal());
    var badge = document.getElementById("cartBadge");
    fc.classList.add("show"); // sempre visível, mesmo com carrinho vazio
    if (count > 0){
      badge.style.display = "flex";
      badge.textContent = count;
    } else {
      badge.style.display = "none";
    }
  }
  function openCart(){
    renderCartSheet();
    document.getElementById("cartOverlay").classList.add("open");
  }
  function closeCart(){
    document.getElementById("cartOverlay").classList.remove("open");
  }

  function renderCartSheet(){
    var sheet = document.getElementById("cartSheet");
    if (cart.length === 0){
      sheet.innerHTML =
        '<button class="sheet-close" id="closeCart">✕</button>' +
        '<div class="sheet-scroll">' +
          '<h2>Seu pedido</h2>' +
          '<div class="cart-empty">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L20.7 5H4.54l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>' +
            'Seu carrinho está vazio.<br>Escolha um kit no cardápio.' +
          '</div>' +
        '</div>';
      document.getElementById("closeCart").addEventListener("click", closeCart);
      return;
    }
    sheet.innerHTML =
      '<button class="sheet-close" id="closeCart">✕</button>' +
      '<div class="sheet-scroll">' +
        '<h2>Seu pedido</h2>' +
        '<div id="cartItems">' +
        cart.map(function(item, idx){
          var kit = findKit(item.kitId);
          var opt = kit.opcoes[item.optIndex];
          var nomesAdicionais = (item.adicionaisIds || []).map(function(id){
            var a = findAdicional(id);
            return a ? a.nome : null;
          }).filter(Boolean);
          return '<div class="cart-item" data-idx="' + idx + '">' +
            '<svg class="cart-item-icon" viewBox="0 0 64 64"><use href="#burger-icon"/></svg>' +
            '<div class="cart-item-info">' +
              '<h4>' + kit.nome + '</h4>' +
              '<span>' + opt.label + ' · ' + brl(precoUnitItem(item)) + '</span>' +
              (nomesAdicionais.length ? '<span style="display:block; color:var(--gold);">+ ' + nomesAdicionais.join(", ") + '</span>' : "") +
            '</div>' +

            '<div class="cart-item-actions">' +
              '<button data-dec="' + idx + '">−</button>' +
              '<span class="num">' + item.qty + '</span>' +
              '<button data-inc="' + idx + '">+</button>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:right; margin:-6px 0 4px;"><button class="remove-btn" data-rm="' + idx + '">remover</button></div>';
        }).join("") +
        '</div>' +
      '</div>' +
      '<div class="sheet-footer">' +
        '<div class="cart-summary-row"><span>Total</span><span class="num">' + brl(cartTotal()) + '</span></div>' +
        '<button class="btn-primary" id="goCheckout">Faça seu pedido agora</button>' +
      '</div>';

    document.getElementById("closeCart").addEventListener("click", closeCart);
    sheet.querySelectorAll("[data-inc]").forEach(function(b){
      b.addEventListener("click", function(){
        cart[parseInt(b.getAttribute("data-inc"),10)].qty++;
        renderCartSheet(); renderFloatingCart();
      });
    });
    sheet.querySelectorAll("[data-dec]").forEach(function(b){
      b.addEventListener("click", function(){
        var i = parseInt(b.getAttribute("data-dec"),10);
        cart[i].qty--;
        if (cart[i].qty <= 0){ cart.splice(i,1); }
        renderCartSheet(); renderFloatingCart();
      });
    });
    sheet.querySelectorAll("[data-rm]").forEach(function(b){
      b.addEventListener("click", function(){
        cart.splice(parseInt(b.getAttribute("data-rm"),10), 1);
        renderCartSheet(); renderFloatingCart();
      });
    });
    document.getElementById("goCheckout").addEventListener("click", function(){
      closeCart();
      openCheckout();
    });
  }

  /* ============ CHECKOUT ============ */
  function openCheckout(){
    renderCheckoutSheet();
    document.getElementById("checkoutOverlay").classList.add("open");
  }
  function closeCheckout(){
    document.getElementById("checkoutOverlay").classList.remove("open");
  }

  function renderCheckoutSheet(){
    var sheet = document.getElementById("checkoutSheet");
    sheet.innerHTML =
      '<button class="sheet-close" id="closeCheckout">✕</button>' +
      '<div class="sheet-scroll">' +
      '<h2>Finalizar pedido</h2>' +
      '<p class="desc">Preencha seus dados. Você será direcionado ao WhatsApp com o pedido já pronto.</p>' +

      '<div class="field"><label>Entrega ou retirada</label>' +
        '<div class="toggle-row">' +
          '<button type="button" class="toggle-btn ' + (deliveryType==="entrega"?"active":"") + '" id="toggleEntrega">Entrega</button>' +
          '<button type="button" class="toggle-btn ' + (deliveryType==="retirada"?"active":"") + '" id="toggleRetirada">Retirada</button>' +
        '</div>' +
      '</div>' +

      '<div class="field" id="fieldNome"><label>Nome</label><input type="text" id="inputNome" placeholder="Seu nome completo"><span class="error-text">Informe seu nome.</span></div>' +

      '<div class="field" id="fieldCep" style="display:' + (deliveryType==="entrega"?"block":"none") + '">' +
        '<label>CEP (opcional)</label><input type="text" id="inputCep" placeholder="00000-000" maxlength="9">' +
        '<span class="cep-msg" id="cepMsg"></span>' +
      '</div>' +


      '<div class="field" id="fieldEndereco" style="display:' + (deliveryType==="entrega"?"block":"none") + '; position:relative;">' +
        '<label>Rua</label><input type="text" id="inputEndereco" placeholder="Digite ao menos 3 letras da rua" autocomplete="off">' +
        '<div class="rua-sugestoes" id="ruaSugestoes"></div>' +
        '<span class="error-text">Informe a rua de entrega.</span>' +
      '</div>' +

      '<div class="field" id="fieldNumero" style="display:' + (deliveryType==="entrega"?"block":"none") + '">' +
        '<label>Número</label><input type="text" id="inputNumero" placeholder="Ex: 123"><span class="error-text">Informe o número.</span>' +
      '</div>' +

      '<div class="field" id="fieldBairro" style="display:' + (deliveryType==="entrega"?"block":"none") + '">' +
        '<label>Bairro</label>' +
        '<select id="inputBairro">' +
          '<option value="">Selecione seu bairro</option>' +
          bairrosCache.map(function(b){
            return '<option value="' + b.id + '" ' + (selectedBairroId === b.id ? "selected" : "") + '>' + b.nome + '</option>';
          }).join("") +
        '</select>' +
        '<span class="bairro-taxa-msg" id="bairroTaxaMsg">' + (selectedBairroId ? (Number(findBairro(selectedBairroId).taxa) === 0 ? "Entrega grátis para este bairro." : "Taxa de entrega: " + brl(Number(findBairro(selectedBairroId).taxa))) : "") + '</span>' +
        '<span class="error-text">Selecione seu bairro.</span>' +
      '</div>' +

      '<div class="field" id="fieldTelefone"><label>Telefone</label><input type="tel" id="inputTelefone" placeholder="(00) 00000-0000"><span class="error-text">Informe um telefone válido.</span></div>' +

     '<div class="form-row">' +
       '<div class="field"><label>Data desejada</label><input type="date" id="inputData" min="' + dataLocalHoje() + '"><span class="error-text" id="dataErrorText">Escolha uma data.</span></div>' +
       '<div class="field"><label>Horário desejado</label><input type="time" id="inputHora"><span class="error-text">Escolha um horário.</span><span class="horario-aviso" id="horarioAviso"></span></div>' +
      '</div>' +

      '<div class="field" id="cupomFieldWrap"></div>' +
      '<div class="field" id="fieldPagamento"><label>Forma de pagamento</label>' +
        '<div class="pay-grid">' +
          '<div class="pay-opt ' + (paymentMethod==="Pix"?"active":"") + '" data-pay="Pix">Pix</div>' +
          '<div class="pay-opt ' + (paymentMethod==="Dinheiro"?"active":"") + '" data-pay="Dinheiro">Dinheiro</div>' +
          '<div class="pay-opt ' + (paymentMethod==="Cartão"?"active":"") + '" data-pay="Cartão">Cartão</div>' +
        '</div>' +
        '<span class="error-text">Escolha a forma de pagamento.</span>' +
      '</div>' +

      '<div class="field" id="fieldTroco" style="display:' + (paymentMethod==="Dinheiro"?"block":"none") + '">' +
        '<label>Precisa de troco?</label>' +
        '<div class="toggle-row">' +
          '<button type="button" class="toggle-btn ' + (needsChange===true?"active":"") + '" id="toggleTrocoSim">Sim</button>' +
          '<button type="button" class="toggle-btn ' + (needsChange===false?"active":"") + '" id="toggleTrocoNao">Não</button>' +
        '</div>' +
        '<div class="field" id="fieldTrocoValor" style="display:' + (needsChange===true?"block":"none") + '; margin-top:10px;">' +
          '<label>Troco para quanto?</label><input type="number" step="0.01" id="inputTrocoPara" placeholder="Ex: 100" value="' + (trocoPara || "") + '">' +
          '<span class="error-text">Informe o valor para o troco.</span>' +
        '</div>' +
      '</div>' +

      '<div class="field"><label>Observações (opcional)</label><textarea id="inputObs" placeholder="Ex: sem cebola, entregar na portaria..."></textarea></div>' +
      '</div>' +
      '<div class="sheet-footer" id="checkoutFooter"></div>';
document.getElementById("closeCheckout").addEventListener("click", closeCheckout);
    document.getElementById("toggleEntrega").addEventListener("click", function(){
      deliveryType = "entrega";
      atualizarTipoEntregaUI();
    });
    document.getElementById("toggleRetirada").addEventListener("click", function(){
      deliveryType = "retirada";
      atualizarTipoEntregaUI();
    });
    sheet.querySelectorAll("[data-pay]").forEach(function(el){
      el.addEventListener("click", function(){
        paymentMethod = el.getAttribute("data-pay");
        atualizarPagamentoUI();
      });
    });

    renderCupomField();

    var inputEnderecoEl = document.getElementById("inputEndereco");
    if (inputEnderecoEl){
      inputEnderecoEl.addEventListener("input", function(){
        var termo = this.value.trim();
        clearTimeout(ruaSearchTimeout);
        ruaSearchTimeout = setTimeout(function(){
          buscarRuaSugestoes(termo);
        }, 400);
      });
      inputEnderecoEl.addEventListener("blur", function(){
        setTimeout(function(){
          var container = document.getElementById("ruaSugestoes");
          if (container) container.classList.remove("show");
        }, 200);
      });
    }

    var inputDataEl = document.getElementById("inputData");
    if (inputDataEl){ inputDataEl.addEventListener("change", checkHorarioProximo); }
    var inputHoraEl = document.getElementById("inputHora");
    if (inputHoraEl){ inputHoraEl.addEventListener("change", checkHorarioProximo); }

    var inputCep = document.getElementById("inputCep");
    if (inputCep){
      inputCep.addEventListener("input", function(){
        var digits = this.value.replace(/\D/g, "").slice(0, 8);
        this.value = digits.length > 5 ? digits.slice(0,5) + "-" + digits.slice(5) : digits;
        if (digits.length === 8){ buscarCep(digits); }
      });
    }

    var inputBairro = document.getElementById("inputBairro");
    if (inputBairro){
      inputBairro.addEventListener("change", function(){
        selectedBairroId = this.value || null;
        var msgEl = document.getElementById("bairroTaxaMsg");
        var b = findBairro(selectedBairroId);
        if (b){
          msgEl.textContent = Number(b.taxa) === 0 ? "Entrega grátis para este bairro." : "Taxa de entrega: " + brl(Number(b.taxa));
        } else {
          msgEl.textContent = "";
        }
        renderCheckoutFooter();
      });
    }

    renderCheckoutFooter();
  }

  function renderCupomField(){
    var wrap = document.getElementById("cupomFieldWrap");
    if (!wrap) return;
    wrap.innerHTML =
      '<label>Cupom de desconto (opcional)</label>' +
      '<div class="cupom-row">' +
        '<input type="text" id="inputCupom" placeholder="Digite o código" value="' + (appliedCoupon ? appliedCoupon.codigo : "") + '" ' + (appliedCoupon ? "disabled" : "") + '>' +
        (appliedCoupon
          ? '<button type="button" class="btn-cupom-remove" id="btnRemoverCupom">Remover</button>'
          : '<button type="button" class="btn-cupom-aplicar" id="btnAplicarCupom">Aplicar</button>') +
      '</div>' +
      '<span class="cupom-msg" id="cupomMsg" style="color:' + (appliedCoupon ? "var(--gold)" : "var(--red)") + ';">' + (appliedCoupon ? "Cupom aplicado: -" + (appliedCoupon.tipo_desconto === "percentual" ? appliedCoupon.valor + "%" : brl(appliedCoupon.valor)) : "") + '</span>';

    var btnAplicarCupom = document.getElementById("btnAplicarCupom");
    if (btnAplicarCupom){
      btnAplicarCupom.addEventListener("click", aplicarCupom);
    }
    var btnRemoverCupom = document.getElementById("btnRemoverCupom");
    if (btnRemoverCupom){
      btnRemoverCupom.addEventListener("click", function(){
        appliedCoupon = null;
        renderCupomField();
        renderCheckoutFooter();
      });
    }
  }

  function aplicarCupom(){
    var codigo = document.getElementById("inputCupom").value.trim();
    var telefone = document.getElementById("inputTelefone").value.trim();
    var msgEl = document.getElementById("cupomMsg");

    if (!codigo){ msgEl.style.color = "var(--red)"; msgEl.textContent = "Digite um código."; return; }
    if (!telefone){ msgEl.style.color = "var(--red)"; msgEl.textContent = "Preencha o telefone antes de aplicar o cupom."; return; }

    var client = getSupabaseClient();
    if (!client){ msgEl.style.color = "var(--red)"; msgEl.textContent = "Não foi possível validar o cupom agora."; return; }

    msgEl.style.color = "var(--cream-dim)";
    msgEl.textContent = "Verificando...";

    client.rpc("validar_cupom", { p_codigo: codigo, p_telefone: telefone }).then(function(res){
      if (res.error || !res.data || !res.data.valido){
        appliedCoupon = null;
        msgEl.style.color = "var(--red)";
        msgEl.textContent = (res.data && res.data.motivo) ? res.data.motivo : "Cupom inválido.";
        return;
      }
      appliedCoupon = res.data;
      renderCupomField();
      renderCheckoutFooter();
    });
  }

  function calcularDesconto(){
    if (!appliedCoupon) return 0;
    var baseTotal;
    if (appliedCoupon.aplica_todos_kits){
      baseTotal = cartTotal();
    } else {
      var elegiveis = appliedCoupon.kits_aplicaveis || [];
      baseTotal = cart.reduce(function(sum, item){
        if (elegiveis.indexOf(item.kitId) !== -1){
          var kit = findKit(item.kitId);
          var opt = kit.opcoes[item.optIndex];
          return sum + opt.preco * item.qty;
        }
        return sum;
      }, 0);
    }
    if (appliedCoupon.tipo_desconto === "percentual"){
      return baseTotal * (appliedCoupon.valor / 100);
    }
    return Math.min(appliedCoupon.valor, baseTotal);
  }

  function atualizarTipoEntregaUI(){
    document.getElementById("toggleEntrega").classList.toggle("active", deliveryType === "entrega");
    document.getElementById("toggleRetirada").classList.toggle("active", deliveryType === "retirada");
    
    renderCheckoutFooter();
  }

  function renderCheckoutFooter(){
    var footer = document.getElementById("checkoutFooter");
    if (!footer) return;
    var desconto = calcularDesconto();
    var taxa = taxaEntregaAtual();
    document.getElementById("fieldEndereco").style.display = deliveryType === "entrega" ? "block" : "none";
    document.getElementById("fieldNumero").style.display = deliveryType === "entrega" ? "block" : "none";
    document.getElementById("fieldBairro").style.display = deliveryType === "entrega" ? "block" : "none";
    var total = cartTotal() - desconto + taxa;

    footer.innerHTML =
      (appliedCoupon ?
        '<div class="cart-summary-row" style="font-size:0.85rem; font-weight:600;"><span>Subtotal</span><span class="num">' + brl(cartTotal()) + '</span></div>' +
        '<div class="cart-summary-row" style="font-size:0.85rem; font-weight:600; color:var(--gold);"><span>Desconto (' + appliedCoupon.codigo + ')</span><span class="num">-' + brl(desconto) + '</span></div>'
        : "") +
      (deliveryType === "entrega" ?
        '<div class="cart-summary-row" style="font-size:0.85rem; font-weight:600;"><span>Taxa de entrega</span><span class="num">' + (selectedBairroId ? brl(taxa) : "—") + '</span></div>'
        : "") +
      '<div class="cart-summary-row"><span>Total</span><span class="num">' + brl(total) + '</span></div>' +
      '<button class="btn-primary" id="sendOrderBtn">Enviar pedido pelo WhatsApp</button>' +
      '<p class="badge-note">Ao continuar, seu pedido completo será aberto em uma conversa do WhatsApp para confirmação.</p>';

    document.getElementById("sendOrderBtn").addEventListener("click", trySendOrder);
  }

  function atualizarPagamentoUI(){
    document.getElementById("checkoutSheet").querySelectorAll("[data-pay]").forEach(function(el){
      el.classList.toggle("active", el.getAttribute("data-pay") === paymentMethod);
    });
    if (paymentMethod !== "Dinheiro"){
      needsChange = null;
      trocoPara = "";
    }
    renderTrocoField();
  }

  function renderTrocoField(){
    var field = document.getElementById("fieldTroco");
    if (!field) return;
    field.style.display = paymentMethod === "Dinheiro" ? "block" : "none";

    field.innerHTML =
      '<label>Precisa de troco?</label>' +
      '<div class="toggle-row">' +
        '<button type="button" class="toggle-btn ' + (needsChange===true?"active":"") + '" id="toggleTrocoSim">Sim</button>' +
        '<button type="button" class="toggle-btn ' + (needsChange===false?"active":"") + '" id="toggleTrocoNao">Não</button>' +
      '</div>' +
      '<div class="field" id="fieldTrocoValor" style="display:' + (needsChange===true?"block":"none") + '; margin-top:10px;">' +
        '<label>Troco para quanto?</label><input type="number" step="0.01" id="inputTrocoPara" placeholder="Ex: 100" value="' + (trocoPara || "") + '">' +
        '<span class="error-text">Informe o valor para o troco.</span>' +
      '</div>';

    document.getElementById("toggleTrocoSim").addEventListener("click", function(){
      needsChange = true;
      renderTrocoField();
    });
    document.getElementById("toggleTrocoNao").addEventListener("click", function(){
      needsChange = false;
      trocoPara = "";
      renderTrocoField();
    });
    var inputTrocoPara = document.getElementById("inputTrocoPara");
    if (inputTrocoPara){
      inputTrocoPara.addEventListener("input", function(){
        trocoPara = this.value;
      });
    }
  }

  function trySendOrder(){
    var nome = document.getElementById("inputNome").value.trim();
    var endereco = deliveryType === "entrega" ? document.getElementById("inputEndereco").value.trim() : "";
    var numero = deliveryType === "entrega" ? document.getElementById("inputNumero").value.trim() : "";
    var telefone = document.getElementById("inputTelefone").value.trim();
    var data = document.getElementById("inputData").value;
    var hora = document.getElementById("inputHora").value;
    var obs = document.getElementById("inputObs").value.trim();

    var valid = true;
    function setInvalid(fieldId, isInvalid){
      var f = document.getElementById(fieldId);
      if (isInvalid){ f.classList.add("invalid"); valid = false; }
      else { f.classList.remove("invalid"); }
    }
    setInvalid("fieldNome", nome.length === 0);
    if (deliveryType === "entrega"){
      setInvalid("fieldEndereco", endereco.length === 0);
      setInvalid("fieldNumero", numero.length === 0);
      setInvalid("fieldBairro", !selectedBairroId);
    }
    setInvalid("fieldTelefone", telefone.length < 8);
    setInvalid("fieldPagamento", !paymentMethod);
    if (paymentMethod === "Dinheiro" && needsChange === true){
      setInvalid("fieldTrocoValor", !trocoPara || parseFloat(trocoPara) <= 0);
    }

   var dataField = document.getElementById("inputData");
    var dataErrorText = document.getElementById("dataErrorText");
    var hojeStr = dataLocalHoje();
    if (!data){
      dataField.style.borderColor = "var(--red)";
      dataErrorText.textContent = "Escolha uma data.";
      dataErrorText.style.display = "block";
      valid = false;
    } else if (data < hojeStr){
      dataField.style.borderColor = "var(--red)";
      dataErrorText.textContent = "Essa data já passou. Escolha uma data válida.";
      dataErrorText.style.display = "block";
      valid = false;
    } else {
      dataField.style.borderColor = "";
      dataErrorText.style.display = "none";
    }

    var horaField = document.getElementById("inputHora");
    if (!hora){ horaField.style.borderColor = "var(--red)"; valid = false; }
    else { horaField.style.borderColor = ""; }

    if (!valid){ showToast("Confira os campos destacados"); return; }

   var msg = buildWhatsAppMessage({ nome: nome, endereco: endereco, numero: numero, telefone: telefone, data: data, hora: hora, obs: obs });
    var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
    window.open(url, "_blank");

    if (appliedCoupon){
      var client = getSupabaseClient();
      if (client){
        client.rpc("registrar_uso_cupom", { p_cupom_id: appliedCoupon.cupom_id, p_telefone: telefone })
          .then(function(res){
            if (res.error){
              console.warn("Erro ao registrar uso do cupom:", res.error);
            }
          });
      }
    }

    cart = [];
    appliedCoupon = null;
    selectedBairroId = null;
    needsChange = null;
    trocoPara = "";
    renderFloatingCart();
    closeCheckout();
    showToast("Pedido enviado! Confirme no WhatsApp.");
  }
  function formatDateBR(iso){
    if (!iso) return "";
    var parts = iso.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function buildWhatsAppMessage(data){
    var lines = [];
    lines.push("*Novo pedido — Star Burguer* 🔥");
    lines.push("");
    lines.push("*Itens do pedido:*");
    cart.forEach(function(item){
      var kit = findKit(item.kitId);
      var opt = kit.opcoes[item.optIndex];
      var nomesAdicionais = (item.adicionaisIds || []).map(function(id){
        var a = findAdicional(id);
        return a ? a.nome : null;
      }).filter(Boolean);
      lines.push("• " + item.qty + "x " + kit.nome + " (" + opt.label + ") — " + brl(precoUnitItem(item) * item.qty));
      if (nomesAdicionais.length){
        lines.push("   + " + nomesAdicionais.join(", "));
      }
    });
   lines.push("");
    var descontoMsg = calcularDesconto();
    var taxaMsg = taxaEntregaAtual();
    if (appliedCoupon || (deliveryType === "entrega" && taxaMsg > 0)){
      lines.push("Subtotal: " + brl(cartTotal()));
      if (appliedCoupon){ lines.push("Cupom aplicado (" + appliedCoupon.codigo + "): -" + brl(descontoMsg)); }
      if (deliveryType === "entrega"){ lines.push("Taxa de entrega: " + (taxaMsg === 0 ? "Grátis" : brl(taxaMsg))); }
      lines.push("*Total: " + brl(cartTotal() - descontoMsg + taxaMsg) + "*");
    } else {
      lines.push("*Total: " + brl(cartTotal()) + "*");
    }
    lines.push("");


    lines.push("*Tipo:* " + (deliveryType === "entrega" ? "Entrega" : "Retirada"));
    lines.push("*Nome:* " + data.nome);
    if (deliveryType === "entrega"){
      lines.push("*Endereço:* " + data.endereco + ", " + data.numero);
      var bairroSel = findBairro(selectedBairroId);
      lines.push("*Bairro:* " + (bairroSel ? bairroSel.nome : ""));
    }

    lines.push("*Telefone:* " + data.telefone);
    lines.push("*Data desejada:* " + formatDateBR(data.data) + " às " + data.hora);
    if (paymentMethod === "Dinheiro"){
      if (needsChange === true && trocoPara){
        lines.push("*Pagamento:* Dinheiro (troco para " + brl(parseFloat(trocoPara)) + ")");
      } else if (needsChange === false){
        lines.push("*Pagamento:* Dinheiro (sem troco)");
      } else {
        lines.push("*Pagamento:* " + paymentMethod);
      }
    } else {
      lines.push("*Pagamento:* " + paymentMethod);
    }
    if (data.obs){ lines.push("*Observações:* " + data.obs); }
    return lines.join("\n");
  }

  /* ============ EMBERS (efeito visual) ============ */
  function spawnEmbers(containerId, count){
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    for (var i=0; i<count; i++){
      var e = document.createElement("div");
      e.className = "ember";
      e.style.left = (Math.random()*100) + "%";
      e.style.setProperty("--drift", (Math.random()*40-20) + "px");
      e.style.animationDelay = (Math.random()*6) + "s";
      e.style.animationDuration = (5 + Math.random()*3) + "s";
      wrap.appendChild(e);
    }
  }

  /* ============ INIT ============ */
  document.getElementById("btnPedirWelcome").addEventListener("click", goToCatalog);
  document.getElementById("btnSobreWelcome").addEventListener("click", openSobre);
  document.getElementById("btnContatoWelcome").addEventListener("click", openContato);
  document.getElementById("btnInstagramWelcome").addEventListener("click", openInstagram);
  document.getElementById("brandHome").addEventListener("click", goToWelcome);
  document.getElementById("btnSobreNav").addEventListener("click", openSobre);
  document.getElementById("btnContatoNav").addEventListener("click", openContato);
  document.getElementById("btnInstagramNav").addEventListener("click", openInstagram);
  document.getElementById("closeSobre").addEventListener("click", closeSobre);
  document.getElementById("sobreOverlay").addEventListener("click", function(e){ if (e.target === this) closeSobre(); });

  document.getElementById("openCartBtn").addEventListener("click", openCart);
  document.getElementById("floatingCart").addEventListener("click", openCart);
  document.getElementById("productOverlay").addEventListener("click", function(e){
    if (e.target === this) closeProduct();
  });
  document.getElementById("cartOverlay").addEventListener("click", function(e){
    if (e.target === this) closeCart();
  });
  document.getElementById("checkoutOverlay").addEventListener("click", function(e){
    if (e.target === this) closeCheckout();
  });

  renderFloatingCart();
  spawnEmbers("embersWelcome", 16);
  spawnEmbers("embers", 14);

  // Mostra o cardápio imediatamente com os dados locais (fallback) e,
  // se o Supabase estiver configurado, atualiza assim que os dados reais chegarem.
 renderMenu();
  if (supabaseConfigurado()){
    document.getElementById("menuList").innerHTML = '<p style="text-align:center; color:var(--cream-dim); font-size:0.85rem;">Carregando cardápio...</p>';
    carregarKitsDoSupabase().then(function(){ renderMenu(); });
    carregarPromocaoAtiva();
    carregarBairros();
    carregarAdicionais();
  }
})();
