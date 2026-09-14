(function(){
  "use strict";

  function getClient(){ return window.supabaseClient; }

  // TODO: troque pelo link real assim que o site da roleta (roleta.html) estiver publicado
  var ROLETA_URL_BASE = "https://roleta-star-burguer.vercel.app/index.html";

  var TIPOS_PREMIO = [
    { value: "desconto_percentual", label: "Desconto percentual (%)" },
    { value: "desconto_fixo", label: "Desconto fixo (R$)" },
    { value: "frete_gratis", label: "Frete grátis" },
    { value: "brinde", label: "Brinde" }
  ];

  var premiosRoletaCache = [];
  var editingPremioRoletaId = null;

  /* ===== elementos compartilhados do admin (já existem no HTML) ===== */
  var formOverlay = document.getElementById("formOverlay");
  var formCard = document.getElementById("formCard");
  function closeForm(){ formOverlay.classList.remove("open"); }

  /* ===== elementos das seções novas ===== */
  var roletaGirosSection = document.getElementById("roletaGirosSection");
  var roletaPremiosSection = document.getElementById("roletaPremiosSection");
      var roletaHistoricoSection = document.getElementById("roletaHistoricoSection");
  var pedidosSection = document.getElementById("pedidosSection");

  var roletaGirosMsg = document.getElementById("roletaGirosMsg");
  var roletaPremiosMsg = document.getElementById("roletaPremiosMsg");
  var roletaHistoricoMsg = document.getElementById("roletaHistoricoMsg");

  var roletaPremiosList = document.getElementById("roletaPremiosList");
  var roletaHistoricoList = document.getElementById("roletaHistoricoList");

  function showMsgEm(el, text, isError){
    el.textContent = text;
    el.style.color = isError ? "var(--red)" : "var(--cream-dim)";
    if (text){ setTimeout(function(){ el.textContent = ""; }, 3000); }
  }

  /* ============================================================
     CONTROLE DE ABAS (cobre as antigas + as 3 novas, pra nunca
     ficar mais de uma seção visível ao mesmo tempo)
     ============================================================ */
  var TODAS_SECOES = [
    { tabId: "tabKits", sectionEl: document.getElementById("kitsSection") },
    { tabId: "tabCupons", sectionEl: document.getElementById("cupomsSection") },
    { tabId: "tabPromocoes", sectionEl: document.getElementById("promocoesSection") },
    { tabId: "tabAdicionais", sectionEl: document.getElementById("adicionaisSection") },
    { tabId: "tabRoletaGiros", sectionEl: roletaGirosSection },
    { tabId: "tabRoletaPremios", sectionEl: roletaPremiosSection },
        { tabId: "tabRoletaHistorico", sectionEl: roletaHistoricoSection },
    { tabId: "tabPedidos", sectionEl: pedidosSection }
  ];

  function ativarAba(tabIdAlvo){
    TODAS_SECOES.forEach(function(item){
      var btn = document.getElementById(item.tabId);
      var ativa = item.tabId === tabIdAlvo;
      if (btn) btn.classList.toggle("active", ativa);
      if (item.sectionEl) item.sectionEl.classList.toggle("hidden", !ativa);
    });
  }

  TODAS_SECOES.forEach(function(item){
    var btn = document.getElementById(item.tabId);
    if (!btn) return;
    btn.addEventListener("click", function(){
      ativarAba(item.tabId);
      if (item.tabId === "tabRoletaPremios") loadPremiosRoleta();
            if (item.tabId === "tabRoletaHistorico") loadHistoricoRoleta();
      if (item.tabId === "tabPedidos") loadPedidos();
    });
  });

  /* ============================================================
     GIROS — gerar novo token e compartilhar
     ============================================================ */
  var rgTelefone = document.getElementById("rgTelefone");
  var btnGerarGiro = document.getElementById("btnGerarGiro");
  var rgResultado = document.getElementById("rgResultado");
  var rgLinkTexto = document.getElementById("rgLinkTexto");
  var btnCopiarLink = document.getElementById("btnCopiarLink");
  var btnCompartilharLink = document.getElementById("btnCompartilharLink");

  function limparTelefone(v){
    return (v || "").replace(/\D/g, "");
  }

  btnGerarGiro.addEventListener("click", function(){
    var telefone = limparTelefone(rgTelefone.value);
    if (telefone.length < 10 || telefone.length > 11){
      showMsgEm(roletaGirosMsg, "Digite um telefone válido (DDD + número).", true);
      return;
    }
    btnGerarGiro.disabled = true;
    btnGerarGiro.textContent = "Gerando...";

    getClient().from("roleta_tokens").insert({ telefone: telefone }).select("token").single().then(function(res){
      btnGerarGiro.disabled = false;
      btnGerarGiro.textContent = "Gerar giro";
      if (res.error){
        showMsgEm(roletaGirosMsg, "Erro ao gerar giro: " + res.error.message, true);
        return;
      }
      var link = ROLETA_URL_BASE + "?token=" + res.data.token;
      rgLinkTexto.textContent = link;
      rgResultado.classList.remove("hidden");
      showMsgEm(roletaGirosMsg, "Giro gerado com sucesso!");
    });
  });

  btnCopiarLink.addEventListener("click", function(){
    var link = rgLinkTexto.textContent;
    if (!link) return;
    navigator.clipboard.writeText(link).then(function(){
      showMsgEm(roletaGirosMsg, "Link copiado!");
    }).catch(function(){
      showMsgEm(roletaGirosMsg, "Não foi possível copiar automaticamente. Selecione o link manualmente.", true);
    });
  });

  btnCompartilharLink.addEventListener("click", function(){
    var link = rgLinkTexto.textContent;
    if (!link) return;
        if (navigator.share){
      navigator.share({
        title: "🎁 Roleta Star Burguer",
        text: "🔥 Você ganhou 1 giro GRÁTIS na Roleta de Prêmios da Star Burguer! Desconto, frete grátis ou brinde podem ser seus 🎉 Vale só uma vez, então corre e gira agora:",
        url: link
      }).catch(function(){ /* usuário cancelou o compartilhamento, sem problema */ });
    } else {
      navigator.clipboard.writeText(link).then(function(){
        showMsgEm(roletaGirosMsg, "Seu navegador não suporta compartilhamento direto. Link copiado para você colar onde quiser.");
      });
    }
  });

  /* ============================================================
     PRÊMIOS — listar, criar, editar, ativar/desativar, excluir
     ============================================================ */
  function loadPremiosRoleta(){
    roletaPremiosList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    getClient()
      .from("roleta_premios")
      .select("id, nome, tipo, valor, peso, ativo")
      .order("peso", { ascending: false })
      .then(function(res){
        if (res.error){
          roletaPremiosList.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + res.error.message + '</p>';
          return;
        }
        premiosRoletaCache = res.data || [];
        renderPremiosRoletaList();
      });
  }

  function tipoLabel(tipo){
    var t = TIPOS_PREMIO.find(function(x){ return x.value === tipo; });
    return t ? t.label : tipo;
  }

  function renderPremiosRoletaList(){
    if (premiosRoletaCache.length === 0){
      roletaPremiosList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum prêmio cadastrado ainda.</p>';
      return;
    }
    var somaPesos = premiosRoletaCache
      .filter(function(p){ return p.ativo; })
      .reduce(function(acc, p){ return acc + p.peso; }, 0);

    roletaPremiosList.innerHTML = premiosRoletaCache.map(function(p){
      var chance = (p.ativo && somaPesos > 0)
        ? ((p.peso / somaPesos) * 100).toFixed(1) + "% de chance"
        : "inativo, fora do sorteio";
      return (
        '<div class="kit-row ' + (p.ativo ? "" : "inativo") + '" data-id="' + p.id + '">' +
          '<div class="kit-row-info">' +
            '<h3>' + p.nome + '</h3>' +
            '<span>' + tipoLabel(p.tipo) + ' · peso ' + p.peso + ' · ' + chance + '</span>' +
          '</div>' +
          '<div class="kit-row-actions">' +
            '<button class="icon-btn" title="Editar" data-edit-premio="' + p.id + '">✎</button>' +
            '<button class="icon-btn" title="' + (p.ativo ? "Desativar" : "Ativar") + '" data-toggle-premio="' + p.id + '">' + (p.ativo ? "👁" : "🚫") + '</button>' +
            '<button class="icon-btn danger" title="Excluir" data-delete-premio="' + p.id + '">🗑</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    roletaPremiosList.querySelectorAll("[data-edit-premio]").forEach(function(btn){
      btn.addEventListener("click", function(){ abrirFormPremio(btn.getAttribute("data-edit-premio")); });
    });
    roletaPremiosList.querySelectorAll("[data-toggle-premio]").forEach(function(btn){
      btn.addEventListener("click", function(){ toggleAtivoPremio(btn.getAttribute("data-toggle-premio")); });
    });
    roletaPremiosList.querySelectorAll("[data-delete-premio]").forEach(function(btn){
      btn.addEventListener("click", function(){ deletePremioRoleta(btn.getAttribute("data-delete-premio")); });
    });
  }

  function toggleAtivoPremio(id){
    var p = premiosRoletaCache.find(function(x){ return x.id === id; });
    if (!p) return;
    getClient().from("roleta_premios").update({ ativo: !p.ativo }).eq("id", id).then(function(res){
      if (res.error){ showMsgEm(roletaPremiosMsg, "Erro ao atualizar: " + res.error.message, true); return; }
      showMsgEm(roletaPremiosMsg, "Prêmio atualizado.");
      loadPremiosRoleta();
    });
  }

  function deletePremioRoleta(id){
    var p = premiosRoletaCache.find(function(x){ return x.id === id; });
    if (!p) return;
    if (!confirm('Excluir o prêmio "' + p.nome + '"? Essa ação não pode ser desfeita.')) return;
    getClient().from("roleta_premios").delete().eq("id", id).then(function(res){
      if (res.error){ showMsgEm(roletaPremiosMsg, "Erro ao excluir: " + res.error.message, true); return; }
      showMsgEm(roletaPremiosMsg, "Prêmio excluído.");
      loadPremiosRoleta();
    });
  }

  document.getElementById("btnNovoPremioRoleta").addEventListener("click", function(){ abrirFormPremio(null); });

  function abrirFormPremio(id){
    editingPremioRoletaId = id;
    var p = id ? premiosRoletaCache.find(function(x){ return x.id === id; }) : null;

    formCard.innerHTML =
      '<h2>' + (p ? "Editar prêmio" : "Novo prêmio") + '</h2>' +
      '<div class="field"><label>Nome do prêmio</label><input type="text" id="fPremioNome" value="' + (p ? p.nome.replace(/"/g,"&quot;") : "") + '" placeholder="Ex: 10% de desconto no próximo pedido"></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Tipo</label><select id="fPremioTipo">' +
          TIPOS_PREMIO.map(function(t){ return '<option value="' + t.value + '" ' + (p && p.tipo === t.value ? "selected" : "") + '>' + t.label + '</option>'; }).join("") +
        '</select></div>' +
        '<div class="field"><label>Valor (% ou R$, deixe em branco se for brinde/frete)</label><input type="number" step="0.01" id="fPremioValor" value="' + (p && p.valor != null ? p.valor : "") + '" placeholder="Ex: 10"></div>' +
      '</div>' +
      '<div class="field"><label>Peso (chance relativa — use, por exemplo, de 1 a 100)</label><input type="number" step="1" min="1" id="fPremioPeso" value="' + (p ? p.peso : 10) + '"></div>' +
      '<div class="toggle-ativo"><input type="checkbox" id="fPremioAtivo" ' + (!p || p.ativo ? "checked" : "") + '><label for="fPremioAtivo" style="margin:0;">Prêmio ativo (entra no sorteio)</label></div>' +
      '<div class="form-actions">' +
        '<button type="button" class="btn-cancel" id="btnCancelForm">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="btnSavePremioForm">Salvar</button>' +
      '</div>';

    document.getElementById("btnCancelForm").addEventListener("click", closeForm);
    document.getElementById("btnSavePremioForm").addEventListener("click", salvarPremioForm);
    formOverlay.classList.add("open");
  }

  function salvarPremioForm(){
    var nome = document.getElementById("fPremioNome").value.trim();
    var tipo = document.getElementById("fPremioTipo").value;
    var valorStr = document.getElementById("fPremioValor").value;
    var peso = parseInt(document.getElementById("fPremioPeso").value, 10);
    var ativo = document.getElementById("fPremioAtivo").checked;

    if (!nome){ showMsgEm(roletaPremiosMsg, "Informe o nome do prêmio.", true); return; }
    if (isNaN(peso) || peso <= 0){ showMsgEm(roletaPremiosMsg, "Informe um peso válido (maior que zero).", true); return; }

    var valor = valorStr.trim() === "" ? null : parseFloat(valorStr);
    if (valorStr.trim() !== "" && isNaN(valor)){ showMsgEm(roletaPremiosMsg, "Valor inválido.", true); return; }

    var payload = { nome: nome, tipo: tipo, valor: valor, peso: peso, ativo: ativo };

    var query = editingPremioRoletaId
      ? getClient().from("roleta_premios").update(payload).eq("id", editingPremioRoletaId)
      : getClient().from("roleta_premios").insert(payload);

    query.then(function(res){
      if (res.error){ showMsgEm(roletaPremiosMsg, "Erro ao salvar: " + res.error.message, true); return; }
      closeForm();
      showMsgEm(roletaPremiosMsg, "Prêmio salvo com sucesso!");
      loadPremiosRoleta();
    });
  }

  /* ============================================================
     HISTÓRICO — lista de giros realizados
     ============================================================ */
  function loadHistoricoRoleta(){
    roletaHistoricoList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    getClient()
      .from("roleta_tokens")
            .select("id, telefone, nome_cliente, status, criado_em, girado_em, resgatado, roleta_premios ( nome )")
      .order("criado_em", { ascending: false })
      .limit(200)
      .then(function(res){
        if (res.error){
          roletaHistoricoList.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + res.error.message + '</p>';
          return;
        }
        renderHistoricoRoleta(res.data || []);
      });
  }

  function formatarData(iso){
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

    function badgeStatus(texto, cor){
    return '<span style="display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; letter-spacing:0.3px; margin-right:8px; background:' + cor + '22; color:' + cor + '; border:1px solid ' + cor + ';">' + texto + '</span>';
  }

  function renderHistoricoRoleta(giros){
    if (giros.length === 0){
      roletaHistoricoList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum giro gerado ainda.</p>';
      return;
    }
    roletaHistoricoList.innerHTML = giros.map(function(g){
      var badge, detalheTxt;
      if (g.status === "disponivel"){
        badge = badgeStatus("AGUARDANDO GIRO", "#A99B8C");
        detalheTxt = "";
      } else if (g.resgatado){
        badge = badgeStatus("USADO", "#5C8A3A");
        detalheTxt = (g.roleta_premios ? g.roleta_premios.nome : "prêmio");
      } else {
        badge = badgeStatus("PENDENTE", "#D4AF37");
        detalheTxt = (g.roleta_premios ? g.roleta_premios.nome : "prêmio");
      }
      return (
        '<div class="kit-row">' +
          '<div class="kit-row-info">' +
            '<h3>' + badge + g.telefone + (g.nome_cliente ? " · " + g.nome_cliente : "") + '</h3>' +
            '<span>' + detalheTxt + (detalheTxt ? ' · ' : '') + 'gerado em ' + formatarData(g.criado_em) + (g.girado_em ? " · girou em " + formatarData(g.girado_em) : "") + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }
  /* ============================================================
     PEDIDOS — histórico agrupado por telefone
     ============================================================ */
  var pedidosList = document.getElementById("pedidosList");
  var pedidosMsg = document.getElementById("pedidosMsg");
  var todosPedidosCache = [];

    var filtroPedidosAtual = "todos";

  function loadPedidos(){
    pedidosList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    getClient()
      .from("pedidos")
      .select("id, telefone, nome_cliente, itens, valor_total, criado_em")
      .order("criado_em", { ascending: false })
      .limit(500)
      .then(function(res){
        if (res.error){
          pedidosList.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + res.error.message + '</p>';
          return;
        }
        todosPedidosCache = res.data || [];
        aplicarFiltroPedidos();
      });
  }

  document.querySelectorAll("#pedidosFiltroRow [data-filtro]").forEach(function(btn){
    btn.addEventListener("click", function(){
      filtroPedidosAtual = btn.getAttribute("data-filtro");
      document.querySelectorAll("#pedidosFiltroRow [data-filtro]").forEach(function(b){
        b.classList.toggle("active", b === btn);
      });
      aplicarFiltroPedidos();
    });
  });

  function dentroDoFiltro(dataIso, filtro){
    var data = new Date(dataIso);
    var agora = new Date();
    if (filtro === "todos") return true;
    if (filtro === "hoje"){
      return data.toDateString() === agora.toDateString();
    }
    if (filtro === "semana"){
      var seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
      return data >= seteDiasAtras;
    }
    if (filtro === "mes"){
      return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
    }
    return true;
  }

      function aplicarFiltroPedidos(){
    var filtrados = todosPedidosCache.filter(function(p){
      return dentroDoFiltro(p.criado_em, filtroPedidosAtual);
    });
    renderTop3(filtrados);
    renderTopKits(filtrados);
    renderClientesAgrupados(filtrados);
  }

  function renderTopKits(pedidosFiltrados){
    var el = document.getElementById("pedidosTopKits");
    if (!el) return;
    if (pedidosFiltrados.length === 0){ el.innerHTML = ""; return; }

    var porKit = {};
    pedidosFiltrados.forEach(function(p){
      (p.itens || []).forEach(function(it){
        if (!porKit[it.kit]) porKit[it.kit] = 0;
        porKit[it.kit] += it.qtd || 1;
      });
    });

    var ranking = Object.keys(porKit).map(function(nome){
      return { nome: nome, qtd: porKit[nome] };
    }).sort(function(a, b){ return b.qtd - a.qtd; }).slice(0, 3);

    if (ranking.length === 0){ el.innerHTML = ""; return; }

    var medalhas = ["🥇", "🥈", "🥉"];
    el.innerHTML =
      '<h3 style="font-size:0.95rem; color:var(--gold); margin-bottom:10px;">Kits mais pedidos</h3>' +
      '<div style="display:flex; flex-wrap:wrap; gap:10px;">' +
        ranking.map(function(r, i){
          return '<div class="kit-row" style="flex:1; min-width:180px;">' +
            '<div class="kit-row-info">' +
              '<h3>' + medalhas[i] + ' ' + r.nome + '</h3>' +
              '<span>' + r.qtd + ' unidade(s) pedida(s)</span>' +
            '</div>' +
          '</div>';
        }).join("") +
      '</div>';
  }

  function renderTop3(pedidosFiltrados){
    var top3El = document.getElementById("pedidosTop3");
    if (pedidosFiltrados.length === 0){ top3El.innerHTML = ""; return; }

    var porTelefone = {};
    pedidosFiltrados.forEach(function(p){
      if (!porTelefone[p.telefone]) porTelefone[p.telefone] = { telefone: p.telefone, nome: p.nome_cliente || "—", qtd: 0 };
      porTelefone[p.telefone].qtd++;
    });

    var ranking = Object.keys(porTelefone).map(function(tel){ return porTelefone[tel]; })
      .sort(function(a, b){ return b.qtd - a.qtd; })
      .slice(0, 3);

    var medalhas = ["🥇", "🥈", "🥉"];

    top3El.innerHTML =
      '<h3 style="font-size:0.95rem; color:var(--gold); margin-bottom:10px;">Top 3 clientes</h3>' +
      '<div style="display:flex; flex-wrap:wrap; gap:10px;">' +
        ranking.map(function(r, i){
          return '<div class="kit-row" style="flex:1; min-width:180px;">' +
            '<div class="kit-row-info">' +
              '<h3>' + medalhas[i] + ' ' + r.nome + '</h3>' +
              '<span>' + r.telefone + ' · ' + r.qtd + ' pedido(s)</span>' +
            '</div>' +
          '</div>';
        }).join("") +
      '</div>';
  }

  function renderClientesAgrupados(pedidosFiltrados){
    if (pedidosFiltrados.length === 0){
      pedidosList.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum pedido neste período.</p>';
      return;
    }
    var porTelefone = {};
    pedidosFiltrados.forEach(function(p){
      if (!porTelefone[p.telefone]) porTelefone[p.telefone] = [];
      porTelefone[p.telefone].push(p);
    });

    var telefones = Object.keys(porTelefone).sort(function(a, b){
      return new Date(porTelefone[b][0].criado_em) - new Date(porTelefone[a][0].criado_em);
    });

    pedidosList.innerHTML = telefones.map(function(tel){
      var pedidosDoCliente = porTelefone[tel];
      var nome = pedidosDoCliente[0].nome_cliente || "—";
      return (
        '<div class="kit-row" data-tel="' + tel + '" style="cursor:pointer;">' +
          '<div class="kit-row-info">' +
            '<h3>' + nome + ' · ' + tel + '</h3>' +
            '<span>' + pedidosDoCliente.length + ' pedido(s) · último em ' + formatarData(pedidosDoCliente[0].criado_em) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    pedidosList.querySelectorAll("[data-tel]").forEach(function(el){
      var tel = el.getAttribute("data-tel");
      el.addEventListener("click", function(){ abrirDetalhePedidosCliente(tel, porTelefone[tel]); });
    });
  }

  function abrirDetalhePedidosCliente(tel, pedidosDoCliente){
    var itensHtml = pedidosDoCliente.map(function(p){
      var itensTxt = (p.itens || []).map(function(it){
        return it.qtd + "x " + it.kit + " (" + it.opcao + ")" + (it.adicionais && it.adicionais.length ? " + " + it.adicionais.join(", ") : "");
      }).join("<br>");
      return (
        '<div class="kit-row">' +
          '<div class="kit-row-info">' +
            '<h3>' + formatarData(p.criado_em) + ' · R$ ' + Number(p.valor_total).toFixed(2).replace(".", ",") + '</h3>' +
            '<span>' + itensTxt + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    formCard.innerHTML =
      '<h2>Pedidos de ' + tel + '</h2>' +
      '<div style="max-height:400px; overflow-y:auto; margin:16px 0;">' + itensHtml + '</div>' +
      '<div class="form-actions">' +
        '<button type="button" class="btn-cancel" id="btnFecharDetalhePedidos">Fechar</button>' +
      '</div>';

    document.getElementById("btnFecharDetalhePedidos").addEventListener("click", closeForm);
    formOverlay.classList.add("open");
  }

})();