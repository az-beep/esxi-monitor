const API_BASE_URL = 'http://localhost:5000';

function getAuthToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        console.error('Бэкенд недоступен:', error);
        return false;
    }
}

async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = Bearer `${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 401) {
            // Неавторизован - разлогиниваем
            logout();
            throw new Error('Сессия истекла');
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error  `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

async function login(email, password) {
    return await apiRequest('/auth/login', 'POST', { email, password });
}

async function getESXiConfig() {
    return await apiRequest('/api/esxi/config');
}

async function getHostMetrics() {
    return await apiRequest('/api/esxi/metrics');
}

async function getAuditLogs() {
    return await apiRequest('/api/esxi/audit');
}

async function getVirtualMachines() {
    return await apiRequest('/api/vms');
}

async function getVMConfig(vmId) {
    return await apiRequest(`/api/vms/${vmId}/config`);
}

async function syncNow() {
    return await apiRequest('/api/sync/now', 'POST');
}

async function getSyncStatus() {
    return await apiRequest('/api/sync/status');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function checkAuth() {
    const token = getAuthToken();
    const user = getUser();
    
    if (!token || !user) {
        if (!window.location.href.includes('index.html')) {
            window.location.href = 'index.html';
        }
        return false;
    }
    
    return true;
}

window.api = {
    API_BASE_URL,
    getAuthToken,
    getUser,
    checkBackendStatus,
    apiRequest,
    login,
    getESXiConfig,
    getHostMetrics,
    getAuditLogs,
    getVirtualMachines,
    getVMConfig,
    syncNow,
    getSyncStatus,
    logout,
    checkAuth
};
