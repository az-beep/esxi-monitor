import api from './api.js';
import { logout, getCurrentUser } from './auth.js';

let cpuChart, ramChart, romChart;
let allVMs = [];
let allESXiHosts = [];
let selectedHostId = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    if (!getCurrentUser()) {
        window.location.href = '../index.html';
        return;
    }

    setupEventListeners();
    setupModalWindows();
    await loadInitialData();
    startAutoRefresh();
});

function setupEventListeners() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    const vmSelector = document.querySelector('.vm-selector');
    if (vmSelector) {
        vmSelector.addEventListener('change', async (e) => {
            const selectedVM = e.target.value;
            selectedVM === 'Все VM' 
                ? await initChartsWithRealData() 
                : await loadMetricsForVM(selectedVM);
        });
    }

    const hostSelector = document.getElementById('hostSelector');
    if (hostSelector) {
        hostSelector.addEventListener('change', async (e) => {
            selectedHostId = e.target.value;
            await updateHostStatus();
            await loadVMsTable();
            await loadDashboardStats();
        });
    }
}

function setupModalWindows() {
    setupVMModal();
    setupEditModal();
}

async function loadESXiHosts() {
    try {
        allESXiHosts = await api.getESXiHosts();
        updateHostSelector();
        await updateHostStatus();
    } catch (error) {
        console.error('Ошибка загрузки ESXi хостов:', error);
    }
}

async function loadInitialData() {
    try {
        await Promise.all([
            loadESXiHosts(),
            loadDashboardStats(),
            loadVMsTable(),
            initChartsWithRealData()
        ]);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных');
    }
}

function startAutoRefresh() {
    setInterval(async () => {
        try {
            await Promise.all([
                loadDashboardStats(),
                loadVMsTable(),
                updateChartsWithRealData()
            ]);
        } catch (error) {
            console.error('Ошибка обновления:', error);
        }
    }, 10000);
}

//модальные окна
function setupVMModal() {
    const modal = document.getElementById('addVmModal');
    const addBtn = document.getElementById('addVmBtn');
    const form = document.getElementById('addVmForm');

    if (!modal || !addBtn || !form) return;

    addBtn.addEventListener('click', () => modal.style.display = 'flex');
    setupModalCloseHandlers(modal, form);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = getFormData(form, ['vmName', 'vmCpu', 'vmRam', 'vmRom']);
        if (!validateVMForm(formData)) return;

        try {
            await api.createVM({
                name: formData.vmName,
                cpu: formData.vmCpu,
                ram: formData.vmRam,
                rom: formData.vmRom,
                status: 'stopped'
            });
            
            closeModal(modal, form);
            await loadVMsTable();
            showSuccess('VM успешно создана');
            
        } catch (error) {
            handleApiError('создании VM', error);
        }
    });
}

//изменение конфигурации ВМ
function setupEditModal() {
    const modal = document.getElementById('editVmModal');
    const form = document.getElementById('editVmForm');

    if (!modal || !form) return;

    setupModalCloseHandlers(modal, form);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const vmId = parseInt(form.querySelector('#editVmId').value);
        const formData = getFormData(form, ['editVmName', 'editVmCpu', 'editVmRam', 'editVmRom']);
        
        if (!validateVMForm(formData, true) || !vmId) return;

        try {
            await api.updateVM(vmId, {
                name: formData.editVmName,
                cpu: formData.editVmCpu,
                ram: formData.editVmRam,
                rom: formData.editVmRom
            });
            
            closeModal(modal, form);
            await Promise.all([loadVMsTable(), loadDashboardStats()]);
            showSuccess('Конфигурация VM успешно обновлена');
            
        } catch (error) {
            handleApiError('обновлении VM', error);
        }
    });
}

// основые функции
function updateHostSelector() {
    const hostSelector = document.getElementById('hostSelector');
    if (!hostSelector) return;
    
    const currentValue = hostSelector.value;
    hostSelector.innerHTML = '<option value="all">Все хосты</option>';
    
    allESXiHosts.forEach(host => {
        const option = document.createElement('option');
        option.value = host.id;
        option.textContent = `${host.name} (${host.
            ip})`;
            hostSelector.appendChild(option);
        });
        
        if (allESXiHosts.some(host => host.id.toString() === currentValue)) {
            hostSelector.value = currentValue;
        } else {
            hostSelector.value = 'all';
            selectedHostId = 'all';
    }
}

