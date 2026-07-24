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
      .select("id, nome, descricao, tier, ativo, ordem, kit_opcoes ( id, label, preco, itens, ordem )")
      .eq("ativo", true)
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
            opcoes: opcoesOrdenadas.map(function(o){
              return { label: o.label, preco: Number(o.preco), itens: o.itens || [] };
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
  var deliveryType = "entrega"; // ou "retirada"
  var paymentMethod = null;

  /* ============ HELPERS ============ */
  function brl(v){
    return "R$ " + v.toFixed(2).replace(".", ",");
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

  /* ============ RENDER: MENU ============ */
  function renderMenu(){
    var list = document.getElementById("menuList");
    list.innerHTML = KITS.map(function(kit){
      var precos = kit.opcoes.map(function(o){ return o.preco; });
      var min = Math.min.apply(null, precos);
      var multi = kit.opcoes.length > 1;
      return (
        '<div class="kit-card ' + (kit.tier === "premium" ? "tier-premium" : "") + '" data-kit="' + kit.id + '">' +
          '<div class="kit-icon-wrap" style="--tier-color:' + kit.tierColor + '">' +
            '<svg viewBox="0 0 64 64"><use href="#burger-icon"/></svg>' +
          '</div>' +
          '<div class="kit-info">' +
            '<h3>' + kit.nome + '</h3>' +
            '<span class="kit-tag">' + kit.opcoes.map(function(o){return o.label;}).join(" · ") + '</span>' +
            '<div class="price-row">' +
              '<span class="price-pill num">' + (multi ? "a partir de " : "") + brl(min) + '</span>' +
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
              return '<div class="option ' + (i === activeOptIndex ? "selected" : "") + '" data-opt="' + i + '">' +
                '<span class="option-label"><span class="radio"></span>' + o.label + '</span>' +
                '<span class="option-price num">' + brl(o.preco) + '</span>' +
              '</div>';
            }).join("") +
          '</div>'
          : '<div class="price-row" style="margin-bottom:16px;"><span class="price-pill num" style="font-size:1.1rem;">' + brl(opt.preco) + '</span></div>'
        ) +
        '<div class="includes-title">O que está incluso</div>' +
        '<ul class="includes">' + opt.itens.map(function(it){ return "<li>" + it + "</li>"; }).join("") + '</ul>' +
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
    document.getElementById("addToCartBtn").addEventListener("click", function(){
      addToCart(kit.id, activeOptIndex, activeQty);
      closeProduct();
      showToast("Adicionado ao pedido!");
    });
    updateQtyUI(kit);
  }

  function updateQtyUI(kit){
    document.getElementById("qtyValue").textContent = activeQty;
    var opt = kit.opcoes[activeOptIndex];
    document.getElementById("addToCartPrice").textContent = brl(opt.preco * activeQty);
  }

  function closeProduct(){
    document.getElementById("productOverlay").classList.remove("open");
  }

  /* ============ CARRINHO ============ */
  function addToCart(kitId, optIndex, qty){
    var existing = cart.find(function(c){ return c.kitId === kitId && c.optIndex === optIndex; });
    if (existing){ existing.qty += qty; }
    else { cart.push({ kitId: kitId, optIndex: optIndex, qty: qty }); }
    renderFloatingCart();
  }

  function cartTotal(){
    return cart.reduce(function(sum, item){
      var kit = findKit(item.kitId);
      var opt = kit.opcoes[item.optIndex];
      return sum + opt.preco * item.qty;
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
    if (count > 0){
      fc.classList.add("show");
      badge.style.display = "flex";
      badge.textContent = count;
    } else {
      fc.classList.remove("show");
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
          return '<div class="cart-item" data-idx="' + idx + '">' +
            '<svg class="cart-item-icon" viewBox="0 0 64 64"><use href="#burger-icon"/></svg>' +
            '<div class="cart-item-info">' +
              '<h4>' + kit.nome + '</h4>' +
              '<span>' + opt.label + ' · ' + brl(opt.preco) + '</span>' +
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

      '<div class="field" id="fieldEndereco" style="display:' + (deliveryType==="entrega"?"block":"none") + '">' +
        '<label>Endereço</label><input type="text" id="inputEndereco" placeholder="Rua, número, bairro"><span class="error-text">Informe o endereço de entrega.</span>' +
      '</div>' +

      '<div class="field" id="fieldTelefone"><label>Telefone</label><input type="tel" id="inputTelefone" placeholder="(00) 00000-0000"><span class="error-text">Informe um telefone válido.</span></div>' +

      '<div class="field"><label>Data desejada de entrega</label><input type="date" id="inputData"><span class="error-text">Escolha uma data.</span></div>' +

      '<div class="field" id="fieldPagamento"><label>Forma de pagamento</label>' +
        '<div class="pay-grid">' +
          '<div class="pay-opt ' + (paymentMethod==="Pix"?"active":"") + '" data-pay="Pix">Pix</div>' +
          '<div class="pay-opt ' + (paymentMethod==="Dinheiro"?"active":"") + '" data-pay="Dinheiro">Dinheiro</div>' +
          '<div class="pay-opt ' + (paymentMethod==="Cartão"?"active":"") + '" data-pay="Cartão">Cartão</div>' +
        '</div>' +
        '<span class="error-text">Escolha a forma de pagamento.</span>' +
      '</div>' +

      '<div class="field"><label>Observações (opcional)</label><textarea id="inputObs" placeholder="Ex: sem cebola, entregar na portaria..."></textarea></div>' +
      '</div>' +
      '<div class="sheet-footer">' +
        '<button class="btn-primary" id="sendOrderBtn">Enviar pedido pelo WhatsApp</button>' +
        '<p class="badge-note">Ao continuar, seu pedido completo será aberto em uma conversa do WhatsApp para confirmação.</p>' +
      '</div>';
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
    document.getElementById("sendOrderBtn").addEventListener("click", trySendOrder);
  }

  function atualizarTipoEntregaUI(){
    document.getElementById("toggleEntrega").classList.toggle("active", deliveryType === "entrega");
    document.getElementById("toggleRetirada").classList.toggle("active", deliveryType === "retirada");
    document.getElementById("fieldEndereco").style.display = deliveryType === "entrega" ? "block" : "none";
  }

  function atualizarPagamentoUI(){
    document.getElementById("checkoutSheet").querySelectorAll("[data-pay]").forEach(function(el){
      el.classList.toggle("active", el.getAttribute("data-pay") === paymentMethod);
    });
  }

  function trySendOrder(){
    var nome = document.getElementById("inputNome").value.trim();
    var endereco = deliveryType === "entrega" ? document.getElementById("inputEndereco").value.trim() : "";
    var telefone = document.getElementById("inputTelefone").value.trim();
    var data = document.getElementById("inputData").value;
    var obs = document.getElementById("inputObs").value.trim();

    var valid = true;
    function setInvalid(fieldId, isInvalid){
      var f = document.getElementById(fieldId);
      if (isInvalid){ f.classList.add("invalid"); valid = false; }
      else { f.classList.remove("invalid"); }
    }
    setInvalid("fieldNome", nome.length === 0);
    if (deliveryType === "entrega") setInvalid("fieldEndereco", endereco.length === 0);
    setInvalid("fieldTelefone", telefone.length < 8);
    setInvalid("fieldPagamento", !paymentMethod);

    var dataField = document.getElementById("inputData");
    if (!data){ dataField.style.borderColor = "var(--red)"; valid = false; }
    else { dataField.style.borderColor = ""; }

    if (!valid){ showToast("Confira os campos destacados"); return; }

    var msg = buildWhatsAppMessage({ nome: nome, endereco: endereco, telefone: telefone, data: data, obs: obs });
    var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
    window.open(url, "_blank");

    cart = [];
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
      lines.push("• " + item.qty + "x " + kit.nome + " (" + opt.label + ") — " + brl(opt.preco * item.qty));
    });
    lines.push("");
    lines.push("*Total: " + brl(cartTotal()) + "*");
    lines.push("");
    lines.push("*Tipo:* " + (deliveryType === "entrega" ? "Entrega" : "Retirada"));
    lines.push("*Nome:* " + data.nome);
    if (deliveryType === "entrega"){ lines.push("*Endereço:* " + data.endereco); }
    lines.push("*Telefone:* " + data.telefone);
    lines.push("*Data desejada:* " + formatDateBR(data.data));
    lines.push("*Pagamento:* " + paymentMethod);
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
  }
})();
