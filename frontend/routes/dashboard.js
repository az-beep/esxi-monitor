document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.href.includes('index.html')) {
        return;
    }
    
    const isBackendAvailable = await api.checkBackendStatus();
    if (!isBackendAvailable) {
        console.warn('Бэкенд недоступен');
    }
});

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('errorMessage');
        
        errorElement.style.display = 'none';
        errorElement.textContent = '';
        
        try {
            const result = await api.login(email, password);
            
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            errorElement.textContent = error.message;
            errorElement.style.display = 'block';
        }
    });
    
    document.getElementById('email').value = 'admin@esxi.local';
    document.getElementById('password').value = 'admin123';
}
frontend/rputes/dashboard.js
let auditData = {
    currentPage: 1,
    itemsPerPage: 10,
    allLogs: []
};

let vmsData = {
    currentPage: 1,
    itemsPerPage: 10,
    allVMs: []
};

function getActionText(action) {
    const types = {
        'login_success': 'Успешный вход',
        'login_failed': 'Ошибка входа',
        'ui_login': 'Вход через UI',
        'auth_failure': 'Ошибка аутентификации',
        'other': 'Другое'
    };
    return types[action]  action;
}

function getStatusClass(action) {
    if (action.includes('success')) return 'status-running';
    if (action.includes('failed')  action.includes('failure')) return 'status-stopped';
    return 'status-unknown';
}

function getVMStatusClass(status) {
    if (status === 'running') return 'status-running';
    if (status === 'stopped') return 'status-stopped';
    return 'status-unknown';
}