async function updateHostStatus() {
    const hostStatus = document.getElementById('hostStatus');
    if (!hostStatus) return;
    
    if (selectedHostId === 'all') {
        const connectedCount = allESXiHosts.filter(h => h.status === 'connected').length;
        const totalCount = allESXiHosts.length;
        
        hostStatus.innerHTML = `
            <span class="status-indicator ${totalCount > 0 ? 'status-connected' : 'status-unknown'}"></span>
            <span class="status-text">${connectedCount}/${totalCount} подключено</span>
        `;
        return;
    }
    
    const host = allESXiHosts.find(h => h.id.toString() === selectedHostId);
    if (!host) {
        hostStatus.innerHTML = `
            <span class="status-indicator status-unknown"></span>
            <span class="status-text">Хост не найден</span>
        `;
        return;
    }
    
    try {
        const hostInfo = await api.getESXiById(host.id);
        
        const statusClass = hostInfo.status === 'connected' ? 'status-connected' : 'status-disconnected';
        const statusText = hostInfo.status === 'connected' ? 'Подключен' : 'Не подключен';
        
        hostStatus.innerHTML = `
            <span class="status-indicator ${statusClass}"></span>
            <span class="status-text">${statusText}</span>
        `;
    } catch (error) {
        console.error('Ошибка проверки статуса хоста:', error);
        hostStatus.innerHTML = `
            <span class="status-indicator status-unknown"></span>
            <span class="status-text">Ошибка проверки</span>
        `;
    }
}

