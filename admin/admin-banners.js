(function(){
  "use strict";

  function getClient(){ return window.supabaseClient; }

  var BUCKET = "banners";
  var LARGURA_MAX = 1200;
  var PROPORCAO = 2; // largura / altura (1200 x 600)
  var TAMANHO_MAX_ORIGINAL = 15 * 1024 * 1024;

  var section = document.getElementById("bannersSection");
  if (!section) return;

  var listEl = document.getElementById("bannersList");
  var msgEl = document.getElementById("bannersMsg");
  var btnNovo = document.getElementById("btnNovoBanner");
  var formOverlay = document.getElementById("formOverlay");
  var formCard = document.getElementById("formCard");

  var cache = [];
  var kitsCache = [];
  var editandoId = null;
  var imagemProcessada = null; // { blob, previewUrl, tamanhoKb, cortou, pequena }

  /* ============ HELPERS ============ */
  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function mostrarMsg(texto, erro){
    msgEl.textContent = texto;
    msgEl.style.color = erro ? "var(--red)" : "var(--cream-dim)";
    if (texto){ setTimeout(function(){ msgEl.textContent = ""; }, 3500); }
  }

  function closeForm(){
    formOverlay.classList.remove("open");
    if (imagemProcessada && imagemProcessada.previewUrl){ URL.revokeObjectURL(imagemProcessada.previewUrl); }
    imagemProcessada = null;
  }

  function dataBR(iso){
    return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  function dataParaInput(iso){
    if (!iso) return "";
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(iso));
  }

  function inicioIso(dataStr){ return dataStr ? new Date(dataStr + "T00:00:00-03:00").toISOString() : null; }
  function fimIso(dataStr){ return dataStr ? new Date(dataStr + "T23:59:59-03:00").toISOString() : null; }

  function badge(texto, cor){
    return '<span style="display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; letter-spacing:0.3px; margin-right:8px; background:' + cor + '22; color:' + cor + '; border:1px solid ' + cor + ';">' + texto + '</span>';
  }

  function statusDe(b){
    var agora = Date.now();
    if (!b.ativo) return { txt: "INATIVO", cor: "#8A8A8A" };
    if (b.inicio_em && new Date(b.inicio_em).getTime() > agora) return { txt: "AGENDADO", cor: "#D4AF37" };
    if (b.fim_em && new Date(b.fim_em).getTime() <= agora) return { txt: "EXPIRADO", cor: "#8A8A8A" };
    return { txt: "NO AR", cor: "#5C8A3A" };
  }

  function periodoTxt(b){
    if (b.inicio_em && b.fim_em) return dataBR(b.inicio_em) + " a " + dataBR(b.fim_em);
    if (b.inicio_em) return "A partir de " + dataBR(b.inicio_em);
    if (b.fim_em) return "Até " + dataBR(b.fim_em);
    return "Sem prazo";
  }

  function linkTxt(b){
    if (b.link_tipo === "kit") return "abre um kit";
    if (b.link_tipo === "whatsapp") return "abre o WhatsApp";
    if (b.link_tipo === "url") return "abre um link";
    return "sem link";
  }

  /* ============ LISTA ============ */
  function loadBanners(){
    listEl.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Carregando...</p>';
    getClient()
      .from("banners")
      .select("*")
      .order("ordem", { ascending: true })
      .order("criado_em", { ascending: false })
      .then(function(res){
        if (res.error){
          listEl.innerHTML = '<p style="color:var(--red); font-size:0.85rem;">Erro ao carregar: ' + esc(res.error.message) + '</p>';
          return;
        }
        cache = res.data || [];
        renderLista();
      });
  }
  window.carregarBanners = loadBanners;

  function renderLista(){
    if (cache.length === 0){
      listEl.innerHTML = '<p style="color:var(--cream-dim); font-size:0.85rem;">Nenhum banner ainda. Clique em "+ Novo banner" para criar o primeiro.</p>';
      return;
    }
    listEl.innerHTML = cache.map(function(b, i){
      var st = statusDe(b);
      return (
        '<div class="kit-row ' + (st.txt === "NO AR" ? "" : "inativo") + '" data-id="' + b.id + '">' +
          '<div style="display:flex; align-items:center; gap:12px; min-width:0;">' +
            '<img src="' + esc(b.imagem_url) + '" alt="" style="width:96px; height:48px; object-fit:cover; border-radius:6px; flex-shrink:0;">' +
            '<div class="kit-row-info">' +
              '<h3>' + badge(st.txt, st.cor) + esc(b.titulo) + '</h3>' +
              '<span>' + periodoTxt(b) + ' · ' + linkTxt(b) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="kit-row-actions">' +
            '<button class="icon-btn" title="Mover para cima" data-up="' + b.id + '"' + (i === 0 ? " disabled" : "") + '>↑</button>' +
            '<button class="icon-btn" title="Mover para baixo" data-down="' + b.id + '"' + (i === cache.length - 1 ? " disabled" : "") + '>↓</button>' +
            '<button class="icon-btn" title="Editar" data-edit-banner="' + b.id + '">✎</button>' +
            '<button class="icon-btn" title="' + (b.ativo ? "Desativar" : "Ativar") + '" data-toggle-banner="' + b.id + '">' + (b.ativo ? "👁" : "🚫") + '</button>' +
            '<button class="icon-btn danger" title="Excluir" data-delete-banner="' + b.id + '">🗑</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    listEl.querySelectorAll("[data-up]").forEach(function(btn){
      btn.addEventListener("click", function(){ mover(btn.getAttribute("data-up"), -1); });
    });
    listEl.querySelectorAll("[data-down]").forEach(function(btn){
      btn.addEventListener("click", function(){ mover(btn.getAttribute("data-down"), 1); });
    });
    listEl.querySelectorAll("[data-edit-banner]").forEach(function(btn){
      btn.addEventListener("click", function(){ abrirForm(btn.getAttribute("data-edit-banner")); });
    });
    listEl.querySelectorAll("[data-toggle-banner]").forEach(function(btn){
      btn.addEventListener("click", function(){ alternarAtivo(btn.getAttribute("data-toggle-banner")); });
    });
    listEl.querySelectorAll("[data-delete-banner]").forEach(function(btn){
      btn.addEventListener("click", function(){ excluir(btn.getAttribute("data-delete-banner")); });
    });
  }

  function achar(id){
    return cache.find(function(x){ return x.id === id; });
  }

  function mover(id, direcao){
    var idx = cache.findIndex(function(x){ return x.id === id; });
    var j = idx + direcao;
    if (idx < 0 || j < 0 || j >= cache.length) return;
    var nova = cache.slice();
    var tmp = nova[idx]; nova[idx] = nova[j]; nova[j] = tmp;
    var ops = [];
    nova.forEach(function(item, pos){
      if (item.ordem !== pos){
        ops.push(getClient().from("banners").update({ ordem: pos }).eq("id", item.id));
      }
    });
    Promise.all(ops).then(loadBanners);
  }

  function alternarAtivo(id){
    var b = achar(id);
    if (!b) return;
    getClient().from("banners").update({ ativo: !b.ativo }).eq("id", id).then(function(res){
      if (res.error){ mostrarMsg("Erro ao atualizar: " + res.error.message, true); return; }
      mostrarMsg(b.ativo ? "Banner desativado." : "Banner ativado.");
      loadBanners();
    });
  }

  function excluir(id){
    var b = achar(id);
    if (!b) return;
    if (!confirm('Excluir o banner "' + b.titulo + '"? Essa ação não pode ser desfeita.')) return;
    getClient().from("banners").delete().eq("id", id).then(function(res){
      if (res.error){ mostrarMsg("Erro ao excluir: " + res.error.message, true); return; }
      getClient().storage.from(BUCKET).remove([b.imagem_path]);
      mostrarMsg("Banner excluído.");
      loadBanners();
    });
  }

  /* ============ IMAGEM: recorta em 2:1 e reduz antes de enviar ============ */
  function processarImagem(file){
    return new Promise(function(resolve, reject){
      if (file.size > TAMANHO_MAX_ORIGINAL){
        reject(new Error("A imagem é muito grande (máximo 15 MB)."));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function(){
        var sw = img.naturalWidth, sh = img.naturalHeight;
        var cw, ch;
        if (sw / sh > PROPORCAO){ ch = sh; cw = sh * PROPORCAO; } else { cw = sw; ch = sw / PROPORCAO; }
        var sx = (sw - cw) / 2, sy = (sh - ch) / 2;
        var outW = Math.min(LARGURA_MAX, Math.round(cw));
        var outH = Math.round(outW / PROPORCAO);
        var canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, sx, sy, cw, ch, 0, 0, outW, outH);
        URL.revokeObjectURL(url);
        canvas.toBlob(function(blob){
          if (!blob){ reject(new Error("Não foi possível processar a imagem.")); return; }
          resolve({
            blob: blob,
            previewUrl: URL.createObjectURL(blob),
            tamanhoKb: Math.round(blob.size / 1024),
            cortou: Math.abs(sw / sh - PROPORCAO) > 0.05,
            pequena: cw < 800
          });
        }, "image/jpeg", 0.85);
      };
      img.onerror = function(){
        URL.revokeObjectURL(url);
        reject(new Error("Esse arquivo não é uma imagem válida."));
      };
      img.src = url;
    });
  }

  /* ============ FORMULÁRIO ============ */
  btnNovo.addEventListener("click", function(){ abrirForm(null); });

  function carregarKits(){
    return getClient().from("kits").select("id, nome").order("nome").then(function(res){
      kitsCache = (!res.error && res.data) ? res.data : [];
    });
  }

  function erroForm(texto){
    var el = document.getElementById("fBannerErro");
    if (el){ el.textContent = texto; el.style.color = "var(--red)"; }
  }

  function desenharCampoLink(tipo, valorAtual){
    var wrap = document.getElementById("fBannerLinkWrap");
    if (!wrap) return;
    if (tipo === "kit"){
      wrap.innerHTML =
        '<label>Qual kit abrir</label><select id="fBannerLinkKit"><option value="">Escolha um kit</option>' +
        kitsCache.map(function(k){
          return '<option value="' + esc(k.id) + '"' + (k.id === valorAtual ? " selected" : "") + '>' + esc(k.nome) + '</option>';
        }).join("") + '</select>';
    } else if (tipo === "whatsapp"){
      wrap.innerHTML =
        '<label>Mensagem inicial (opcional)</label>' +
        '<input type="text" id="fBannerLinkTexto" maxlength="200" placeholder="Ex: Olá! Quero a promoção do fim de semana" value="' + esc(valorAtual || "") + '">';
    } else if (tipo === "url"){
      wrap.innerHTML =
        '<label>Endereço (começa com https://)</label>' +
        '<input type="url" id="fBannerLinkUrl" placeholder="https://..." value="' + esc(valorAtual || "") + '">';
    } else {
      wrap.innerHTML = "";
    }
  }

  function abrirForm(id){
    editandoId = id;
    imagemProcessada = null;
    var b = id ? achar(id) : null;

    carregarKits().then(function(){
      formCard.innerHTML =
        '<h2>' + (b ? "Editar banner" : "Novo banner") + '</h2>' +
        '<div class="field"><label>Imagem (ideal: 1200 x 600 px)</label>' +
          '<input type="file" id="fBannerArquivo" accept="image/jpeg,image/png,image/webp">' +
          '<div id="fBannerPreview" style="margin-top:8px;">' +
            (b ? '<img src="' + esc(b.imagem_url) + '" alt="" style="width:100%; aspect-ratio:2 / 1; object-fit:cover; border-radius:10px;">' : '') +
          '</div>' +
          '<span class="hint" style="margin-top:4px; display:block;">' +
            (b ? "Escolha outra imagem só se quiser trocar. " : "") +
            'A imagem é ajustada para a proporção 2:1 (cortando as bordas, se precisar) e reduzida automaticamente.' +
          '</span>' +
        '</div>' +
        '<div class="field"><label>Título (descreve a promoção)</label>' +
          '<input type="text" id="fBannerTitulo" maxlength="80" placeholder="Ex: Combo fim de semana" value="' + esc(b ? b.titulo : "") + '"></div>' +
        '<div class="field"><label>Ao clicar no banner</label><select id="fBannerLinkTipo">' +
          '<option value="nenhum"' + (!b || b.link_tipo === "nenhum" ? " selected" : "") + '>Nada (só mostra a arte)</option>' +
          '<option value="kit"' + (b && b.link_tipo === "kit" ? " selected" : "") + '>Abrir um kit</option>' +
          '<option value="whatsapp"' + (b && b.link_tipo === "whatsapp" ? " selected" : "") + '>Abrir o WhatsApp da loja</option>' +
          '<option value="url"' + (b && b.link_tipo === "url" ? " selected" : "") + '>Abrir um link</option>' +
        '</select></div>' +
        '<div class="field" id="fBannerLinkWrap"></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>Início (opcional)</label><input type="date" id="fBannerInicio" value="' + dataParaInput(b ? b.inicio_em : null) + '"></div>' +
          '<div class="field"><label>Fim (opcional)</label><input type="date" id="fBannerFim" value="' + dataParaInput(b ? b.fim_em : null) + '"></div>' +
        '</div>' +
        '<span class="hint" style="display:block; margin-bottom:10px;">Com data de fim, o banner sai do ar sozinho no fim desse dia.</span>' +
        '<div class="toggle-ativo"><input type="checkbox" id="fBannerAtivo"' + (!b || b.ativo ? " checked" : "") + '><label for="fBannerAtivo" style="margin:0;">Banner ativo (visível no site)</label></div>' +
        '<p class="admin-msg" id="fBannerErro"></p>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn-cancel" id="btnCancelBanner">Cancelar</button>' +
          '<button type="button" class="btn-primary" id="btnSalvarBanner">Salvar</button>' +
        '</div>';

      desenharCampoLink(b ? b.link_tipo : "nenhum", b ? b.link_valor : null);

      document.getElementById("fBannerLinkTipo").addEventListener("change", function(){
        desenharCampoLink(this.value, null);
      });
      document.getElementById("btnCancelBanner").addEventListener("click", closeForm);
      document.getElementById("btnSalvarBanner").addEventListener("click", salvar);

      document.getElementById("fBannerArquivo").addEventListener("change", function(){
        var arquivo = this.files && this.files[0];
        var prev = document.getElementById("fBannerPreview");
        erroForm("");
        if (!arquivo) return;
        prev.innerHTML = '<span class="hint">Processando a imagem...</span>';
        processarImagem(arquivo).then(function(r){
          if (imagemProcessada && imagemProcessada.previewUrl){ URL.revokeObjectURL(imagemProcessada.previewUrl); }
          imagemProcessada = r;
          var avisos = [];
          if (r.cortou) avisos.push("As bordas foram cortadas para caber em 2:1. Confira a prévia.");
          if (r.pequena) avisos.push("A imagem é pequena e pode ficar borrada. O ideal é 1200 x 600 px.");
          prev.innerHTML =
            '<img src="' + r.previewUrl + '" alt="" style="width:100%; aspect-ratio:2 / 1; object-fit:cover; border-radius:10px;">' +
            '<span class="hint" style="display:block; margin-top:4px;">Prévia de como vai aparecer · ' + r.tamanhoKb + ' KB' +
            (avisos.length ? '<br><span style="color:var(--gold);">' + avisos.join("<br>") + '</span>' : '') +
            '</span>';
        }).catch(function(e){
          imagemProcessada = null;
          prev.innerHTML = "";
          erroForm(e.message);
        });
      });

      formOverlay.classList.add("open");
    });
  }

  function salvar(){
    var titulo = document.getElementById("fBannerTitulo").value.trim();
    var tipo = document.getElementById("fBannerLinkTipo").value;
    var inicio = document.getElementById("fBannerInicio").value;
    var fim = document.getElementById("fBannerFim").value;
    var ativo = document.getElementById("fBannerAtivo").checked;
    var linkValor = null;

    if (!titulo){ erroForm("Informe o título do banner."); return; }
    if (!editandoId && !imagemProcessada){ erroForm("Escolha a imagem do banner."); return; }

    if (tipo === "kit"){
      linkValor = document.getElementById("fBannerLinkKit").value;
      if (!linkValor){ erroForm("Escolha o kit que o banner vai abrir."); return; }
    } else if (tipo === "whatsapp"){
      linkValor = document.getElementById("fBannerLinkTexto").value.trim() || null;
    } else if (tipo === "url"){
      linkValor = document.getElementById("fBannerLinkUrl").value.trim();
      if (!/^https:\/\//i.test(linkValor)){ erroForm("O endereço precisa começar com https://"); return; }
    }

    if (inicio && fim && fim < inicio){ erroForm("A data final não pode ser antes da inicial."); return; }

    var btn = document.getElementById("btnSalvarBanner");
    btn.disabled = true;
    btn.textContent = "Salvando...";
    erroForm("");

    function falhar(texto){
      btn.disabled = false;
      btn.textContent = "Salvar";
      erroForm(texto);
    }

    var antigo = editandoId ? achar(editandoId) : null;
    var novoPath = null;
    var novaUrl = null;

    function gravar(){
      var payload = {
        titulo: titulo,
        link_tipo: tipo,
        link_valor: linkValor,
        ativo: ativo,
        inicio_em: inicioIso(inicio),
        fim_em: fimIso(fim)
      };
      if (novoPath){
        payload.imagem_url = novaUrl;
        payload.imagem_path = novoPath;
      }

      var consulta;
      if (editandoId){
        consulta = getClient().from("banners").update(payload).eq("id", editandoId);
      } else {
        var maior = cache.reduce(function(m, x){ return Math.max(m, x.ordem); }, -1);
        payload.ordem = maior + 1;
        consulta = getClient().from("banners").insert(payload);
      }

      consulta.then(function(res){
        if (res.error){
          if (novoPath){ getClient().storage.from(BUCKET).remove([novoPath]); }
          falhar("Erro ao salvar: " + res.error.message);
          return;
        }
        if (novoPath && antigo && antigo.imagem_path){
          getClient().storage.from(BUCKET).remove([antigo.imagem_path]);
        }
        closeForm();
        mostrarMsg("Banner salvo com sucesso!");
        loadBanners();
      });
    }

    if (imagemProcessada){
      novoPath = "banner-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
      getClient().storage.from(BUCKET)
        .upload(novoPath, imagemProcessada.blob, { contentType: "image/jpeg", cacheControl: "31536000" })
        .then(function(up){
          if (up.error){ novoPath = null; falhar("Erro ao enviar a imagem: " + up.error.message); return; }
          novaUrl = getClient().storage.from(BUCKET).getPublicUrl(novoPath).data.publicUrl;
          gravar();
        });
    } else {
      gravar();
    }
  }

})();