async function loadAllData() {
    try {
        await Promise.all([
            loadHostConfig(),
            loadHostMetrics(),
            loadAuditLogs(),
            loadVirtualMachines()
        ]);
        
        updateLastUpdateTime();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

async function loadHostConfig() {
    try {
        const config = await api.getESXiConfig();
        
        const html = 
            `<div class="config-item">
                <div class="config-label">Хост</div>
                <div class="config-value">${config.hostname  'N/A'}</div>
            </div>
            <div class="config-item">
                <div class="config-label">Версия ESXi</div>
                <div class="config-value">${config.version  'N/A'}</div>
            </div>
            <div class="config-item">
                <div class="config-label">CPU</div>
                <div class="config-value">${config.cpu?.cores  0} ядер</div>
            </div>
            <div class="config-item">
                <div class="config-label">Память</div>
                <div class="config-value">${config.memory?.size  'N/A'}</div>
            </div>
            <div class="config-item">
                <div class="config-label">Время работы</div>
                <div class="config-value">${config.uptime  'N/A'}</div>
            </div>
        `;
        
        document.getElementById('hostConfig').innerHTML = html;
    } catch (error) {
        document.getElementById('hostConfig').innerHTML = 
            '<div class="config-item"><div class="config-value">Ошибка загрузки</div></div>';
    }
}

async function loadHostMetrics() {
    try {
        const metrics = await api.getHostMetrics();
        
        const html = `
            <div class="config-item">
                <div class="config-label">Загрузка CPU</div>
                <div class="config-value">${metrics.cpuUsage?.toFixed(1)  0}%</div>
            </div>
            <div class="config-item">
                <div class="config-label">Использование RAM</div>
                <div class="config-value">${metrics.memoryUsage?.toFixed(1)  0}%</div>
            </div>
            <div class="config-item">
                <div class="config-label">Время работы</div>
                <div class="config-value">${metrics.uptime  'N/A'}</div>
            </div>
            <div class="config-item">
                <div class="config-label">Обновлено</div>
                <div class="config-value">${new Date(metrics.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
        
        document.getElementById('hostMetrics').innerHTML = html;
    } catch (error) {
        document.getElementById('hostMetrics').innerHTML = 
            '<div class="config-item"><div class="config-value">Ошибка загрузки</div></div>';
    }
}
async function loadAuditLogs() {
    try {
        const logs = await api.getAuditLogs();
        auditData.allLogs = logs;
        
        renderAuditTable();
        updateAuditPaginationInfo();
    } catch (error) {
        document.querySelector('#auditTable tbody').innerHTML = 
            '<tr><td colspan="5" style="text-align: center; color: #718096;">Ошибка загрузки логов</td></tr>';
    }
}

// Отображение таблицы аудита
function renderAuditTable() {
    const startIndex = (auditData.currentPage - 1) * auditData.itemsPerPage;
    const endIndex = startIndex + auditData.itemsPerPage;
    const pageLogs = auditData.allLogs.slice(startIndex, endIndex);
    
    if (pageLogs.length === 0) {
        document.querySelector('#auditTable tbody').innerHTML = 
            '<tr><td colspan="5" style="text-align: center; color: #718096;">Нет данных</td></tr>';
        return;
    }
    
    const rows = pageLogs.map(log => {
        const timestamp = log.timestamp  'N/A';
        const user = log.user  'unknown';
        const ip = log.ip  'N/A';
        const action = getActionText(log.action);
        const statusClass = getStatusClass(log.action);
        
        return `
            <tr>
                <td>${timestamp}</td>
                <td>${user}</td>
                <td>${ip}</td>
                <td>${action}</td>
                <td><span class="status-badge ${statusClass}">${log.action}</span></td>
            </tr>
        `;
    }).join('');
    
    document.querySelector('#auditTable tbody').innerHTML = rows;
}

async function loadVirtualMachines() {
    try {
        const vms = await api.getVirtualMachines();
        vmsData.allVMs = vms;
        
        renderVMsTable();
        updateVMsPaginationInfo();
    } catch (error) {
        document.querySelector('#vmsTable tbody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center; color: #718096;">Ошибка загрузки ВМ</td></tr>';
    }
}

// Отображение таблицы ВМ
function renderVMsTable() {
    const startIndex = (vmsData.currentPage - 1) * vmsData.itemsPerPage;
    const endIndex = startIndex + vmsData.itemsPerPage;
    const pageVMs = vmsData.allVMs.slice(startIndex, endIndex);
    
    if (pageVMs.length === 0) {
        document.querySelector('#vmsTable tbody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center; color: #718096;">Нет виртуальных машин</td></tr>';
        return;
    }
    
    const rows = pageVMs.map(vm => {
        const statusClass = getVMStatusClass(vm.status);
        
        return `
            <tr>
                <td>${vm.id}</td>
                <td><strong>${vm.name}</strong></td>
                <td><span class="status-badge ${statusClass}">${vm.status}</span></td>
                <td>${vm.guestOS  'Unknown'}</td>
                <td>${vm.cpu  2} ядер</td>
                <td>${vm.ram  2048} MB</td>
                <td>${vm.storage || 50} GB</td>
            </tr>
        `;
    }).join('');
    
    document.querySelector('#vmsTable tbody').innerHTML = rows;
}

function updateAuditPaginationInfo() {
    const totalPages = Math.ceil(auditData.allLogs.length / auditData.itemsPerPage);
    document.getElementById('auditPageInfo').textContent = 
        `Страница ${auditData.currentPage} из ${totalPages}`;
}

function updateVMsPaginationInfo() {
    const totalPages = Math.ceil(vmsData.allVMs.length / vmsData.itemsPerPage);
    document.getElementById('vmsPageInfo').textContent = 
        `Страница ${vmsData.currentPage} из ${totalPages}`;
}

function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

// Синхронизация с ESXi
async function syncWithESXi() {
    try {
        await api.syncNow();
        alert('Синхронизация запущена');
        
        setTimeout(() => {
            loadAllData();
        }, 3000);
    } catch (error) {
        alert('Ошибка синхронизации: ' + error.message);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    if (!api.checkAuth()) return;
    
    const user = api.getUser();
    if (user && document.getElementById('userEmail')) {
        document.getElementById('userEmail').textContent = user.email;
    }
    
    loadAllData();
    setInterval(loadAllData, 30000);
    
    // Обработчики кнопок
    document.getElementById('refreshBtn').addEventListener('click', loadAllData);
    document.getElementById('syncBtn').addEventListener('click', syncWithESXi);
    document.getElementById('logoutBtn').addEventListener('click', api.logout);
    
    document.getElementById('auditPrevBtn').addEventListener('click', () => {
        if (auditData.currentPage > 1) {
            auditData.currentPage--;
            renderAuditTable();
            updateAuditPaginationInfo();
        }
    });
    
    document.getElementById('auditNextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(auditData.allLogs.length / auditData.itemsPerPage);
        if (auditData.currentPage < totalPages) {
            auditData.currentPage++;
            renderAuditTable();
            updateAuditPaginationInfo();
        }
    });
    
    document.getElementById('vmsPrevBtn').addEventListener('click', () => {
        if (vmsData.currentPage > 1) {
            vmsData.currentPage--;
            renderVMsTable();
            updateVMsPaginationInfo();
        }
    });
    
    document.getElementById('vmsNextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(vmsData.allVMs.length / vmsData.itemsPerPage);
        if (vmsData.currentPage < totalPages) {
            vmsData.currentPage++;
            renderVMsTable();
            updateVMsPaginationInfo();
        }
    });
});