async function loadDashboardStats() {
    try {
        const [vms, metrics] = await Promise.all([
            api.getAllVMs(),
            api.getLatestMetrics()
        ]);

        let filteredVMs = vms;
        if (selectedHostId !== 'all') {
            filteredVMs = vms.filter(vm => 
                vm.esxiHostId === parseInt(selectedHostId) || 
                vm.EsxiHostId === parseInt(selectedHostId)
            );
        }

        const totalVMs = vms.length;
        const runningVMs = vms.filter(vm => vm.status === 'running').length;
        const avgCPU = calculateAverageCPU(metrics);
        const totalRAM = filteredVMs.reduce((sum, vm) => sum + (vm.ram || 0), 0);
        
        updateStatsUI(totalVMs, runningVMs, avgCPU, totalRAM);
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

async function loadVMsTable() {
    try {
        const [vms, esxiHosts] = await Promise.all([
            api.getAllVMs(),
            api.getESXiHosts()
        ]);

        allVMs = vms;
        allESXiHosts = esxiHosts;

        let filteredVMs = vms;
        if (selectedHostId !== 'all') {
            filteredVMs = vms.filter(vm => 
                vm.esxiHostId === parseInt(selectedHostId) || 
                vm.EsxiHostId === parseInt(selectedHostId)
            );
        }

        updateHostSelector();
        updateVMSelector(filteredVMs);
        renderVMsTable(filteredVMs, esxiHosts);
        
    } catch (error) {
        console.error('Ошибка загрузки таблицы VM:', error);
        renderEmptyTable();
    }
}

async function initChartsWithRealData() {
    try {
        const metrics = await api.getLatestMetrics();
        
        if (!metrics || metrics.length === 0) {
            createEmptyCharts();
            return;
        }

        const { labels, cpuData, ramData, romData } = prepareChartData(metrics);
        createCharts(labels, cpuData, ramData, romData);
        
    } catch (error) {
        console.error('Ошибка загрузки графиков:', error);
        createEmptyCharts();
    }
}

async function updateChartsWithRealData() {
    try {
        const metrics = await api.getLatestMetrics();
        if (!metrics || metrics.length === 0) return;
        
        const { labels, cpuData, ramData, romData } = prepareChartData(metrics);
        updateCharts(cpuData, ramData, romData, labels);
        
    } catch (error) {
        console.error('Ошибка обновления графиков:', error);
    }
}

async function loadMetricsForVM(vmName) {
    try {
        const vms = await api.getAllVMs();
        const vm = vms.find(v => v.name === vmName);
        
        if (!vm) {
            console.error('VM не найдена:', vmName);
            return;
        }
        
        const metrics = await api.getVMMetrics(vm.id);
        
        if (!metrics || metrics.length === 0) {
            createEmptyCharts();
            return;
        }
        
        const { labels, cpuData, ramData, romData } = prepareChartData(metrics);
        createCharts(labels, cpuData, ramData, romData);
        
    } catch (error) {
        console.error('Ошибка загрузки метрик VM:', error);
    }
}

function calculateAverageCPU(metrics) {
    let totalCPU = 0;
    let cpuCount = 0;
    
    metrics.forEach(metric => {
        if (metric.cpu !== null && metric.cpu !== undefined) {
            totalCPU += metric.cpu;
            cpuCount++;
        }
    });
    
    return cpuCount > 0 ? Math.round(totalCPU / cpuCount) : 0;
}

function prepareChartData(metrics, limit = 10) {
    const lastMetrics = metrics.slice(0, limit).reverse();
    
    const labels = lastMetrics.map(m => 
        new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
    
    const cpuData = lastMetrics.map(m => m.cpu || 0);
    const ramData = lastMetrics.map(m => m.ram || 0);
    const romData = lastMetrics.map(m => m.rom || 0);

    return { labels, cpuData, ramData, romData };
}

function updateStatsUI(totalVMs, runningVMs, avgCPU, totalRAM) {
    const stats = [
        { element: '.stat-box:nth-child(1) .stat-value', value: totalVMs },
        { element: '.stat-box:nth-child(2) .stat-value', value: runningVMs },
        { element: '.stat-box:nth-child(3) .stat-value', value: `${avgCPU}%` },
        { element: '.stat-box:nth-child(4) .stat-value', value: `${totalRAM} GB` }
    ];
    
    stats.forEach(stat => {
        const el = document.querySelector(stat.element);
        if (el) el.textContent = stat.value;
    });
}

function renderVMsTable(vms, esxiHosts) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (vms.length === 0) {
        renderEmptyTable();
        return;
    }

    const esxiMap = createEsxiMap(esxiHosts);

    vms.forEach(vm => {
        const esxiHost = esxiMap[vm.EsxiHostId] || esxiMap[vm.esxiHostId];
        const row = createVMRow(vm, esxiHost);
        tableBody.appendChild(row);
    });
}

function createEsxiMap(esxiHosts) {
    const map = {};
    esxiHosts.forEach(host => {
        map[host.id] = host;
    });
    return map;
}

function createVMRow(vm, esxiHost) {
    const row = document.createElement('tr');
    const statusClass = vm.status === 'running' ? 'status-running' : 'status-stopped';
    const statusText = vm.status === 'running' ? 'Запущена' : 'Остановлена';
    const canDelete = vm.status === 'stopped';
    
    row.innerHTML = `
        <td><strong>${vm.name}</strong></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${vm.cpu || 0}%</td>
        <td>${vm.ram ? vm.ram + ' GB' : '0 GB'}</td>
        <td>${vm.rom ? vm.rom + ' GB' : '0 GB'}</td>
        <td class="actions">
            <button class="btn-small btn-edit" onclick="openEditVM(${vm.id})" 
                    title="Изменить конфигурацию">Изменить</button>
            ${vm.status === 'running' 
                ? `<button class="btn-small btn-warning" onclick="stopVM(${vm.id})" 
                   title="Остановить VM">Остановить</button>`
                : `<button class="btn-small btn-success" onclick="startVM(${vm.id})" 
                   title="Запустить VM">Запустить</button>`
            }
            ${canDelete 
                ? `<button class="btn-small btn-danger" onclick="deleteVM(${vm.id})" 
                   title="Удалить VM">Удалить</button>`
                : ''
            }
        </td>
    `;
    
    return row;
}

function renderEmptyTable() {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #718096;">
                Нет виртуальных машин
            </td>
        </tr>
    `;
}

function updateVMSelector(vms) {
    const vmSelector = document.getElementById('vmSelector');
    if (!vmSelector) return;

    const currentValue = vmSelector.value;
    vmSelector.innerHTML = '<option>Все VM</option>';
    
    vms.forEach(vm => {
        const option = document.createElement('option');
        option.value = vm.name;
        option.textContent = vm.name;
        vmSelector.appendChild(option);
    });
    
    if (vms.some(vm => vm.name === currentValue)) {
        vmSelector.value = currentValue;
    }
}

//Графики
function createCharts(labels, cpuData, ramData, romData) {
    const chartConfig = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { 
                        callback: value => value + '%',
                        font: { size: 10 }
                    }
                },
                x: { 
                    grid: { display: false },
                    ticks: { font: { size: 9 } }
                }
            }
        }
    };

    const charts = [
        { id: 'cpuChart', color: '#3182ce', label: 'CPU', data: cpuData },
        { id: 'ramChart', color: '#48bb78', label: 'RAM', data: ramData },
        { id: 'romChart', color: '#ed8936', label: 'ROM', data: romData }
    ];

    charts.forEach(chart => {
        const ctx = document.getElementById(chart.id)?.getContext('2d');
        if (!ctx) return;

        if (chart.id === 'cpuChart' && cpuChart) cpuChart.destroy();
        if (chart.id === 'ramChart' && ramChart) ramChart.destroy();
        if (chart.id === 'romChart' && romChart) romChart.destroy();

        const newChart = new Chart(ctx, {
            ...chartConfig,
            data: {
                labels: labels,
                datasets: [{
                    label: chart.label,
                    data: chart.data,
                    borderColor: chart.color,
                    backgroundColor: chart.color + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                }]
            }
        });

        if (chart.id === 'cpuChart') cpuChart = newChart;
        if (chart.id === 'ramChart') ramChart = newChart;
        if (chart.id === 'romChart') romChart = newChart;
    });
}

function updateCharts(cpuData, ramData, romData, labels) {
    [cpuChart, ramChart, romChart].forEach((chart, index) => {
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = [cpuData, ramData, romData][index];
            chart.update('none');
        }
    });
}

function createEmptyCharts() {
    const labels = ['Нет данных'];
    const emptyData = [0];
    createCharts(labels, emptyData, emptyData, emptyData);
}

// валидация
function getFormData(form, fieldNames) {
    const data = {};
    fieldNames.forEach(name => {
        const input = form.querySelector(`#${name}`);
        data[name] = input ? (input.type === 'number' ? parseInt(input.value) : input.value) : null;
    });
    return data;
}

