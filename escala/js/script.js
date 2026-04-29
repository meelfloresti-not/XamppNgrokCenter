// Default Employee Data
const defaultEmployees = [
    { nome: "Ana Carolina", escala: "6x1" },
    { nome: "Bruno", escala: "12x36" },
    { nome: "Davi", escala: "6x1" },
    { nome: "Gabriela Cipulo", escala: "6x1" },
    { nome: "Gabriela Humphreys", escala: "6x1" },
    { nome: "Gilberto", escala: "12x36" },
    { nome: "Glauce", escala: "6x1" },
    { nome: "Helena", escala: "6x1" },
    { nome: "José Fernando", escala: "6x1" },
    { nome: "Leonardo", escala: "12x36" },
    { nome: "Luana", escala: "6x1" },
    { nome: "Mariana", escala: "12x36" },
    { nome: "Morsa", escala: "12x36" },
    { nome: "Murillo", escala: "6x1" },
    { nome: "Pedro Henrique", escala: "12x36" },
    { nome: "Robson", escala: "5x2" },
    { nome: "Sabrina", escala: "6x1" },
    { nome: "Silas", escala: "12x36" },
    { nome: "Thayssa", escala: "6x1" }
];

let employees = [];

// State
let currentDate = new Date(); // Current selected month
let stateData = {}; // Format: { "YYYY-MM": { "employeeName_YYYY-MM-DD": "X", "holidays": ["YYYY-MM-DD"] } }

// DOM Elements
const monthSelector = document.getElementById('month-selector');
const scaleFilter = document.getElementById('scale-filter');
const tableHeaderDays = document.getElementById('table-header-days');
const tableHeaderWeekdays = document.getElementById('table-header-weekdays');
const tableBody = document.getElementById('table-body');
const btnClear = document.getElementById('btn-clear-data');
const btnExportPdf = document.getElementById('btn-export-pdf');
const btnExportExcel = document.getElementById('btn-export-excel');

// Modal Elements
const empModal = document.getElementById('emp-modal');
const btnManageEmp = document.getElementById('btn-manage-emp');
const closeEmpModal = document.getElementById('close-emp-modal');
const newEmpName = document.getElementById('new-emp-name');
const newEmpScale = document.getElementById('new-emp-scale');
const btnAddEmp = document.getElementById('btn-add-emp');
const empListBody = document.getElementById('emp-list-body');

// Initialization
function init() {
    loadState();
    
    // Set initial month selector value to current month
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    monthSelector.value = `${year}-${month}`;
    
    setupEventListeners();
    render();
}

function loadState() {
    const saved = localStorage.getItem('escala_state');
    if (saved) {
        stateData = JSON.parse(saved);
    }
    
    const savedEmployees = localStorage.getItem('escala_employees');
    if (savedEmployees) {
        employees = JSON.parse(savedEmployees);
    } else {
        employees = [...defaultEmployees];
        saveEmployees();
    }
}

function saveState() {
    localStorage.setItem('escala_state', JSON.stringify(stateData));
}

function saveEmployees() {
    employees.sort((a, b) => a.nome.localeCompare(b.nome));
    localStorage.setItem('escala_employees', JSON.stringify(employees));
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDayString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function setupEventListeners() {
    monthSelector.addEventListener('change', (e) => {
        if (e.target.value) {
            const [year, month] = e.target.value.split('-');
            currentDate = new Date(year, parseInt(month) - 1, 1);
            render();
        }
    });

    scaleFilter.addEventListener('change', render);

    btnClear.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar todos os dados DESTE MÊS?')) {
            const monthKey = getMonthKey(currentDate);
            if (stateData[monthKey]) {
                delete stateData[monthKey];
                saveState();
                render();
            }
        }
    });

    btnExportPdf.addEventListener('click', exportToPdf);
    btnExportExcel.addEventListener('click', exportToExcel);
    
    // Modal Events
    btnManageEmp.addEventListener('click', () => {
        renderEmpList();
        empModal.classList.add('show');
    });

    closeEmpModal.addEventListener('click', () => {
        empModal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === empModal) empModal.classList.remove('show');
    });

    btnAddEmp.addEventListener('click', () => {
        const name = newEmpName.value.trim();
        const scale = newEmpScale.value;
        if (name) {
            if (employees.some(emp => emp.nome.toLowerCase() === name.toLowerCase())) {
                alert('Já existe um funcionário com este nome.');
                return;
            }
            employees.push({ nome: name, escala: scale });
            saveEmployees();
            newEmpName.value = '';
            renderEmpList();
            render();
        }
    });
}

function renderEmpList() {
    empListBody.innerHTML = '';
    employees.forEach((emp, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.nome}</td>
            <td>${emp.escala}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteEmployee(${index})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        empListBody.appendChild(tr);
    });
}

function deleteEmployee(index) {
    if (confirm(`Deseja realmente excluir o funcionário ${employees[index].nome}?`)) {
        employees.splice(index, 1);
        saveEmployees();
        renderEmpList();
        render();
    }
}

function toggleHoliday(dayStr) {
    const monthKey = getMonthKey(currentDate);
    if (!stateData[monthKey]) stateData[monthKey] = { holidays: [] };
    if (!stateData[monthKey].holidays) stateData[monthKey].holidays = [];
    
    const index = stateData[monthKey].holidays.indexOf(dayStr);
    if (index > -1) {
        stateData[monthKey].holidays.splice(index, 1);
    } else {
        stateData[monthKey].holidays.push(dayStr);
    }
    saveState();
    render();
}

function cycleCellState(employeeName, dayStr) {
    const monthKey = getMonthKey(currentDate);
    if (!stateData[monthKey]) stateData[monthKey] = { holidays: [] };
    
    const key = `${employeeName}_${dayStr}`;
    const currentState = stateData[monthKey][key] || '';
    
    let nextState = '';
    if (currentState === '') nextState = 'X';
    else if (currentState === 'X') nextState = 'F';
    else if (currentState === 'F') nextState = '';
    
    if (nextState === '') {
        delete stateData[monthKey][key];
    } else {
        stateData[monthKey][key] = nextState;
    }
    
    saveState();
    render();
}

function render() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const monthKey = getMonthKey(currentDate);
    const monthData = stateData[monthKey] || { holidays: [] };
    const holidays = monthData.holidays || [];
    const filter = scaleFilter.value;

    // --- Render Headers ---
    // Reset headers (keep the first 2 columns and last column structure)
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
            td.onclick = () => cycleCellState(emp.nome, dayStr);
            
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

// Start
document.addEventListener('DOMContentLoaded', init);
