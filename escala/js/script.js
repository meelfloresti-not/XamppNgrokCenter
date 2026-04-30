// =============================================
// Escala de Funcionários - MySQL Backend
// =============================================
// Dados persistidos via API PHP/MySQL

const API_BASE = '/escala/api';

// State
let employees = [];
let currentDate = new Date();
let monthData = {};     // { "nome_YYYY-MM-DD": "X" }
let holidays = [];      // ["YYYY-MM-DD", ...]

// DOM Elements
const monthSelector = document.getElementById('month-selector');
const scaleFilter = document.getElementById('scale-filter');
const tableHeaderDays = document.getElementById('table-header-days');
const tableHeaderWeekdays = document.getElementById('table-header-weekdays');
const tableBody = document.getElementById('table-body');
const btnClear = document.getElementById('btn-clear-data');
const btnExportPdf = document.getElementById('btn-export-pdf');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnScreenshot = document.getElementById('btn-screenshot');

// Modal Elements
const empModal = document.getElementById('emp-modal');
const btnManageEmp = document.getElementById('btn-manage-emp');
const closeEmpModal = document.getElementById('close-emp-modal');
const newEmpName = document.getElementById('new-emp-name');
const newEmpScale = document.getElementById('new-emp-scale');
const btnAddEmp = document.getElementById('btn-add-emp');
const empListBody = document.getElementById('emp-list-body');

// Preview Modal Elements
const previewModal = document.getElementById('preview-modal');
const closePreviewModal = document.getElementById('close-preview-modal');
const previewImage = document.getElementById('preview-image');
const btnDownloadImg = document.getElementById('btn-download-img');
const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
const loadingOverlay = document.getElementById('loading-overlay');

// =============================================
// INITIALIZATION
// =============================================
async function init() {
    // Set initial month selector value
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    monthSelector.value = `${year}-${month}`;

    setupEventListeners();

    // Load data from MySQL
    await loadEmployees();
    await loadMonthData();
    render();
}

// =============================================
// API HELPERS
// =============================================
async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}/${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const json = await res.json();
        if (!json.success) {
            console.error(`API Error [${endpoint}]:`, json.error);
            showToast(json.error || 'Erro na API', 'error');
            return null;
        }
        return json;
    } catch (err) {
        console.error(`Network Error [${endpoint}]:`, err);
        showToast('Erro de conexão com o servidor.', 'error');
        return null;
    }
}

// =============================================
// DATA LOADING
// =============================================
async function loadEmployees() {
    const res = await apiFetch('funcionarios.php');
    if (res) {
        employees = res.data;
    }
}

async function loadMonthData() {
    const mesKey = getMonthKey(currentDate);
    const res = await apiFetch(`escala.php?mes=${mesKey}`);
    if (res) {
        monthData = res.dados || {};
        holidays = res.feriados || [];
    } else {
        monthData = {};
        holidays = [];
    }
}

// =============================================
// UTILITY
// =============================================
function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDayString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function showToast(msg, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// =============================================
// EVENT LISTENERS
// =============================================
function setupEventListeners() {
    monthSelector.addEventListener('change', async (e) => {
        if (e.target.value) {
            const [year, month] = e.target.value.split('-');
            currentDate = new Date(year, parseInt(month) - 1, 1);
            await loadMonthData();
            render();
        }
    });

    scaleFilter.addEventListener('change', render);

    btnClear.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja limpar todos os dados DESTE MÊS?')) {
            const mesKey = getMonthKey(currentDate);
            const res = await apiFetch('escala.php', {
                method: 'DELETE',
                body: JSON.stringify({ mes: mesKey })
            });
            if (res) {
                monthData = {};
                holidays = [];
                render();
                showToast('Dados do mês limpos com sucesso.');
            }
        }
    });

    btnExportPdf.addEventListener('click', exportToPdf);
    btnExportExcel.addEventListener('click', exportToExcel);
    btnScreenshot.addEventListener('click', captureScreenshot);

    // Employee Modal Events
    btnManageEmp.addEventListener('click', () => {
        renderEmpList();
        empModal.classList.add('show');
    });

    closeEmpModal.addEventListener('click', () => {
        empModal.classList.remove('show');
    });

    // Preview Modal Events
    closePreviewModal.addEventListener('click', () => {
        previewModal.classList.remove('show');
    });

    btnDownloadImg.addEventListener('click', downloadScreenshot);
    btnShareWhatsapp.addEventListener('click', shareWhatsApp);

    window.addEventListener('click', (e) => {
        if (e.target === empModal) empModal.classList.remove('show');
        if (e.target === previewModal) previewModal.classList.remove('show');
    });

    btnAddEmp.addEventListener('click', async () => {
        const name = newEmpName.value.trim();
        const scale = newEmpScale.value;
        if (name) {
            const res = await apiFetch('funcionarios.php', {
                method: 'POST',
                body: JSON.stringify({ nome: name, escala: scale })
            });
            if (res) {
                newEmpName.value = '';
                await loadEmployees();
                renderEmpList();
                render();
                showToast(`${name} adicionado com sucesso.`);
            }
        }
    });

    // Enter key on employee name input
    newEmpName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAddEmp.click();
    });
}