function validateVMForm(data, isEdit = false) {
    const errors = [];
    
    Object.entries(data).forEach(([key, value]) => {
        if (!value && value !== 0) {
            errors.push(`Поле ${key} обязательно для заполнения`);
        }
    });

    if (data.vmCpu || data.editVmCpu) {
        const cpu = data.vmCpu || data.editVmCpu;
        if (cpu < 1 || cpu > 32) errors.push('CPU должно быть от 1 до 32 ядер');
    }
    
    if (data.vmRam || data.editVmRam) {
        const ram = data.vmRam || data.editVmRam;
        if (ram < 1 || ram > 256) errors.push('RAM должно быть от 1 до 256 GB');
    }
    
    if (data.vmRom || data.editVmRom) {
        const rom = data.vmRom || data.editVmRom;
        if (rom < 10 || rom > 4096) errors.push('ROM должно быть от 10 до 4096 GB');
    }

    if (errors.length > 0) {
        showError(errors.join(', '));
        return false;
    }
    
    return true;
}

function setupModalCloseHandlers(modal, form) {
    const closeBtns = modal.querySelectorAll('.modal-close');
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => closeModal(modal, form));
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal, form);
    });
}

function closeModal(modal, form) {
    modal.style.display = 'none';
    if (form) form.reset();
}

function handleApiError(context, error) {
    console.error(`Error in ${context}:`, error);
    showError(`Ошибка при ${context}: ${error.message || 'Неизвестная ошибка'}`);
}

//Уведомления
function showError(message) {
    showNotification(message, '#fed7d7', '#c53030', '#f56565');
}

function showSuccess(message) {
    showNotification(message, '#c6f6d5', '#276749', '#48bb78');
}

function showNotification(message, bgColor, textColor, borderColor) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: ${textColor};
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        border-left: 4px solid ${borderColor};
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    div.textContent = message;
    document.body.appendChild(div);
    
    setTimeout(() => div.remove(), 5000);
}

//функции
window.startVM = async function(vmId) {
    try {
        await api.startVM(vmId);
        await loadVMsTable();
        showSuccess('VM успешно запущена');
    } catch (error) {
        handleApiError('запуске VM', error);
    }
};

window.stopVM = async function(vmId) {
    try {
        await api.stopVM(vmId);
        await loadVMsTable();
        showSuccess('VM успешно остановлена');
    } catch (error) {
        handleApiError('остановке VM', error);
    }
};

window.deleteVM = async function(vmId) {
    const vm = allVMs.find(v => v.id === vmId);
    if (!vm) return;

    if (vm.status === 'running') {
        showError('Нельзя удалить запущенную VM');
        return;
    }

    if (!confirm(`Вы уверены, что хотите удалить VM "${vm.name}"?`)) {
        return;
    }

    try {
        await api.deleteVM(vmId);
        await loadVMsTable();
        showSuccess('VM успешно удалена');
    } catch (error) {
        handleApiError('удалении VM', error);
    }
};

window.openEditVM = async function(vmId) {
    const vm = allVMs.find(v => v.id === vmId);
    if (!vm) {
        showError('VM не найдена');
        return;
    }

    if (vm.status === 'running' && !confirm('Внимание! VM запущена. Продолжить?')) {
        return;
    }

    const form = document.getElementById('editVmForm');
    if (!form) return;

    form.querySelector('#editVmId').value = vm.id;
    form.querySelector('#editVmName').value = vm.name;
    form.querySelector('#editVmCpu').value = vm.cpu || 2;
    form.querySelector('#editVmRam').value = vm.ram || 4;
    form.querySelector('#editVmRom').value = vm.rom || 50;

    const modal = document.getElementById('editVmModal');
    if (modal) modal.style.display = 'flex';
};