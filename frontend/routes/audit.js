import api from './api.js';
import { logout } from './auth.js';

let currentPage = 1;
const itemsPerPage = 10;
let allLogs = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '../index.html';
        return;
    }

    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    await loadAuditLogs();
    setupFilters();

    const refreshBtn = document.querySelector('.btn-primary');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadAuditLogs();
        });
    }
});

async function loadAuditLogs() {
    try {
        const logs = await api.getAuditLogs();
        allLogs = logs;
        updateAuditTable();
        updatePagination();
    } catch (error) {
        console.error('Error loading audit logs:', error);
        showEmptyState();
    }
}

function updateAuditTable() {
    const tableBody = document.querySelector('.data-table tbody');
    tableBody.innerHTML = '';

    if (!allLogs || allLogs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 40px; color: #718096;">
                Нет данных для отображения
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    // пагинация страниц таблицы
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageLogs = allLogs.slice(startIndex, endIndex);

    pageLogs.forEach((log, index) => {
        const row = document.createElement('tr');
        
        let actionColor = '#718096';
        if (log.action.includes('Вход') || log.action.includes('login')) actionColor = '#3182ce';
        if (log.action.includes('Создан') || log.action.includes('create')) actionColor = '#48bb78';
        if (log.action.includes('Изменен') || log.action.includes('update')) actionColor = '#ed8936';
        if (log.action.includes('Удален') || log.action.includes('delete')) actionColor = '#f56565';
        if (log.action.includes('Запуск') || log.action.includes('start')) actionColor = '#805ad5';
        if (log.action.includes('Остановка') || log.action.includes('stop')) actionColor = '#d53f8c';
        
        const vmName = log.Vm ? log.Vm.name : '-';
        const userName = log.User ? log.User.email : 'Неизвестный пользователь';
        
        row.innerHTML = `
            <td>${log.id || startIndex + index + 1}</td>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td><strong>${userName}</strong></td>
            <td><span style="color: ${actionColor}; font-weight: 500;">${log.action}</span></td>
            <td>${vmName}</td>
            <td>${getActionDetails(log)}</td>
            <td>${log.ip || 'N/A'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}


//Определние действий пользователя
function getActionDetails(log) {
    if (log.details) return log.details;
    
    if (log.action.includes('Вход')) return 'Успешная аутентификация';
    if (log.action.includes('Создан')) return 'Создана новая запись';
    if (log.action.includes('Изменен')) return 'Конфигурация изменена';
    if (log.action.includes('Удален')) return 'Запись удалена';
    if (log.Vm) return `VM: ${log.Vm.name}`;
    
    return 'Действие выполнено';
}

function updatePagination() {
    const totalPages = Math.ceil(allLogs.length / itemsPerPage);
    const pageInfo = document.querySelector('.pagination span');
    
    if (pageInfo) {
        pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    }

    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                updateAuditTable();
                updatePagination();
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateAuditTable();
                updatePagination();
            }
        };
    }
}

function setupFilters() {
    const applyBtn = document.querySelector('.btn-secondary');
    const fromDate = document.querySelector('input[type="date"]:first-child');
    const toDate = document.querySelector('input[type="date"]:last-child');

    if (applyBtn && fromDate && toDate) {
        applyBtn.addEventListener('click', () => {
            const from = fromDate.value ? new Date(fromDate.value) : null;
            const to = toDate.value ? new Date(toDate.value + 'T23:59:59') : null;

            if (from && to) {
                const filteredLogs = allLogs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= from && logDate <= to;
                });
                
                allLogs = filteredLogs;
                currentPage = 1;
                updateAuditTable();
                updatePagination();
            }
        });
    }
}

function showEmptyState() {
    const tableBody = document.querySelector('.data-table tbody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 50px;">
                <div style="color: #718096; font-size: 16px; margin-bottom: 10px;">
                    📊 Данные аудита пока не загружены
                </div>
                <button class="btn btn-primary" onclick="location.reload()">
                    Обновить страницу
                </button>
            </td>
        </tr>
    `;
}