// =============================================
// EMPLOYEE MANAGEMENT
// =============================================
function renderEmpList() {
    empListBody.innerHTML = '';
    employees.forEach((emp) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.nome}</td>
            <td>${emp.escala}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteEmployee(${emp.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        empListBody.appendChild(tr);
    });
}

async function deleteEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    if (confirm(`Deseja realmente excluir o funcionário ${emp.nome}?`)) {
        const res = await apiFetch('funcionarios.php', {
            method: 'DELETE',
            body: JSON.stringify({ id })
        });
        if (res) {
            await loadEmployees();
            renderEmpList();
            render();
            showToast(`${emp.nome} removido.`);
        }
    }
}

// =============================================
// SCHEDULE ACTIONS
// =============================================
async function toggleHoliday(dayStr) {
    const res = await apiFetch('feriados.php', {
        method: 'POST',
        body: JSON.stringify({ data: dayStr })
    });
    if (res) {
        if (res.action === 'added') {
            holidays.push(dayStr);
        } else {
            const idx = holidays.indexOf(dayStr);
            if (idx > -1) holidays.splice(idx, 1);
        }
        render();
    }
}

async function cycleCellState(employeeId, employeeName, dayStr) {
    const key = `${employeeName}_${dayStr}`;
    const currentState = monthData[key] || '';

    let nextState = '';
    if (currentState === '') nextState = 'X';
    else if (currentState === 'X') nextState = 'F';
    else if (currentState === 'F') nextState = '';

    // Optimistic update
    if (nextState === '') {
        delete monthData[key];
    } else {
        monthData[key] = nextState;
    }
    render();

    // Save to server
    await apiFetch('escala.php', {
        method: 'POST',
        body: JSON.stringify({
            funcionario_id: employeeId,
            data_dia: dayStr,
            status: nextState
        })
    });
}

// =============================================
// RENDER
// =============================================
function render() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const filter = scaleFilter.value;

    // --- Render Headers ---
    tableHeaderDays.innerHTML = `
        <th rowspan="2" class="sticky-col name-col">Nome do Funcionário</th>
        <th rowspan="2" class="sticky-col scale-col">Escala</th>
    `;
    tableHeaderWeekdays.innerHTML = '';

    const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dayOfWeek = date.getDay();
        const dayStr = getDayString(date);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.includes(dayStr);

        let headerClass = 'day-col';
        if (isHoliday) headerClass += ' holiday';
        else if (isWeekend) headerClass += ' weekend';

        // Day number header
        const thNum = document.createElement('th');
        thNum.className = headerClass;
        thNum.textContent = i;
        thNum.title = 'Clique para marcar/desmarcar feriado';
        thNum.onclick = () => toggleHoliday(dayStr);
        tableHeaderDays.appendChild(thNum);

        // Weekday header
        const thDay = document.createElement('th');
        thDay.className = headerClass;
        thDay.textContent = weekdays[dayOfWeek];
        tableHeaderWeekdays.appendChild(thDay);
    }

    // Add Total column header
    tableHeaderDays.insertAdjacentHTML('beforeend', `<th rowspan="2" class="total-col">Total<br>Folgas (X)</th>`);

    // --- Render Body ---
    tableBody.innerHTML = '';

    const filteredEmployees = employees.filter(emp => filter === 'all' || emp.escala === filter);

    filteredEmployees.forEach(emp => {
        const tr = document.createElement('tr');

        // Name
        const tdName = document.createElement('td');
        tdName.className = 'sticky-col name-col';
        tdName.textContent = emp.nome;
        tr.appendChild(tdName);

        // Scale
        const tdScale = document.createElement('td');
        tdScale.className = 'sticky-col scale-col';
        tdScale.textContent = emp.escala;
        tr.appendChild(tdScale);

        let totalX = 0;

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayOfWeek = date.getDay();
            const dayStr = getDayString(date);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays.includes(dayStr);

            const cellKey = `${emp.nome}_${dayStr}`;
            const state = monthData[cellKey] || '';

            if (state === 'X') totalX++;

            const td = document.createElement('td');
            let className = 'cell-day';
            if (state === 'X') className += ' status-x';
            else if (state === 'F') className += ' status-f';
            else if (isHoliday) className += ' holiday';
            else if (isWeekend) className += ' weekend';

            td.className = className;
            td.textContent = state;
            td.onclick = () => cycleCellState(emp.id, emp.nome, dayStr);

            tr.appendChild(td);
        }

        // Total
        const tdTotal = document.createElement('td');
        tdTotal.className = 'total-col';
        tdTotal.textContent = totalX;
        tr.appendChild(tdTotal);

        tableBody.appendChild(tr);
    });
}

