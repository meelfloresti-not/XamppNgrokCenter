    // ══════════════════════════════════════════════════════
    //  DATA LAYER
    // ══════════════════════════════════════════════════════
    const KEYS = { fuel: 'fleetctrl_fuel', maint: 'fleetctrl_maint' };

    function loadData(key) {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); }
      catch { return []; }
    }

    function saveData(key, arr) {
      localStorage.setItem(key, JSON.stringify(arr));
    }

    function getFuel() { return loadData(KEYS.fuel); }
    function getMaint() { return loadData(KEYS.maint); }

    function saveFuel(arr) { saveData(KEYS.fuel, arr); }
    function saveMaint(arr) { saveData(KEYS.maint, arr); }

    let charts = {};

    // ── NAVIGATION ───────────────────────────────────────
    function showPage(id) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      document.getElementById('page-' + id).classList.add('active');
      [...document.querySelectorAll('nav button')].find(b => b.getAttribute('onclick').includes("'" + id + "'"))?.classList.add('active');

      if (id === 'dashboard') renderDashboard();
      if (id === 'abastecimento') renderRecentTable();
      if (id === 'saidas') renderSaidas();
      if (id === 'manutencao') { renderMaintTable(); setToday('m-date'); }
      if (id === 'historico') renderHistorico();
    }

    // ── HELPERS ───────────────────────────────────────────
    function fmt(n, d = 2) { return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
    function fmtBRL(n) { return 'R$ ' + fmt(n, 2); }
    function setToday(id) {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = new Date().toISOString().split('T')[0];
    }
    function nowTime(id) {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = new Date().toTimeString().slice(0, 5);
    }

    function toast(msg, type = 'success') {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.borderLeftColor = type === 'error' ? 'var(--red)' : 'var(--success)';
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    function carBadge(car) {
      if (car === 'Kangoo') return '<span class="badge badge-kangoo">Kangoo</span>';
      if (car === 'Fiorino') return '<span class="badge badge-fiorino">Fiorino</span>';
      return car;
    }

    function fuelBadge(f) {
      const map = { 'Gasolina': 'gas', 'Diesel': 'diesel', 'Etanol': 'etanol', 'GNV': 'gnv' };
      return `<span class="badge badge-${map[f] || 'gas'}">${f}</span>`;
    }

    function filterByDate(arr, from, to, dateKey = 'date') {
      return arr.filter(r => {
        const d = r[dateKey];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    // ══════════════════════════════════════════════════════
    //  ABASTECIMENTO FORM
    // ══════════════════════════════════════════════════════
    function saveAbastecimento() {
      const get = id => document.getElementById(id).value.trim();
      const date = get('f-date'), time = get('f-time'), person = get('f-person'),
        car = get('f-car'), fuel = get('f-fuel'),
        qty = parseFloat(get('f-qty')), value = parseFloat(get('f-value')),
        kmS = parseFloat(get('f-km-start')), kmE = parseFloat(get('f-km-end')),
        obs = get('f-obs');

      if (!date || !person || !car || !fuel || !qty || !value) {
        toast('Preencha os campos obrigatórios', 'error'); return;
      }

      const rec = { id: Date.now(), date, time, person, car, fuel, qty, value, kmStart: kmS || 0, kmEnd: kmE || 0, obs };
      const arr = getFuel();
      arr.push(rec);
      saveFuel(arr);
      toast('Abastecimento salvo com sucesso!');
      clearForm();
      renderRecentTable();
    }

    function clearForm() {
      ['f-date', 'f-time', 'f-person', 'f-car', 'f-fuel', 'f-qty', 'f-value', 'f-km-start', 'f-km-end', 'f-obs']
        .forEach(id => document.getElementById(id).value = '');
      document.getElementById('f-calc').textContent = '';
      setToday('f-date');
      nowTime('f-time');
    }

    // Auto-calculate price per liter & km
    function updateCalc() {
      const qty = parseFloat(document.getElementById('f-qty').value);
      const val = parseFloat(document.getElementById('f-value').value);
      const kmS = parseFloat(document.getElementById('f-km-start').value);
      const kmE = parseFloat(document.getElementById('f-km-end').value);
      let info = [];
      if (qty && val) info.push(`R$${fmt(val / qty, 3)}/L`);
      if (kmS && kmE && kmE > kmS) {
        const dist = kmE - kmS;
        info.push(`${dist} km rodados`);
        if (qty) info.push(`${fmt(qty * 100 / dist, 1)} L/100km`);
      }
      document.getElementById('f-calc').textContent = info.join(' · ');
    }

    ['f-qty', 'f-value', 'f-km-start', 'f-km-end'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateCalc);
    });

    function renderRecentTable() {
      const data = getFuel().slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
      const tbody = document.getElementById('recent-tbody');
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="11" class="empty">Nenhum registro ainda</td></tr>'; return; }
      tbody.innerHTML = data.map(r => {
        const km = r.kmEnd && r.kmStart ? r.kmEnd - r.kmStart : '—';
        const rKm = (km !== '—' && r.value) ? fmtBRL(r.value / km) : '—';
        return `<tr>
      <td>${r.date} ${r.time || ''}</td>
      <td>${r.person}</td>
      <td>${carBadge(r.car)}</td>
      <td>${fuelBadge(r.fuel)}</td>
      <td>${fmt(r.qty, 1)} L</td>
      <td class="highlight">${fmtBRL(r.value)}</td>
      <td>${r.kmStart || '—'}</td>
      <td>${r.kmEnd || '—'}</td>
      <td>${km !== '—' ? km + ' km' : '—'}</td>
      <td>${rKm}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteFuel(${r.id})">✕</button></td>
    </tr>`;
      }).join('');
    }

    function deleteFuel(id) {
      if (!confirm('Excluir este registro?')) return;
      saveFuel(getFuel().filter(r => r.id !== id));
      renderRecentTable();
      toast('Registro excluído');
    }

    // ══════════════════════════════════════════════════════
    //  SAÍDAS / TRIPS
    // ══════════════════════════════════════════════════════
    function renderSaidas() {
      const from = document.getElementById('trip-from').value;
      const to = document.getElementById('trip-to').value;
      const car = document.getElementById('trip-car').value;
      const person = document.getElementById('trip-person').value.trim().toLowerCase();

      let data = getFuel();
      if (from || to) data = filterByDate(data, from, to);
      if (car) data = data.filter(r => r.car === car);
      if (person) data = data.filter(r => r.person.toLowerCase().includes(person));
      data.sort((a, b) => a.date.localeCompare(b.date));

      const totalKm = data.reduce((s, r) => s + (r.kmEnd && r.kmStart ? r.kmEnd - r.kmStart : 0), 0);
      const totalVal = data.reduce((s, r) => s + (r.value || 0), 0);
      const totalLit = data.reduce((s, r) => s + (r.qty || 0), 0);

      const sc = document.getElementById('saidas-cards');
      sc.innerHTML = `
    <div class="card amber"><div class="card-label">Gasto Total Combustível</div><div class="card-value">${fmtBRL(totalVal)}</div></div>
    <div class="card blue"><div class="card-label">KM Total Percorrido</div><div class="card-value">${fmt(totalKm, 0)} km</div></div>
    <div class="card green"><div class="card-label">Total Litros</div><div class="card-value">${fmt(totalLit, 1)} L</div></div>
    <div class="card orange"><div class="card-label">Custo Médio/km</div><div class="card-value">${totalKm ? fmtBRL(totalVal / totalKm) : '—'}</div></div>
  `;
      document.getElementById('saidas-summary').style.display = 'block';

      const tbody = document.getElementById('saidas-tbody');
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">Sem registros no período</td></tr>'; return; }
      tbody.innerHTML = data.map(r => {
        const km = r.kmEnd && r.kmStart ? r.kmEnd - r.kmStart : 0;
        const rKm = km && r.value ? fmtBRL(r.value / km) : '—';
        const l100 = km && r.qty ? fmt(r.qty * 100 / km, 1) : '—';
        return `<tr>
      <td>${r.date}</td>
      <td>${carBadge(r.car)}</td>
      <td>${r.person}</td>
      <td>${fuelBadge(r.fuel)}</td>
      <td>${km ? km + ' km' : '—'}</td>
      <td>${fmt(r.qty, 1)} L</td>
      <td class="highlight">${fmtBRL(r.value)}</td>
      <td>${rKm}</td>
      <td>${l100 !== '—' ? l100 + ' L/100km' : '—'}</td>
    </tr>`;
      }).join('');
    }

    function clearSaidasFilter() {
      ['trip-from', 'trip-to', 'trip-car', 'trip-person'].forEach(id => document.getElementById(id).value = '');
      renderSaidas();
    }

    // ══════════════════════════════════════════════════════
    //  MANUTENÇÃO
    // ══════════════════════════════════════════════════════
    function saveManutencao() {
      const get = id => document.getElementById(id).value.trim();
      const date = get('m-date'), car = get('m-car'), cat = get('m-cat'),
        value = parseFloat(get('m-value')), desc = get('m-desc'),
        km = get('m-km'), supplier = get('m-supplier');

      if (!date || !car || !cat || !value) { toast('Preencha os campos obrigatórios', 'error'); return; }

      const rec = { id: Date.now(), date, car, cat, value, desc, km: km || '', supplier };
      const arr = getMaint();
      arr.push(rec);
      saveMaint(arr);
      toast('Manutenção salva!');
      clearMaintForm();
      renderMaintTable();
    }

    function clearMaintForm() {
      ['m-date', 'm-car', 'm-cat', 'm-value', 'm-desc', 'm-km', 'm-supplier'].forEach(id => document.getElementById(id).value = '');
      setToday('m-date');
    }

    function renderMaintTable() {
      const data = getMaint().slice().sort((a, b) => b.date.localeCompare(a.date));
      const tbody = document.getElementById('maint-tbody');

      const totalK = data.filter(r => r.car === 'Kangoo').reduce((s, r) => s + r.value, 0);
      const totalF = data.filter(r => r.car === 'Fiorino').reduce((s, r) => s + r.value, 0);
      document.getElementById('maint-total-k').textContent = `Kangoo: ${fmtBRL(totalK)}`;
      document.getElementById('maint-total-f').textContent = `Fiorino: ${fmtBRL(totalF)}`;

      if (!data.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">Nenhuma manutenção registrada</td></tr>'; return; }
      tbody.innerHTML = data.map(r => `<tr>
    <td>${r.date}</td>
    <td>${carBadge(r.car)}</td>
    <td>${r.cat}</td>
    <td>${r.desc || '—'}</td>
    <td>${r.km ? r.km + ' km' : '—'}</td>
    <td class="highlight">${fmtBRL(r.value)}</td>
    <td>${r.supplier || '—'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteMaint(${r.id})">✕</button></td>
  </tr>`).join('');
    }

    function deleteMaint(id) {
      if (!confirm('Excluir este registro?')) return;
      saveMaint(getMaint().filter(r => r.id !== id));
      renderMaintTable();
      toast('Registro excluído');
    }

    // ══════════════════════════════════════════════════════
    //  HISTÓRICO
    // ══════════════════════════════════════════════════════
    function renderHistorico() {
      const from = document.getElementById('hist-from').value;
      const to = document.getElementById('hist-to').value;
      const car = document.getElementById('hist-car').value;
      const type = document.getElementById('hist-type').value;

      let fuel = getFuel();
      let maint = getMaint();

      if (from || to) { fuel = filterByDate(fuel, from, to); maint = filterByDate(maint, from, to); }
      if (car) { fuel = fuel.filter(r => r.car === car); maint = maint.filter(r => r.car === car); }

      const fuelRows = (type === 'maint' ? [] : fuel).map(r => ({
        date: r.date, type: 'fuel', car: r.car, details: `${r.fuel} — ${fmt(r.qty, 1)}L — ${r.person}`,
        km: r.kmEnd || '', value: r.value
      }));
      const maintRows = (type === 'fuel' ? [] : maint).map(r => ({
        date: r.date, type: 'maint', car: r.car, details: `${r.cat}: ${r.desc || r.cat}`,
        km: r.km || '', value: r.value
      }));

      const all = [...fuelRows, ...maintRows].sort((a, b) => b.date.localeCompare(a.date));

      const totalFuel = fuelRows.reduce((s, r) => s + r.value, 0);
      const totalMaint = maintRows.reduce((s, r) => s + r.value, 0);

      const hc = document.getElementById('hist-cards');
      hc.innerHTML = `
    <div class="card amber"><div class="card-label">Gasto Combustível</div><div class="card-value">${fmtBRL(totalFuel)}</div></div>
    <div class="card orange"><div class="card-label">Gasto Manutenção</div><div class="card-value">${fmtBRL(totalMaint)}</div></div>
    <div class="card red"><div class="card-label">Total Geral</div><div class="card-value">${fmtBRL(totalFuel + totalMaint)}</div></div>
    <div class="card blue"><div class="card-label">Registros</div><div class="card-value">${all.length}</div></div>
  `;

      const tbody = document.getElementById('hist-tbody');
      if (!all.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Sem registros</td></tr>'; return; }
      tbody.innerHTML = all.map(r => `<tr>
    <td>${r.date}</td>
    <td><span class="badge ${r.type === 'fuel' ? 'badge-gas' : 'badge-diesel'}">${r.type === 'fuel' ? 'Combust.' : 'Manuten.'}</span></td>
    <td>${carBadge(r.car)}</td>
    <td>${r.details}</td>
    <td>${r.km ? r.km + ' km' : '—'}</td>
    <td class="highlight">${fmtBRL(r.value)}</td>
  </tr>`).join('');
    }

    function clearHistFilter() {
      ['hist-from', 'hist-to', 'hist-car', 'hist-type'].forEach(id => document.getElementById(id).value = '');
      renderHistorico();
    }

    // ══════════════════════════════════════════════════════
    //  DASHBOARD
    // ══════════════════════════════════════════════════════
    function renderDashboard() {
      const from = document.getElementById('dash-from').value;
      const to = document.getElementById('dash-to').value;
      const car = document.getElementById('dash-car').value;

      let fuel = getFuel();
      let maint = getMaint();

      if (from || to) { fuel = filterByDate(fuel, from, to); maint = filterByDate(maint, from, to); }
      if (car) { fuel = fuel.filter(r => r.car === car); maint = maint.filter(r => r.car === car); }

      const totalVal = fuel.reduce((s, r) => s + r.value, 0);
      const totalLit = fuel.reduce((s, r) => s + r.qty, 0);
      const totalKm = fuel.reduce((s, r) => s + (r.kmEnd && r.kmStart ? r.kmEnd - r.kmStart : 0), 0);
      const totalMaint = maint.reduce((s, r) => s + r.value, 0);
      const avgPL = totalLit ? totalVal / totalLit : 0;
      const avgKm = totalKm && totalLit ? totalLit * 100 / totalKm : 0;

      document.getElementById('dash-cards').innerHTML = `
    <div class="card amber"><div class="card-label">Gasto em Combustível</div><div class="card-value">${fmtBRL(totalVal)}</div><div class="card-sub">${fuel.length} abastecimentos</div></div>
    <div class="card blue"><div class="card-label">KM Rodados</div><div class="card-value">${fmt(totalKm, 0)}</div><div class="card-sub">km total no período</div></div>
    <div class="card green"><div class="card-label">Total Abastecido</div><div class="card-value">${fmt(totalLit, 0)} L</div><div class="card-sub">litros/m³ totais</div></div>
    <div class="card orange"><div class="card-label">Gasto em Manutenção</div><div class="card-value">${fmtBRL(totalMaint)}</div><div class="card-sub">${maint.length} registros</div></div>
    <div class="card red"><div class="card-label">Custo Total</div><div class="card-value">${fmtBRL(totalVal + totalMaint)}</div><div class="card-sub">combustível + manutenção</div></div>
    <div class="card amber"><div class="card-label">Preço Médio/Litro</div><div class="card-value">${avgPL ? fmtBRL(avgPL) : '—'}</div><div class="card-sub">média período</div></div>
    ${totalKm ? `<div class="card blue"><div class="card-label">Consumo Médio</div><div class="card-value">${fmt(avgKm, 1)}</div><div class="card-sub">L/100km</div></div>` : ''}
    ${totalKm ? `<div class="card green"><div class="card-label">Custo/km</div><div class="card-value">${fmtBRL(totalVal / totalKm)}</div><div class="card-sub">apenas combustível</div></div>` : ''}
  `;

      buildCharts(fuel, maint);
    }

    function clearDashFilter() {
      ['dash-from', 'dash-to', 'dash-car'].forEach(id => document.getElementById(id).value = '');
      renderDashboard();
    }

    // ══════════════════════════════════════════════════════
    //  CHARTS
    // ══════════════════════════════════════════════════════
    function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

    const CHART_DEFAULTS = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#888', font: { family: 'DM Mono', size: 11 } } } },
      scales: {
        x: { ticks: { color: '#666', font: { family: 'DM Mono', size: 10 } }, grid: { color: '#1e1e1e' } },
        y: { ticks: { color: '#666', font: { family: 'DM Mono', size: 10 } }, grid: { color: '#1e1e1e' } }
      }
    };

    function buildCharts(fuel, maint) {
      // Monthly cost
      const monthly = {};
      fuel.forEach(r => {
        const m = r.date.slice(0, 7);
        monthly[m] = (monthly[m] || 0) + r.value;
      });
      const months = Object.keys(monthly).sort();

      destroyChart('monthly');
      charts['monthly'] = new Chart(document.getElementById('chart-monthly'), {
        type: 'bar',
        data: {
          labels: months.map(m => { const [y, mo] = m.split('-'); return `${mo}/${y.slice(2)}`; }),
          datasets: [{ label: 'Gasto (R$)', data: months.map(m => monthly[m]), backgroundColor: '#f59e0b88', borderColor: '#f59e0b', borderWidth: 1 }]
        },
        options: { ...CHART_DEFAULTS }
      });

      // Monthly liters
      const monthlyL = {};
      fuel.forEach(r => { const m = r.date.slice(0, 7); monthlyL[m] = (monthlyL[m] || 0) + r.qty; });

      destroyChart('liters');
      charts['liters'] = new Chart(document.getElementById('chart-liters'), {
        type: 'line',
        data: {
          labels: months.map(m => { const [y, mo] = m.split('-'); return `${mo}/${y.slice(2)}`; }),
          datasets: [{ label: 'Litros', data: months.map(m => monthlyL[m] || 0), borderColor: '#3b82f6', backgroundColor: '#3b82f620', tension: 0.4, fill: true }]
        },
        options: { ...CHART_DEFAULTS }
      });

      // By car
      const byCar = {};
      fuel.forEach(r => { byCar[r.car] = (byCar[r.car] || 0) + r.value; });

      destroyChart('by-car');
      charts['by-car'] = new Chart(document.getElementById('chart-by-car'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(byCar),
          datasets: [{ data: Object.values(byCar), backgroundColor: ['#3b82f6', '#10b981'], borderColor: '#161616', borderWidth: 3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#888', font: { family: 'DM Mono', size: 11 } } } } }
      });

      // By fuel type
      const byFuel = {};
      fuel.forEach(r => { byFuel[r.fuel] = (byFuel[r.fuel] || 0) + r.value; });

      destroyChart('fuel-type');
      charts['fuel-type'] = new Chart(document.getElementById('chart-fuel-type'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(byFuel),
          datasets: [{ data: Object.values(byFuel), backgroundColor: ['#f59e0b', '#ea580c', '#22c55e', '#a855f7'], borderColor: '#161616', borderWidth: 3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#888', font: { family: 'DM Mono', size: 11 } } } } }
      });
    }

    // ══════════════════════════════════════════════════════
    //  EXCEL EXPORT
    // ══════════════════════════════════════════════════════
    function exportExcel() {
      const fuel = getFuel();
      const maint = getMaint();

      const fuelRows = fuel.map(r => ({
        'Data': r.date, 'Hora': r.time, 'Motorista': r.person, 'Carro': r.car,
        'Combustível': r.fuel, 'Litros': r.qty, 'Valor R$': r.value,
        'KM Inicial': r.kmStart, 'KM Final': r.kmEnd,
        'KM Rodado': (r.kmEnd && r.kmStart) ? r.kmEnd - r.kmStart : '',
        'R$/km': (r.kmEnd && r.kmStart && r.value) ? (r.value / (r.kmEnd - r.kmStart)).toFixed(4) : '',
        'Observação': r.obs || ''
      }));

      const maintRows = maint.map(r => ({
        'Data': r.date, 'Carro': r.car, 'Categoria': r.cat,
        'Descrição': r.desc, 'KM': r.km, 'Valor R$': r.value, 'Fornecedor': r.supplier
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fuelRows.length ? fuelRows : [{}]), 'Abastecimento');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(maintRows.length ? maintRows : [{}]), 'Manutenção');

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `FleetControl_${date}.xlsx`);
      toast('Planilha exportada!');
    }

    // ══════════════════════════════════════════════════════
    //  EXCEL IMPORT
    // ══════════════════════════════════════════════════════
    function importExcel(input) {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary' });

          // Import Fuel
          const fuelSheet = wb.Sheets['Abastecimento'];
          if (fuelSheet) {
            const rows = XLSX.utils.sheet_to_json(fuelSheet);
            const imported = rows.filter(r => r['Data']).map(r => ({
              id: Date.now() + Math.random(),
              date: r['Data'] || '', time: r['Hora'] || '', person: r['Motorista'] || '',
              car: r['Carro'] || '', fuel: r['Combustível'] || '',
              qty: parseFloat(r['Litros']) || 0, value: parseFloat(r['Valor R$']) || 0,
              kmStart: parseFloat(r['KM Inicial']) || 0, kmEnd: parseFloat(r['KM Final']) || 0,
              obs: r['Observação'] || ''
            }));
            saveFuel(imported);
          }

          // Import Maint
          const maintSheet = wb.Sheets['Manutenção'];
          if (maintSheet) {
            const rows = XLSX.utils.sheet_to_json(maintSheet);
            const imported = rows.filter(r => r['Data']).map(r => ({
              id: Date.now() + Math.random(),
              date: r['Data'] || '', car: r['Carro'] || '', cat: r['Categoria'] || '',
              desc: r['Descrição'] || '', km: r['KM'] || '',
              value: parseFloat(r['Valor R$']) || 0, supplier: r['Fornecedor'] || ''
            }));
            saveMaint(imported);
          }

          toast('Dados importados com sucesso!');
          renderDashboard();
          input.value = '';
        } catch (err) {
          toast('Erro ao importar: ' + err.message, 'error');
        }
      };
      reader.readAsBinaryString(file);
    }

    // ══════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════
    (function init() {
      setToday('f-date'); nowTime('f-time');
      setToday('m-date');
      renderDashboard();
    })();
