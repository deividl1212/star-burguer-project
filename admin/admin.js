(function(){
  "use strict";

  var CFG = window.STAR_BURGUER_CONFIG || {};
  var SUPABASE_URL = CFG.SUPABASE_URL || "SUA_URL_DO_SUPABASE";
  var SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || "SUA_CHAVE_ANON_DO_SUPABASE";

  if (SUPABASE_URL.indexOf("SUA_URL") !== -1){
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;color:#fbf1de;background:#0c0a0a;text-align:center;">' +
      '<div><h2 style="font-family:Anton,sans-serif;">Supabase ainda não configurado</h2>' +
      '<p style="color:#cbbfa9;max-width:360px;">Preencha as credenciais reais no arquivo <code>config.js</code>, na raiz do projeto, antes de acessar o painel administrativo.</p></div></div>';
    return;
  }

  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // O Supabase Auth funciona com e-mail. Para o cliente poder logar só com um
  // "usuário" (sem parecer e-mail), completamos automaticamente com este domínio interno.
  var DOMINIO_LOGIN = "@painel-starburguer.local";
  function usuarioParaEmail(usuario){
    usuario = (usuario || "").trim().toLowerCase();
    return usuario.indexOf("@") !== -1 ? usuario : usuario + DOMINIO_LOGIN;
  }

  var TIERS = [
    { value: "bronze", label: "Bronze" },
    { value: "prata", label: "Prata" },
    { value: "ouro", label: "Ouro" },
    { value: "premium", label: "Premium" }
  ];

  var kitsCache = [];
  var editingKitId = null; // null = criando novo kit

  /* ============ ELEMENTOS ============ */
  var loginScreen = document.getElementById("loginScreen");
  var dashboard = document.getElementById("dashboard");
  var loginError = document.getElementById("loginError");
  var adminMsg = document.getElementById("adminMsg");
  var kitsList = document.getElementById("kitsList");
  var formOverlay = document.getElementById("formOverlay");
  var formCard = document.getElementById("formCard");
  var kitsSection = document.getElementById("kitsSection");
  var cupomsSection = document.getElementById("cupomsSection");
  var cupomsList = document.getElementById("cupomsList");
  var cupomMsgAdmin = document.getElementById("cupomMsgAdmin");

  var cupomsCache = [];
  var editingCupomId = null;

  var promocoesSection = document.getElementById("promocoesSection");
  var promocoesList = document.getElementById("promocoesList");
  var promocaoMsgAdmin = document.getElementById("promocaoMsgAdmin");
  var promocoesCache = [];
  var editingPromocaoId = null;

  var adicionaisSection = document.getElementById("adicionaisSection");
  var adicionalMsgAdmin = document.getElementById("adicionalMsgAdmin");
  var adicionaisCache = [];
  var editingAdicionalId = null;
  function showMsg(text, isError){
    adminMsg.textContent = text;
    adminMsg.style.color = isError ? "var(--red)" : "var(--cream-dim)";
    if (text){ setTimeout(function(){ adminMsg.textContent = ""; }, 3000); }
  }

  /* ============ AUTENTICAÇÃO ============ */
  function goToLogin(){
    dashboard.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }
  function goToDashboard(){
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadKits();
  }

  document.getElementById("btnLogin").addEventListener("click", function(){
    var usuario = document.getElementById("loginUsuario").value.trim();
    var senha = document.getElementById("loginSenha").value;
    loginError.textContent = "";
    if (!usuario || !senha){
      loginError.textContent = "Preencha usuário e senha.";
      return;
    }
    var email = usuarioParaEmail(usuario);
    supabase.auth.signInWithPassword({ email: email, password: senha }).then(function(res){
      if (res.error){
        loginError.textContent = "Usuário ou senha inválidos.";
        return;
      }
      goToDashboard();
    });
  });

  document.getElementById("btnLogout").addEventListener("click", function(){
    supabase.auth.signOut().then(function(){ goToLogin(); });
  });

  // Mantém a sessão entre recarregamentos de página
  supabase.auth.getSession().then(function(res){
    if (res.data && res.data.session){ goToDashboard(); }
    else { goToLogin(); }
  });

  /* ============ LISTAGEM DE KITS ============ */
  function loadKits(){
    kitsList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    supabase
      .from("kits")
      .select("id, nome, descricao, tier, ativo, ordem, destaque, kit_opcoes ( id, label, preco, itens, ordem )")
      .order("destaque", { ascending: false })
      .order("ordem", { ascending: true })
      .then(function(res){
        if (res.error){
          kitsList.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + res.error.message + '</p>';
          return;
        }
        kitsCache = res.data || [];
        renderKitsList();
      });
  }

  function renderKitsList(){
    if (kitsCache.length === 0){
      kitsList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum kit cadastrado ainda. Clique em "+ Novo kit" para começar.</p>';
      return;
    }
    kitsList.innerHTML = kitsCache.map(function(kit){
      var opcoes = (kit.kit_opcoes || []).slice().sort(function(a,b){ return a.ordem - b.ordem; });
      var precos = opcoes.map(function(o){ return Number(o.preco); });
      var faixaPreco = precos.length > 1
        ? "R$ " + Math.min.apply(null, precos).toFixed(2).replace(".", ",") + " – R$ " + Math.max.apply(null, precos).toFixed(2).replace(".", ",")
        : (precos.length === 1 ? "R$ " + precos[0].toFixed(2).replace(".", ",") : "sem preço definido");

      return (
        '<div class="kit-row ' + (kit.ativo ? "" : "inativo") + '" data-id="' + kit.id + '">' +
          '<div class="kit-row-info">' +
           '<h3>' + kit.nome + '</h3>' +
            '<span>' + faixaPreco + ' · ' + opcoes.length + ' opção(ões) · ' + (kit.ativo ? "Ativo" : "Inativo") + '</span>' +
          '</div>' +
          '<div class="kit-row-actions">' +
            '<button class="icon-btn" title="Editar" data-edit="' + kit.id + '">✎</button>' +
            '<button class="icon-btn" title="' + (kit.ativo ? "Desativar" : "Ativar") + '" data-toggle="' + kit.id + '">' + (kit.ativo ? "👁" : "🚫") + '</button>' +
            '<button class="icon-btn danger" title="Excluir" data-delete="' + kit.id + '">🗑</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    kitsList.querySelectorAll("[data-edit]").forEach(function(btn){
      btn.addEventListener("click", function(){ openForm(btn.getAttribute("data-edit")); });
    });
    kitsList.querySelectorAll("[data-toggle]").forEach(function(btn){
      btn.addEventListener("click", function(){ toggleAtivo(btn.getAttribute("data-toggle")); });
    });
    kitsList.querySelectorAll("[data-delete]").forEach(function(btn){
      btn.addEventListener("click", function(){ deleteKit(btn.getAttribute("data-delete")); });
    });
  }

  function toggleAtivo(kitId){
    var kit = kitsCache.find(function(k){ return k.id === kitId; });
    if (!kit) return;
    supabase.from("kits").update({ ativo: !kit.ativo }).eq("id", kitId).then(function(res){
      if (res.error){ showMsg("Erro ao atualizar: " + res.error.message, true); return; }
      showMsg("Kit atualizado.");
      loadKits();
    });
  }

  function deleteKit(kitId){
    var kit = kitsCache.find(function(k){ return k.id === kitId; });
    if (!kit) return;
    if (!confirm('Excluir o kit "' + kit.nome + '"? Essa ação não pode ser desfeita.')) return;
    supabase.from("kits").delete().eq("id", kitId).then(function(res){
      if (res.error){ showMsg("Erro ao excluir: " + res.error.message, true); return; }
      showMsg("Kit excluído.");
      loadKits();
    });
  }

  /* ============ FORMULÁRIO (criar/editar) ============ */
  document.getElementById("btnNovoKit").addEventListener("click", function(){ openForm(null); });
  formOverlay.addEventListener("click", function(e){ if (e.target === this) closeForm(); });

  document.getElementById("tabKits").addEventListener("click", function(){
    document.getElementById("tabKits").classList.add("active");
    document.getElementById("tabCupons").classList.remove("active");
    kitsSection.classList.remove("hidden");
    cupomsSection.classList.add("hidden");
  });
 document.getElementById("tabCupons").addEventListener("click", function(){
    setActiveTab("tabCupons");
    cupomsSection.classList.remove("hidden");
    kitsSection.classList.add("hidden");
    promocoesSection.classList.add("hidden");
    loadCupons();
  });
 document.getElementById("tabPromocoes").addEventListener("click", function(){
    setActiveTab("tabPromocoes");
    promocoesSection.classList.remove("hidden");
    kitsSection.classList.add("hidden");
    cupomsSection.classList.add("hidden");
    adicionaisSection.classList.add("hidden");
    loadPromocoes();
  });
  document.getElementById("tabAdicionais").addEventListener("click", function(){
    setActiveTab("tabAdicionais");
    adicionaisSection.classList.remove("hidden");
    kitsSection.classList.add("hidden");
    cupomsSection.classList.add("hidden");
    promocoesSection.classList.add("hidden");
    loadAdicionais();
  });
  function setActiveTab(id){
    ["tabKits","tabCupons","tabPromocoes","tabAdicionais"].forEach(function(t){
      document.getElementById(t).classList.toggle("active", t === id);
    });
  }
  document.getElementById("tabKits").addEventListener("click", function(){
    setActiveTab("tabKits");
    kitsSection.classList.remove("hidden");
    cupomsSection.classList.add("hidden");
    promocoesSection.classList.add("hidden");
    adicionaisSection.classList.add("hidden");
  });
  document.getElementById("btnNovoCupom").addEventListener("click", function(){ openCupomForm(null); });
  document.getElementById("btnNovaPromocao").addEventListener("click", function(){ openPromocaoForm(null); });
  document.getElementById("btnNovoAdicional").addEventListener("click", function(){ openAdicionalForm(null); });

  function closeForm(){
    formOverlay.classList.remove("open");
  }

  function opcaoCardHTML(opcao, idx){
    opcao = opcao || { label: "", preco: "", itens: [] };
    var itensTexto = (opcao.itens || []).join("\n");
    return (
      '<div class="opcao-card" data-idx="' + idx + '">' +
        (idx > 0 ? '<button type="button" class="opcao-remove" data-remove-opcao="' + idx + '">remover opção</button>' : '') +
        '<div class="form-row">' +
          '<div class="field"><label>Rótulo da opção</label><input type="text" class="opcao-label" value="' + (opcao.label || "").replace(/"/g,"&quot;") + '" placeholder="Ex: 6 Carnes"></div>' +
          '<div class="field"><label>Preço (R$)</label><input type="number" step="0.01" class="opcao-preco" value="' + (opcao.preco !== "" ? opcao.preco : "") + '" placeholder="0,00"></div>' +
        '</div>' +
        '<div class="field"><label>Itens inclusos (um por linha)</label><textarea class="opcao-itens" rows="4" placeholder="6 Carnes Bovina de 160g&#10;6 Pães Brioche&#10;Molhos">' + itensTexto + '</textarea></div>' +
      '</div>'
    );
  }

  function openForm(kitId){
    editingKitId = kitId;
    var kit = kitId ? kitsCache.find(function(k){ return k.id === kitId; }) : null;
    var opcoesIniciais = kit ? (kit.kit_opcoes || []).slice().sort(function(a,b){ return a.ordem - b.ordem; }) : [null];

    formCard.innerHTML =
      '<h2>' + (kit ? "Editar kit" : "Novo kit") + '</h2>' +
      '<div class="field"><label>Nome do kit</label><input type="text" id="fNome" value="' + (kit ? kit.nome.replace(/"/g,"&quot;") : "") + '" placeholder="Ex: Kit Clássico"></div>' +
      '<div class="field"><label>Descrição</label><textarea id="fDescricao" rows="3" placeholder="Descrição que aparece no cardápio">' + (kit ? kit.descricao : "") + '</textarea></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Nível (cor no site)</label><select id="fTier">' +
          TIERS.map(function(t){ return '<option value="' + t.value + '" ' + (kit && kit.tier === t.value ? "selected" : "") + '>' + t.label + '</option>'; }).join("") +
        '</select></div>' +
      '</div>' +
     '<div class="toggle-ativo"><input type="checkbox" id="fAtivo" ' + (!kit || kit.ativo ? "checked" : "") + '><label for="fAtivo" style="margin:0;">Kit ativo (visível no site)</label></div>' +
      '<div class="toggle-ativo"><input type="checkbox" id="fDestaque" ' + (kit && kit.destaque ? "checked" : "") + '><label for="fDestaque" style="margin:0;">⭐ Destaque (Oferta da Semana)</label></div>' +

      '<div class="opcoes-title">Opções de preço</div>' +
      '<p class="hint">Cada opção é uma variação de tamanho/preço do mesmo kit (ex: 6 carnes vs 10 carnes). Todo kit precisa de pelo menos uma opção.</p>' +
      '<div id="opcoesContainer">' + opcoesIniciais.map(function(o, i){ return opcaoCardHTML(o, i); }).join("") + '</div>' +
      '<button type="button" class="btn-add-opcao" id="btnAddOpcao">+ adicionar outra opção de preço</button>' +

      '<div class="form-actions">' +
        '<button type="button" class="btn-cancel" id="btnCancelForm">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="btnSaveForm">Salvar</button>' +
      '</div>';

    document.getElementById("btnCancelForm").addEventListener("click", closeForm);
    document.getElementById("btnAddOpcao").addEventListener("click", function(){
      var container = document.getElementById("opcoesContainer");
      var novoIdx = container.children.length;
      var div = document.createElement("div");
      div.innerHTML = opcaoCardHTML(null, novoIdx);
      container.appendChild(div.firstElementChild);
      bindRemoveOpcaoButtons();
    });
    bindRemoveOpcaoButtons();

    document.getElementById("btnSaveForm").addEventListener("click", saveForm);
    formOverlay.classList.add("open");
  }

  function bindRemoveOpcaoButtons(){
    document.querySelectorAll("[data-remove-opcao]").forEach(function(btn){
      btn.onclick = function(){
        btn.closest(".opcao-card").remove();
      };
    });
  }

  function saveForm(){
    var nome = document.getElementById("fNome").value.trim();
    var descricao = document.getElementById("fDescricao").value.trim();
    var tier = document.getElementById("fTier").value;
    var ativo = document.getElementById("fAtivo").checked;
    var destaque = document.getElementById("fDestaque").checked;

    if (!nome){ showMsg("Informe o nome do kit.", true); return; }

    var opcaoCards = document.querySelectorAll("#opcoesContainer .opcao-card");
    var opcoes = [];
    var opcoesValidas = true;
    opcaoCards.forEach(function(card, i){
      var label = card.querySelector(".opcao-label").value.trim();
      var precoStr = card.querySelector(".opcao-preco").value;
      var itensTexto = card.querySelector(".opcao-itens").value;
      var preco = parseFloat(precoStr);
      if (!label || isNaN(preco)){ opcoesValidas = false; }
      var itens = itensTexto.split("\n").map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });
      opcoes.push({ label: label, preco: preco, itens: itens, ordem: i });
    });

    if (!opcoesValidas || opcoes.length === 0){
      showMsg("Preencha rótulo e preço em todas as opções.", true);
      return;
    }

   var kitPayload = { nome: nome, descricao: descricao, tier: tier, ativo: ativo, destaque: destaque };

    if (editingKitId){
      supabase.from("kits").update(kitPayload).eq("id", editingKitId).then(function(res){
        if (res.error){ showMsg("Erro ao salvar: " + res.error.message, true); return; }
        salvarOpcoes(editingKitId, opcoes);
      });
    } else {
      supabase.from("kits").insert(kitPayload).select().single().then(function(res){
        if (res.error){ showMsg("Erro ao salvar: " + res.error.message, true); return; }
        salvarOpcoes(res.data.id, opcoes);
      });
    }
  }

  function salvarOpcoes(kitId, opcoes){
    // Abordagem simples: apaga as opções antigas e insere as atuais do formulário
    supabase.from("kit_opcoes").delete().eq("kit_id", kitId).then(function(res){
      if (res.error){ showMsg("Erro ao salvar opções: " + res.error.message, true); return; }
      var novasOpcoes = opcoes.map(function(o){
        return { kit_id: kitId, label: o.label, preco: o.preco, itens: o.itens, ordem: o.ordem };
      });
      supabase.from("kit_opcoes").insert(novasOpcoes).then(function(res2){
        if (res2.error){ showMsg("Erro ao salvar opções: " + res2.error.message, true); return; }
        closeForm();
        showMsg("Kit salvo com sucesso!");
        loadKits();
      });
    });
  }

/* ============ CUPONS ============ */
  var TIPOS_DESCONTO = [
    { value: "percentual", label: "Percentual (%)" },
    { value: "fixo", label: "Valor fixo (R$)" }
  ];

  function loadCupons(){
    cupomsList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    supabase
      .from("cupons")
      .select("id, codigo, tipo_desconto, valor, aplica_todos_kits, kits_aplicaveis, limite_uso_por_telefone, ativo, criado_em")
      .order("criado_em", { ascending: false })
      .then(function(res){
        if (res.error){
          cupomsList.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + res.error.message + '</p>';
          return;
        }
        cupomsCache = res.data || [];
        renderCupomsList();
      });
  }

  function renderCupomsList(){
    if (cupomsCache.length === 0){
      cupomsList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum cupom cadastrado ainda. Clique em "+ Novo cupom" para começar.</p>';
      return;
    }
    cupomsList.innerHTML = cupomsCache.map(function(c){
      var descontoTxt = c.tipo_desconto === "percentual" ? (Number(c.valor) + "%") : ("R$ " + Number(c.valor).toFixed(2).replace(".", ","));
      var abrangenciaTxt = c.aplica_todos_kits ? "Todos os kits" : ((c.kits_aplicaveis || []).length + " kit(s) específico(s)");
      return (
        '<div class="kit-row ' + (c.ativo ? "" : "inativo") + '" data-id="' + c.id + '">' +
          '<div class="kit-row-info">' +
            '<h3>' + c.codigo + '</h3>' +
            '<span>-' + descontoTxt + ' · ' + abrangenciaTxt + ' · limite ' + c.limite_uso_por_telefone + 'x por telefone · ' + (c.ativo ? "Ativo" : "Inativo") + '</span>' +
          '</div>' +
          '<div class="kit-row-actions">' +
            '<button class="icon-btn" title="Editar" data-edit-cupom="' + c.id + '">✎</button>' +
            '<button class="icon-btn" title="' + (c.ativo ? "Desativar" : "Ativar") + '" data-toggle-cupom="' + c.id + '">' + (c.ativo ? "👁" : "🚫") + '</button>' +
            '<button class="icon-btn danger" title="Excluir" data-delete-cupom="' + c.id + '">🗑</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    cupomsList.querySelectorAll("[data-edit-cupom]").forEach(function(btn){
      btn.addEventListener("click", function(){ openCupomForm(btn.getAttribute("data-edit-cupom")); });
    });
    cupomsList.querySelectorAll("[data-toggle-cupom]").forEach(function(btn){
      btn.addEventListener("click", function(){ toggleAtivoCupom(btn.getAttribute("data-toggle-cupom")); });
    });
    cupomsList.querySelectorAll("[data-delete-cupom]").forEach(function(btn){
      btn.addEventListener("click", function(){ deleteCupom(btn.getAttribute("data-delete-cupom")); });
    });
  }

  function toggleAtivoCupom(cupomId){
    var c = cupomsCache.find(function(x){ return x.id === cupomId; });
    if (!c) return;
    supabase.from("cupons").update({ ativo: !c.ativo }).eq("id", cupomId).then(function(res){
      if (res.error){ showCupomMsg("Erro ao atualizar: " + res.error.message, true); return; }
      showCupomMsg("Cupom atualizado.");
      loadCupons();
    });
  }

  function deleteCupom(cupomId){
    var c = cupomsCache.find(function(x){ return x.id === cupomId; });
    if (!c) return;
    if (!confirm('Excluir o cupom "' + c.codigo + '"? Essa ação não pode ser desfeita.')) return;
    supabase.from("cupons").delete().eq("id", cupomId).then(function(res){
      if (res.error){ showCupomMsg("Erro ao excluir: " + res.error.message, true); return; }
      showCupomMsg("Cupom excluído.");
      loadCupons();
    });
  }

  function showCupomMsg(text, isError){
    cupomMsgAdmin.textContent = text;
    cupomMsgAdmin.style.color = isError ? "var(--red)" : "var(--cream-dim)";
    if (text){ setTimeout(function(){ cupomMsgAdmin.textContent = ""; }, 3000); }
  }

  function openCupomForm(cupomId){
    editingCupomId = cupomId;
    var c = cupomId ? cupomsCache.find(function(x){ return x.id === cupomId; }) : null;
    var kitsCheckboxes = kitsCache.map(function(k){
      var checked = c && (c.kits_aplicaveis || []).indexOf(k.id) !== -1 ? "checked" : "";
      return '<label class="cupom-kit-check"><input type="checkbox" class="cupomKitCheckbox" value="' + k.id + '" ' + checked + '> ' + k.nome + '</label>';
    }).join("");

    formCard.innerHTML =
      '<h2>' + (c ? "Editar cupom" : "Novo cupom") + '</h2>' +
      '<div class="field"><label>Código do cupom</label><input type="text" id="fCodigo" value="' + (c ? c.codigo.replace(/"/g,"&quot;") : "") + '" placeholder="Ex: BEMVINDO10" style="text-transform:uppercase;"></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Tipo de desconto</label><select id="fTipoDesconto">' +
          TIPOS_DESCONTO.map(function(t){ return '<option value="' + t.value + '" ' + (c && c.tipo_desconto === t.value ? "selected" : "") + '>' + t.label + '</option>'; }).join("") +
        '</select></div>' +
        '<div class="field"><label>Valor</label><input type="number" step="0.01" id="fValor" value="' + (c ? c.valor : "") + '" placeholder="Ex: 10"></div>' +
      '</div>' +
      '<div class="field"><label>Limite de uso por telefone</label><input type="number" step="1" min="1" id="fLimiteUso" value="' + (c ? c.limite_uso_por_telefone : 1) + '"></div>' +
      '<div class="toggle-ativo"><input type="checkbox" id="fAplicaTodos" ' + (!c || c.aplica_todos_kits ? "checked" : "") + '><label for="fAplicaTodos" style="margin:0;">Aplica a todos os kits</label></div>' +
      '<div class="field" id="fieldKitsEspecificos" style="display:' + (c && !c.aplica_todos_kits ? "block" : "none") + ';">' +
        '<label>Kits específicos</label>' +
        '<div class="cupom-kits-list">' + (kitsCheckboxes || '<p class="hint" style="margin:0;">Nenhum kit cadastrado ainda.</p>') + '</div>' +
      '</div>' +
      '<div class="toggle-ativo"><input type="checkbox" id="fCupomAtivo" ' + (!c || c.ativo ? "checked" : "") + '><label for="fCupomAtivo" style="margin:0;">Cupom ativo</label></div>' +

      '<div class="form-actions">' +
        '<button type="button" class="btn-cancel" id="btnCancelForm">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="btnSaveCupomForm">Salvar</button>' +
      '</div>';

    document.getElementById("btnCancelForm").addEventListener("click", closeForm);
    document.getElementById("fAplicaTodos").addEventListener("change", function(){
      document.getElementById("fieldKitsEspecificos").style.display = this.checked ? "none" : "block";
    });
    document.getElementById("btnSaveCupomForm").addEventListener("click", saveCupomForm);
    formOverlay.classList.add("open");
  }

  function saveCupomForm(){
    var codigo = document.getElementById("fCodigo").value.trim().toUpperCase();
    var tipoDesconto = document.getElementById("fTipoDesconto").value;
    var valor = parseFloat(document.getElementById("fValor").value);
    var limiteUso = parseInt(document.getElementById("fLimiteUso").value, 10);
    var aplicaTodos = document.getElementById("fAplicaTodos").checked;
    var ativo = document.getElementById("fCupomAtivo").checked;

    if (!codigo){ showCupomMsg("Informe o código do cupom.", true); return; }
    if (isNaN(valor) || valor <= 0){ showCupomMsg("Informe um valor de desconto válido.", true); return; }
    if (isNaN(limiteUso) || limiteUso <= 0){ showCupomMsg("Informe um limite de uso válido.", true); return; }

    var kitsAplicaveis = [];
    if (!aplicaTodos){
      document.querySelectorAll(".cupomKitCheckbox:checked").forEach(function(chk){
        kitsAplicaveis.push(chk.value);
      });
      if (kitsAplicaveis.length === 0){ showCupomMsg("Selecione pelo menos um kit, ou marque 'Aplica a todos os kits'.", true); return; }
    }

    var payload = {
      codigo: codigo,
      tipo_desconto: tipoDesconto,
      valor: valor,
      limite_uso_por_telefone: limiteUso,
      aplica_todos_kits: aplicaTodos,
      kits_aplicaveis: kitsAplicaveis,
      ativo: ativo
    };

    var query = editingCupomId
      ? supabase.from("cupons").update(payload).eq("id", editingCupomId)
      : supabase.from("cupons").insert(payload);

    query.then(function(res){
      if (res.error){
        var msg = res.error.message.indexOf("duplicate") !== -1 || res.error.message.indexOf("unique") !== -1
          ? "Já existe um cupom com esse código."
          : "Erro ao salvar: " + res.error.message;
        showCupomMsg(msg, true);
        return;
      }
      closeForm();
      showCupomMsg("Cupom salvo com sucesso!");
      loadCupons();
    });
  }

/* ============ PROMOÇÕES (BRINDE) ============ */
  function loadPromocoes(){
    promocoesList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    supabase
      .from("promocoes")
      .select("id, titulo, descricao, item_brinde, quantidade_brinde, aplica_todos_kits, kits_aplicaveis, texto_validade, ativo, criado_em")
      .order("criado_em", { ascending: false })
      .then(function(res){
        if (res.error){
          promocoesList.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + res.error.message + '</p>';
          return;
        }
        promocoesCache = res.data || [];
        renderPromocoesList();
      });
  }

  function renderPromocoesList(){
    if (promocoesCache.length === 0){
      promocoesList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhuma promoção cadastrada ainda. Clique em "+ Nova promoção" para começar.</p>';
      return;
    }
    promocoesList.innerHTML = promocoesCache.map(function(p){
      var abrangenciaTxt = p.aplica_todos_kits ? "Todos os kits" : ((p.kits_aplicaveis || []).length + " kit(s) específico(s)");
      return (
        '<div class="kit-row ' + (p.ativo ? "" : "inativo") + '" data-id="' + p.id + '">' +
          '<div class="kit-row-info">' +
            '<h3>' + p.titulo + '</h3>' +
            '<span>🎁 ' + p.quantidade_brinde + 'x ' + p.item_brinde + ' · ' + abrangenciaTxt + ' · ' + (p.ativo ? "Ativa" : "Inativa") + '</span>' +
          '</div>' +
          '<div class="kit-row-actions">' +
            '<button class="icon-btn" title="Editar" data-edit-promo="' + p.id + '">✎</button>' +
            '<button class="icon-btn" title="' + (p.ativo ? "Desativar" : "Ativar") + '" data-toggle-promo="' + p.id + '">' + (p.ativo ? "👁" : "🚫") + '</button>' +
            '<button class="icon-btn danger" title="Excluir" data-delete-promo="' + p.id + '">🗑</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    promocoesList.querySelectorAll("[data-edit-promo]").forEach(function(btn){
      btn.addEventListener("click", function(){ openPromocaoForm(btn.getAttribute("data-edit-promo")); });
    });
    promocoesList.querySelectorAll("[data-toggle-promo]").forEach(function(btn){
      btn.addEventListener("click", function(){ toggleAtivoPromocao(btn.getAttribute("data-toggle-promo")); });
    });
    promocoesList.querySelectorAll("[data-delete-promo]").forEach(function(btn){
      btn.addEventListener("click", function(){ deletePromocao(btn.getAttribute("data-delete-promo")); });
    });
  }

  function toggleAtivoPromocao(promoId){
    var p = promocoesCache.find(function(x){ return x.id === promoId; });
    if (!p) return;
    supabase.from("promocoes").update({ ativo: !p.ativo }).eq("id", promoId).then(function(res){
      if (res.error){ showPromocaoMsg("Erro ao atualizar: " + res.error.message, true); return; }
      showPromocaoMsg("Promoção atualizada.");
      loadPromocoes();
    });
  }

  function deletePromocao(promoId){
    var p = promocoesCache.find(function(x){ return x.id === promoId; });
    if (!p) return;
    if (!confirm('Excluir a promoção "' + p.titulo + '"? Essa ação não pode ser desfeita.')) return;
    supabase.from("promocoes").delete().eq("id", promoId).then(function(res){
      if (res.error){ showPromocaoMsg("Erro ao excluir: " + res.error.message, true); return; }
      showPromocaoMsg("Promoção excluída.");
      loadPromocoes();
    });
  }

  function showPromocaoMsg(text, isError){
    promocaoMsgAdmin.textContent = text;
    promocaoMsgAdmin.style.color = isError ? "var(--red)" : "var(--cream-dim)";
    if (text){ setTimeout(function(){ promocaoMsgAdmin.textContent = ""; }, 3000); }
  }

  function openPromocaoForm(promoId){
    editingPromocaoId = promoId;
    var p = promoId ? promocoesCache.find(function(x){ return x.id === promoId; }) : null;
    var kitsCheckboxes = kitsCache.map(function(k){
      var checked = p && (p.kits_aplicaveis || []).indexOf(k.id) !== -1 ? "checked" : "";
      return '<label class="cupom-kit-check"><input type="checkbox" class="promoKitCheckbox" value="' + k.id + '" ' + checked + '> ' + k.nome + '</label>';
    }).join("");

    formCard.innerHTML =
      '<h2>' + (p ? "Editar promoção" : "Nova promoção") + '</h2>' +
      '<div class="field"><label>Título (aparece no banner)</label><input type="text" id="fTitulo" value="' + (p ? p.titulo.replace(/"/g,"&quot;") : "") + '" placeholder="Ex: Super Promoção"></div>' +
      '<div class="field"><label>Descrição (opcional)</label><textarea id="fDescricao" rows="2" placeholder="Ex: Na compra de qualquer kit com 6 ou 10 unidades">' + (p && p.descricao ? p.descricao : "") + '</textarea></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Item do brinde</label><input type="text" id="fItemBrinde" value="' + (p ? p.item_brinde.replace(/"/g,"&quot;") : "") + '" placeholder="Ex: Refrigerante 2L"></div>' +
        '<div class="field"><label>Quantidade</label><input type="number" step="1" min="1" id="fQuantidadeBrinde" value="' + (p ? p.quantidade_brinde : 1) + '"></div>' +
      '</div>' +
      '<div class="field"><label>Texto de validade (opcional)</label><input type="text" id="fTextoValidade" value="' + (p && p.texto_validade ? p.texto_validade.replace(/"/g,"&quot;") : "") + '" placeholder="Ex: até 26/07 ou enquanto durarem os estoques"></div>' +
      '<div class="toggle-ativo"><input type="checkbox" id="fPromoAplicaTodos" ' + (!p || p.aplica_todos_kits ? "checked" : "") + '><label for="fPromoAplicaTodos" style="margin:0;">Aplica a todos os kits</label></div>' +
      '<div class="field" id="fieldPromoKitsEspecificos" style="display:' + (p && !p.aplica_todos_kits ? "block" : "none") + ';">' +
        '<label>Kits específicos</label>' +
        '<div class="cupom-kits-list">' + (kitsCheckboxes || '<p class="hint" style="margin:0;">Nenhum kit cadastrado ainda.</p>') + '</div>' +
      '</div>' +
      '<div class="toggle-ativo"><input type="checkbox" id="fPromoAtivo" ' + (!p || p.ativo ? "checked" : "") + '><label for="fPromoAtivo" style="margin:0;">Promoção ativa (visível no site)</label></div>' +

      '<div class="form-actions">' +
        '<button type="button" class="btn-cancel" id="btnCancelForm">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="btnSavePromocaoForm">Salvar</button>' +
      '</div>';

    document.getElementById("btnCancelForm").addEventListener("click", closeForm);
    document.getElementById("fPromoAplicaTodos").addEventListener("change", function(){
      document.getElementById("fieldPromoKitsEspecificos").style.display = this.checked ? "none" : "block";
    });
    document.getElementById("btnSavePromocaoForm").addEventListener("click", savePromocaoForm);
    formOverlay.classList.add("open");
  }

  function savePromocaoForm(){
    var titulo = document.getElementById("fTitulo").value.trim();
    var descricao = document.getElementById("fDescricao").value.trim();
    var itemBrinde = document.getElementById("fItemBrinde").value.trim();
    var quantidadeBrinde = parseInt(document.getElementById("fQuantidadeBrinde").value, 10);
    var textoValidade = document.getElementById("fTextoValidade").value.trim();
    var aplicaTodos = document.getElementById("fPromoAplicaTodos").checked;
    var ativo = document.getElementById("fPromoAtivo").checked;

    if (!titulo){ showPromocaoMsg("Informe o título da promoção.", true); return; }
    if (!itemBrinde){ showPromocaoMsg("Informe o item do brinde.", true); return; }
    if (isNaN(quantidadeBrinde) || quantidadeBrinde <= 0){ showPromocaoMsg("Informe uma quantidade válida.", true); return; }

    var kitsAplicaveis = [];
    if (!aplicaTodos){
      document.querySelectorAll(".promoKitCheckbox:checked").forEach(function(chk){
        kitsAplicaveis.push(chk.value);
      });
      if (kitsAplicaveis.length === 0){ showPromocaoMsg("Selecione pelo menos um kit, ou marque 'Aplica a todos os kits'.", true); return; }
    }

    var payload = {
      titulo: titulo,
      descricao: descricao,
      item_brinde: itemBrinde,
      quantidade_brinde: quantidadeBrinde,
      texto_validade: textoValidade,
      aplica_todos_kits: aplicaTodos,
      kits_aplicaveis: kitsAplicaveis,
      ativo: ativo
    };

    var query = editingPromocaoId
      ? supabase.from("promocoes").update(payload).eq("id", editingPromocaoId)
      : supabase.from("promocoes").insert(payload);

    query.then(function(res){
      if (res.error){ showPromocaoMsg("Erro ao salvar: " + res.error.message, true); return; }
      closeForm();
      showPromocaoMsg("Promoção salva com sucesso!");
      loadPromocoes();
    });
  }

/* ============ ADICIONAIS (KITS 6 E 10) ============ */
  function loadAdicionais(){
    var list2 = document.getElementById("adicionais2List");
    var list6 = document.getElementById("adicionais6List");
    var list10 = document.getElementById("adicionais10List");
    list2.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    list6.innerHTML = "";
    list10.innerHTML = "";
    supabase
      .from("adicionais")
      .select("id, nome, preco, tamanho, ordem, ativo")
      .order("tamanho", { ascending: true })
      .order("ordem", { ascending: true })
      .then(function(res){
        if (res.error){
          list6.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + res.error.message + '</p>';
          return;
        }
        adicionaisCache = res.data || [];
        renderAdicionaisList();
      });
  }

  function renderAdicionaisList(){
    var list2 = document.getElementById("adicionais2List");
    var list6 = document.getElementById("adicionais6List");
    var list10 = document.getElementById("adicionais10List");
    var itens2 = adicionaisCache.filter(function(a){ return a.tamanho === "2"; });
    var itens6 = adicionaisCache.filter(function(a){ return a.tamanho === "6"; });
    var itens10 = adicionaisCache.filter(function(a){ return a.tamanho === "10"; });

    function itemHTML(a){
      return (
        '<div class="kit-row ' + (a.ativo ? "" : "inativo") + '" data-id="' + a.id + '">' +
          '<div class="kit-row-info">' +
            '<h3>' + a.nome + '</h3>' +
            '<span>R$ ' + Number(a.preco).toFixed(2).replace(".", ",") + ' · ' + (a.ativo ? "Ativo" : "Inativo") + '</span>' +
          '</div>' +
          '<div class="kit-row-actions">' +
            '<button class="icon-btn" title="Editar" data-edit-adic="' + a.id + '">✎</button>' +
            '<button class="icon-btn" title="' + (a.ativo ? "Desativar" : "Ativar") + '" data-toggle-adic="' + a.id + '">' + (a.ativo ? "👁" : "🚫") + '</button>' +
            '<button class="icon-btn danger" title="Excluir" data-delete-adic="' + a.id + '">🗑</button>' +
          '</div>' +
        '</div>'
      );
    }

   list2.innerHTML = itens2.length ? itens2.map(itemHTML).join("") : '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum adicional cadastrado para kits de 2.</p>';
    list6.innerHTML = itens6.length ? itens6.map(itemHTML).join("") : '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum adicional cadastrado para kits de 6.</p>';
    list10.innerHTML = itens10.length ? itens10.map(itemHTML).join("") : '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum adicional cadastrado para kits de 10.</p>';

    document.querySelectorAll("[data-edit-adic]").forEach(function(btn){
      btn.addEventListener("click", function(){ openAdicionalForm(btn.getAttribute("data-edit-adic")); });
    });
    document.querySelectorAll("[data-toggle-adic]").forEach(function(btn){
      btn.addEventListener("click", function(){ toggleAtivoAdicional(btn.getAttribute("data-toggle-adic")); });
    });
    document.querySelectorAll("[data-delete-adic]").forEach(function(btn){
      btn.addEventListener("click", function(){ deleteAdicional(btn.getAttribute("data-delete-adic")); });
    });
  }

  function toggleAtivoAdicional(id){
    var a = adicionaisCache.find(function(x){ return x.id === id; });
    if (!a) return;
    supabase.from("adicionais").update({ ativo: !a.ativo }).eq("id", id).then(function(res){
      if (res.error){ showAdicionalMsg("Erro ao atualizar: " + res.error.message, true); return; }
      showAdicionalMsg("Adicional atualizado.");
      loadAdicionais();
    });
  }

  function deleteAdicional(id){
    var a = adicionaisCache.find(function(x){ return x.id === id; });
    if (!a) return;
    if (!confirm('Excluir o adicional "' + a.nome + '"? Essa ação não pode ser desfeita.')) return;
    supabase.from("adicionais").delete().eq("id", id).then(function(res){
      if (res.error){ showAdicionalMsg("Erro ao excluir: " + res.error.message, true); return; }
      showAdicionalMsg("Adicional excluído.");
      loadAdicionais();
    });
  }

  function showAdicionalMsg(text, isError){
    adicionalMsgAdmin.textContent = text;
    adicionalMsgAdmin.style.color = isError ? "var(--red)" : "var(--cream-dim)";
    if (text){ setTimeout(function(){ adicionalMsgAdmin.textContent = ""; }, 3000); }
  }

  function openAdicionalForm(id){
    editingAdicionalId = id;
    var a = id ? adicionaisCache.find(function(x){ return x.id === id; }) : null;

    formCard.innerHTML =
      '<h2>' + (a ? "Editar adicional" : "Novo adicional") + '</h2>' +
      '<div class="field"><label>Nome do adicional</label><input type="text" id="fAdicNome" value="' + (a ? a.nome.replace(/"/g,"&quot;") : "") + '" placeholder="Ex: Bacon, 12 fatias"></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Preço (R$)</label><input type="number" step="0.01" id="fAdicPreco" value="' + (a ? a.preco : "") + '" placeholder="0,00"></div>' +
        '<div class="field"><label>Para qual kit</label><select id="fAdicTamanho">' +
          '<option value="2" ' + (a && a.tamanho === "2" ? "selected" : "") + '>Kits de 2</option>' +
          '<option value="6" ' + (a && a.tamanho === "6" ? "selected" : "") + '>Kits de 6</option>' +
          '<option value="10" ' + (a && a.tamanho === "10" ? "selected" : "") + '>Kits de 10</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="toggle-ativo"><input type="checkbox" id="fAdicAtivo" ' + (!a || a.ativo ? "checked" : "") + '><label for="fAdicAtivo" style="margin:0;">Adicional ativo</label></div>' +

      '<div class="form-actions">' +
        '<button type="button" class="btn-cancel" id="btnCancelForm">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="btnSaveAdicionalForm">Salvar</button>' +
      '</div>';

    document.getElementById("btnCancelForm").addEventListener("click", closeForm);
    document.getElementById("btnSaveAdicionalForm").addEventListener("click", saveAdicionalForm);
    formOverlay.classList.add("open");
  }

  function saveAdicionalForm(){
    var nome = document.getElementById("fAdicNome").value.trim();
    var preco = parseFloat(document.getElementById("fAdicPreco").value);
    var tamanho = document.getElementById("fAdicTamanho").value;
    var ativo = document.getElementById("fAdicAtivo").checked;

    if (!nome){ showAdicionalMsg("Informe o nome do adicional.", true); return; }
    if (isNaN(preco) || preco < 0){ showAdicionalMsg("Informe um preço válido.", true); return; }

    var payload = { nome: nome, preco: preco, tamanho: tamanho, ativo: ativo };

    var query = editingAdicionalId
      ? supabase.from("adicionais").update(payload).eq("id", editingAdicionalId)
      : supabase.from("adicionais").insert(payload);

    query.then(function(res){
      if (res.error){ showAdicionalMsg("Erro ao salvar: " + res.error.message, true); return; }
      closeForm();
      showAdicionalMsg("Adicional salvo com sucesso!");
      loadAdicionais();
    });
  }

})();