// =============================================
// SCREENSHOT & SHARE
// =============================================
let capturedBlob = null;

async function captureScreenshot() {
    const container = document.getElementById('schedule-container');
    loadingOverlay.classList.add('show');

    try {
        // Temporarily expand container to show full table
        const originalOverflow = container.style.overflow;
        const originalHeight = container.style.height;
        const originalMaxHeight = container.style.maxHeight;
        container.style.overflow = 'visible';
        container.style.height = 'auto';
        container.style.maxHeight = 'none';

        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim() || '#1d1d1f',
            logging: false,
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight
        });

        // Restore container styles
        container.style.overflow = originalOverflow;
        container.style.height = originalHeight;
        container.style.maxHeight = originalMaxHeight;

        // Convert to blob
        capturedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Show preview
        previewImage.src = canvas.toDataURL('image/png');
        loadingOverlay.classList.remove('show');
        previewModal.classList.add('show');

        // Check if Web Share API is available (mobile)
        if (navigator.canShare && navigator.canShare({ files: [new File([capturedBlob], 'escala.png', { type: 'image/png' })] })) {
            btnShareWhatsapp.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Compartilhar';
        } else {
            btnShareWhatsapp.innerHTML = '<i class="fa-brands fa-whatsapp"></i> WhatsApp Web';
        }

    } catch (err) {
        console.error('Screenshot error:', err);
        loadingOverlay.classList.remove('show');
        showToast('Erro ao capturar imagem.', 'error');
    }
}

function downloadScreenshot() {
    if (!capturedBlob) return;
    const mesKey = getMonthKey(currentDate);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(capturedBlob);
    link.download = `Escala_${mesKey}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Imagem baixada com sucesso!');
}

async function shareWhatsApp() {
    if (!capturedBlob) return;

    const mesKey = getMonthKey(currentDate);
    const file = new File([capturedBlob], `Escala_${mesKey}.png`, { type: 'image/png' });

    // Try native share first (mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: `Escala ${mesKey}`,
                text: `Escala de funcionários - ${mesKey}`,
                files: [file]
            });
            showToast('Compartilhado com sucesso!');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share error:', err);
                showToast('Erro ao compartilhar.', 'error');
            }
        }
    } else {
        // Desktop fallback: download + open WhatsApp Web
        downloadScreenshot();
        showToast('Imagem baixada! Cole no WhatsApp Web.');
        setTimeout(() => {
            window.open('https://web.whatsapp.com', '_blank');
        }, 500);
    }
}

// =============================================
// EXPORT (preserved from original)
// =============================================
function exportToPdf() {
    const element = document.getElementById('schedule-container');
    const opt = {
        margin:       0.2,
        filename:     `Escala_${monthSelector.value}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}

function exportToExcel() {
    const table = document.getElementById('schedule-table');
    const wb = XLSX.utils.table_to_book(table, {sheet: "Escala"});
    XLSX.writeFile(wb, `Escala_${monthSelector.value}.xlsx`);
}

// =============================================
// START
// =============================================
document.addEventListener('DOMContentLoaded', init);
