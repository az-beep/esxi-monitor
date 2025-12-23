const { NodeSSH } = require('node-ssh');

class ESXiClient {
    constructor() {
        this.ssh = new NodeSSH();
        this.config = {
            host: '192.168.56.10',
            username: 'root',
            password: 'password', // ваш пароль
            port: 22,
            readyTimeout: 15000,
            tryKeyboard: true // ESXi часто требует keyboard-interactive
        };
        this.connected = false;
    }

    async connect() {
        try {
            await this.ssh.connect({
                host: this.config.host,
                username: this.config.username,
                password: this.config.password,
                port: this.config.port,
                readyTimeout: this.config.readyTimeout,
                tryKeyboard: this.config.tryKeyboard
            });
            
            this.connected = true;
            console.log('✅ SSH подключен к ESXi');
            return true;
        } catch (error) {
            console.error('❌ Ошибка подключения SSH:', error.message);
            throw error;
        }
    }

    async executeCommand(command) {
        if (!this.connected) {
            throw new Error('SSH не подключен');
        }

        try {
            const result = await this.ssh.execCommand(command);
            
            if (result.code === 0) {
                return result.stdout.trim();
            } else {
                throw new Error(`Команда завершилась с кодом ${result.code}: ${result.stderr}`);
            }
        } catch (error) {
            console.error('Ошибка выполнения команды:', error.message);
            throw error;
        }
    }

    async getVMs() {
        try {
            const output = await this.executeCommand('vim-cmd vmsvc/getallvms');
            return await this.parseVMs(output);
        } catch (error) {
            console.error('Ошибка получения VM:', error.message);
            return [];
        }
    }

    async parseVMs(output) {
        const lines = output.split('\n');
        const vms = [];
        
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].trim().split(/\s+/);
            if (parts.length >= 6) {
                vms.push({
                    id: parts[0],
                    name: parts[1],
                    file: parts[2],
                    guestOS: parts[3],
                    version: parts[4],
                    annotation: parts.slice(5).join(' '),
                    status: 'unknown'
                });
            }
        }
        
        // Получаем статусы для каждой VM
        for (const vm of vms) {
            try {
                const statusOutput = await this.executeCommand(`vim-cmd vmsvc/power.getstate ${vm.id}`);
                const isRunning = statusOutput.includes('Powered on');
                vm.status = isRunning ? 'running' : 'stopped';
            } catch (e) {
                vm.status = 'unknown';
            }
        }
        
        return vms;
    }

    async getESXiConfig() {
        try {
            const hostname = await this.executeCommand('hostname');
            const version = await this.executeCommand('vmware -v');
            const uptime = await this.executeCommand('uptime');
            const cpuInfo = await this.executeCommand('esxcli hardware cpu list');
            const memoryInfo = await this.executeCommand('esxcli hardware memory get');
            const storageInfo = await this.executeCommand('esxcli storage filesystem list');
            const networkInfo = await this.executeCommand('esxcli network nic list');

            return {
                hostname: hostname.trim(),
                version: version.trim(),
                uptime: uptime.trim(),
                cpu: this.parseCpuInfo(cpuInfo),
                memory: this.parseMemoryInfo(memoryInfo),
                storage: this.parseStorageInfo(storageInfo),
                network: this.parseNetworkInfo(networkInfo)
            };
        } catch (error) {
            console.error('Ошибка получения конфигурации ESXi:', error);
            return null;
        }
    }

    async getAuditLogs() {
        try {
            const logs = await this.executeCommand('grep -E "(Accepted password|User login:|Failed password|authentication failure)" /var/log/auth.log | tail -100');
            return this.parseAuthLogs(logs);
        } catch (error) {
            console.error('Ошибка получения логов:', error);
            return [];
        }
    }

    parseAuthLogs(output) {
        const lines = output.split('\n');
        const logs = [];
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            const timestampMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
            if (timestampMatch) {
                const timestamp = timestampMatch[1];
                const userMatch = line.match(/user[=\s](\w+)/);
                const ipMatch = line.match(/from\s+([\d\.]+)/);
                
                logs.push({
                    timestamp,
                    user: userMatch ? userMatch[1] : 'unknown',
                    ip: ipMatch ? ipMatch[1] : null,
                    action: this.getActionType(line),
                    message: line,
                    source: 'ESXi'
                });
            }
        });
        
        return logs;
    }

    getActionType(line) {
        if (line.includes('Accepted password')) return 'login_success';
        if (line.includes('Failed password')) return 'login_failed';
        if (line.includes('User login:')) return 'ui_login';
        if (line.includes('authentication failure')) return 'auth_failure';
        return 'other';
    }

    parseCpuInfo(output) {
    const lines = output.split('\n');
    const info = { model: 'Unknown', cores: '0', threads: '0' };
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine.includes('Model:')) {
            info.model = cleanLine.split(':')[1].trim();
        }
        if (cleanLine.includes('Cores Per Socket:')) {
            info.cores = cleanLine.split(':')[1].trim();
        }
        if (cleanLine.includes('Logical Processors:')) {
            info.threads = cleanLine.split(':')[1].trim();
        }
    });
    return info;
}

parseMemoryInfo(output) {
    const lines = output.split('\n');
    const info = { size: 'Unknown' };
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine.includes('Physical Memory:')) {
            // Пример: "Physical Memory: 32768 MB"
            const match = cleanLine.match(/Physical Memory:\s*(\d+)\s*MB/);
            if (match) {
                const mb = parseInt(match[1]);
                info.size = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
            }
        }
    });
    return info;
};


    parseStorageInfo(output) {
        const lines = output.split('\n');
        const storage = [];
        lines.forEach(line => {
            if (line.includes('Volume Name')) return;
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6) {
                storage.push({
                    volume: parts[0],
                    size: parts[1],
                    used: parts[2],
                    free: parts[3],
                    type: parts[4],
                    mount: parts[5]
                });
            }
        });
        return storage;
    }

    parseNetworkInfo(output) {
        const lines = output.split('\n');
        const nics = [];
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6 && parts[0] !== 'Name') {
                nics.push({
                    name: parts[0],
                    driver: parts[1],
                    link: parts[2] === 'Up',
                    speed: parts[3],
                    duplex: parts[4],
                    description: parts.slice(5).join(' ')
                });
            }
        });
        return nics;
    }

    disconnect() {
        if (this.connected) {
            this.ssh.dispose();
            this.connected = false;
            console.log('📴 SSH соединение закрыто');
        }
    }
}

module.exports = ESXiClient;