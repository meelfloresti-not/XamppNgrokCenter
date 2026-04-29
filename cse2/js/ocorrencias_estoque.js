// =============================================
// OCORRÊNCIAS DE ESTOQUE - CSE2
// Depende: registros, alertas (app.js) | escHtml, showToast (ui.js)
// =============================================

function renderOcorrenciasEstoque() {
    const container = document.getElementById('ocorrenciasContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim)">Calculando ocorrências...</div>';

    // Calcular grupos
    const grupos = {};
    registros.filter(r => !r.deletado).forEach(r => {
        const key = r.material + '|||' + r.local;
        if (!grupos[key]) grupos[key] = { material: r.material, local: r.local, tipoMaterial: r.tipoMaterial, entrada: 0, saida: 0 };
        if (r.tipo === 'Entrada') grupos[key].entrada += r.qtd;
        else grupos[key].saida += r.qtd;
    });

    const lista = [];
    Object.entries(grupos).forEach(([key, g]) => {
        const al = alertas[key];
        if (!al || (!al.medio && !al.minimo)) return;
        const saldo = g.entrada - g.saida;
        const nivel = al.minimo > 0 && saldo <= al.minimo ? 'vermelho'
                    : al.medio > 0 && saldo <= al.medio ? 'amarelo' : null;
        if (!nivel) return;
        // Encontrar índice no _cardMap para botões de ação
        const ci = _cardMap.findIndex(c => c.material === g.material && c.local === g.local);
        lista.push({ ...g, saldo, nivel, alerta: al, ci });
    });

    // Vermelho primeiro, depois amarelo; dentro de cada grupo, alfabético
    lista.sort((a, b) => {
        if (a.nivel !== b.nivel) return a.nivel === 'vermelho' ? -1 : 1;
        return a.material.localeCompare(b.material);
    });

    atualizarBadgeOcorrencias();

    if (!lista.length) {
        container.innerHTML = `
          <div style="text-align:center;padding:60px;border:2px dashed var(--border);border-radius:8px">
            <div style="font-size:36px">✨</div>
            <div style="color:var(--text-dim);margin-top:8px;font-family:var(--font-mono);font-size:12px;letter-spacing:2px">
              NENHUMA OCORRÊNCIA DE ESTOQUE
            </div>
            <div style="color:var(--text-muted);margin-top:6px;font-size:12px">
              Configure alertas nos cards de produto para monitorar o estoque.
            </div>
          </div>`;
        return;
    }

    container.innerHTML = '';
    lista.forEach(item => container.appendChild(criarCardAlertaEstoque(item)));
}

function criarCardAlertaEstoque(item) {
    const card = document.createElement('div');
    card.className = 'ocorrencia-card';

    const isVerm = item.nivel === 'vermelho';
    const borderColor = isVerm ? 'var(--red)' : 'var(--amber)';
    const bgColor = isVerm ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)';
    const badgeColor = isVerm ? '#ef4444' : '#f59e0b';
    const badgeBg = isVerm ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
    const badgeLabel = isVerm ? '🔴 ESTOQUE CRÍTICO' : '🟡 ESTOQUE BAIXO';
    const limiteLabel = isVerm ? 'Mínimo configurado' : 'Médio configurado';
    const limiteVal = isVerm ? item.alerta.minimo : item.alerta.medio;

    const pct = Math.max(0, Math.min(100, (item.saldo / limiteVal) * 100));
    const progressColor = isVerm ? 'var(--red)' : 'var(--amber)';

    // Botões de ação só aparecem se o produto já foi renderizado na aba Produtos
    const temCi = item.ci >= 0;
    const btnBaixa = temCi ? `<button class="btn btn-baixa-rapida" onclick="switchTab('produtos');setTimeout(()=>abrirModalBaixa(${item.ci}),150)" style="font-size:10px;padding:5px 10px">▼ Baixa</button>` : '';
    const btnMover = temCi ? `<button class="btn btn-mover-produto" onclick="switchTab('produtos');setTimeout(()=>abrirModalMover(${item.ci}),150)" style="font-size:10px;padding:5px 10px">↔ Mover</button>` : '';

    card.style.cssText = `border-left:4px solid ${borderColor};background:${bgColor};border-radius:8px;padding:20px;margin-bottom:12px;animation:fadeIn 0.2s ease;${isVerm ? 'animation:fadeIn 0.2s ease,alertPulse 3s ease infinite;' : ''}`;

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);letter-spacing:1px">${escHtml(item.tipoMaterial)} • ${escHtml(item.local)}</div>
          <div style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--text);margin-top:4px">${escHtml(item.material)}</div>
        </div>
        <span style="background:${badgeBg};color:${badgeColor};padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;font-family:var(--font-mono);white-space:nowrap">${badgeLabel}</span>
      </div>
      <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
        <div>
          <div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:${badgeColor}">${item.saldo}</div>
          <div style="font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase">Saldo Atual</div>
        </div>
        <div>
          <div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--text-dim)">${limiteVal}</div>
          <div style="font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase">${limiteLabel}</div>
        </div>
        <div>
          <div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--text-dim)">${item.alerta.medio||'—'}</div>
          <div style="font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase">Nível Médio</div>
        </div>
      </div>
      <div style="margin-top:12px;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${progressColor};border-radius:2px;transition:width 0.4s"></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        ${btnBaixa}${btnMover}
      </div>`;

    return card;
}
