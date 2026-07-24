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
      .select("id, nome, descricao, tier, ativo, ordem, kit_opcoes ( id, label, preco, itens, ordem )")
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

    var kitPayload = { nome: nome, descricao: descricao, tier: tier, ativo: ativo };

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

})();