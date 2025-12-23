const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:5000'  
  : 'http://backend:5000';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../index.html';
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (response.status === 204) {
                return { success: true };
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    // Хосты
    getESXiById(esxiId) {
        return this.request(`/esxi/${esxiId}`);
    }


    // ВМ
    getAllVMs() {
        return this.request('/vm');
    }

    getVMById(vmId) {
        return this.request(`/vm/${vmId}`);
    }

    createVM(vmData) {
        return this.request('/vm', {
            method: 'POST',
            body: JSON.stringify(vmData),
        });
    }

    updateVM(vmId, vmData) {
        return this.request(`/vm/${vmId}`, {
            method: 'PUT',
            body: JSON.stringify(vmData),
        });
    }

    deleteVM(vmId) {
        return this.request(`/vm/${vmId}`, {
            method: 'DELETE',
        });
    }

    startVM(vmId) {
        return this.request(`/vm/${vmId}/start`, {
            method: 'POST',
        });
    }

    stopVM(vmId) {
        return this.request(`/vm/${vmId}/stop`, {
            method: 'POST',
        });
    }

    // метрики
    getVMMetrics(vmId) {
        return this.request(`/metrics/vm/${vmId}`);
    }

    getLatestMetrics() {
        return this.request('/metrics/latest');
    }

    addMetric(metricData) {
        return this.request('/metrics', {
            method: 'POST',
            body: JSON.stringify(metricData),
        });
    }

    //Хосты
    getESXiHosts() {
        return this.request('/esxi');
    }

    getESXiById(esxiId) {
        return this.request(`/esxi/${esxiId}`);
    }

    createESXiHost(esxiData) {
        return this.request('/esxi/add', {
            method: 'POST',
            body: JSON.stringify(esxiData),
        });
    }

    // Логирование
    getAuditLogs() {
        return this.request('/logs');
    }

    // юзеры
    getAllUsers() {
        return this.request('/users');
    }

    createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE',
        });
    }
}

const api = new ApiService();
export default api;