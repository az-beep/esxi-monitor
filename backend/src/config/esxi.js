const { Client } = require('vmware-vsphere');
const { NodeSSH } = require('node-ssh');

class ESXiClient {
    constructor() {
        this.client = null;
        this.ssh = new NodeSSH();
        this.config = {
            host: process.env.ESXI_HOST || '192.168.1.100',
            user: process.env.ESXI_USER || 'root',
            password: process.env.ESXI_PASSWORD || 'password',
            port: process.env.ESXI_PORT || 443,
            sshPort: process.env.ESXI_SSH_PORT || 22
        };
    }

    async connect() {
        try {
            this.client = new Client({
                host: this.config.host,
                username: this.config.user,
                password: this.config.password,
                port: this.config.port,
                ssl: true
            });
            
            await this.client.connect();
            console.log('ESXi подключен успешно');
            return true;
        } catch (error) {
            console.error('Ошибка подключения к ESXi:', error);
            return false;
        }
    }

    async connectSSH() {
        try {
            await this.ssh.connect({
                host: this.config.host,
                username: this.config.user,
                password: this.config.password,
                port: this.config.sshPort
            });
            return true;
        } catch (error) {
            console.error('Ошибка SSH подключения:', error);
            return false;
        }
    }

    async getVMs() {
        if (!this.client) await this.connect();
        
        try {
            const vms = await this.client.getVirtualMachines();
            return vms.map(vm => ({
                id: vm.id,
                name: vm.name,
                status: vm.powerState === 'poweredOn' ? 'running' : 'stopped',
                cpu: vm.config.hardware.numCPU,
                ram: vm.config.hardware.memoryMB,
                storage: vm.config.hardware.storage,
                ipAddress: vm.guest?.ipAddress,
                guestOS: vm.config.guestFullName,
                config: vm.config,
                lastBoot: vm.runtime.bootTime
            }));
        } catch (error) {
            console.error('Ошибка получения списка VM:', error);
            return [];
        }
    }

    async getESXiConfig() {
        if (!this.client) await this.connect();
        
        try {
            const host = await this.client.getHostSystem();
            return {
                name: host.name,
                version: host.config.product.version,
                build: host.config.product.build,
                cpuModel: host.hardware.cpuModel,
                cpuCores: host.hardware.numCpuCores,
                cpuThreads: host.hardware.numCpuThreads,
                memory: (host.hardware.memorySize / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                vendor: host.hardware.vendor,
                model: host.hardware.model,
                uptime: host.summary.quickStats.uptime,
                network: host.config.network,
                storage: host.config.storageDevice,
                licenses: host.config.license
            };
        } catch (error) {
            console.error('Ошибка получения конфигурации ESXi:', error);
            return null;
        }
    }

    async getAuditLogs() {
        if (!this.ssh.isConnected()) await this.connectSSH();
        
        try {
            // Получение логов аутентификации ESXi
            const authLogs = await this.ssh.execCommand('grep "User Login" /var/log/auth.log | tail -50');
            const shellLogs = await this.ssh.execCommand('grep "Accepted password" /var/log/secure | tail -50');
            
            const logs = [];
            if (authLogs.stdout) {
                authLogs.stdout.split('\n').forEach(line => {
                    if (line.trim()) {
                        const parts = line.split(' ');
                        logs.push({
                            timestamp: parts.slice(0, 3).join(' '),
                            user: line.match(/user=(\w+)/)?.[1] || 'unknown',
                            ip: line.match(/src=([\d\.]+)/)?.[1] || 'unknown',
                            action: 'ESXi Login',
                            source: 'auth.log'
                        });
                    }
                });
            }
            
            return logs;
        } catch (error) {
            console.error('Ошибка получения логов аудита:', error);
            return [];
        }
    }

    async getVMAuditLogs(vmId) {
        // Для получения логов VM нужно подключение к гостевой ОС
        // Здесь будет реализация через VMware Tools или SSH
        return [];
    }

    disconnect() {
        if (this.client) {
            this.client.disconnect();
        }
        if (this.ssh.isConnected()) {
            this.ssh.dispose();
        }
    }
}

module.exports = new ESXiClient();