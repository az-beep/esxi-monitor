const ESXiClient = require("../config/esxi");
const { Vm, EsxiHost, EsxiAuditLog, Metric } = require("../models");
const { telegramNotifier } = require('../controllers/notification.controller');

class SyncService {
    constructor() {
        this.esxiClient = new ESXiClient();
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastSync = null;
    }
    
    async startSync(interval = 120000) {
        console.log('🔄 Запуск синхронизации с ESXi...');
        
        try {
            await this.esxiClient.connect();
            await this.syncAll();
            
            this.syncInterval = setInterval(async () => {
                if (!this.isSyncing) {
                    await this.syncAll();
                }
            }, interval);
            
        } catch (error) {
            console.error('❌ Не удалось запустить синхронизацию:', error.message);
        }
    }
    
    async syncAll() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        console.log('📡 Начало синхронизации...');
        
        try {
            if (!this.esxiClient.connected) {
                await this.esxiClient.connect();
            }
            
            if (telegramNotifier.enabled) {
                telegramNotifier.sendMessage(
                    telegramNotifier.formatAlert('sync_started', {
                        host: this.esxiClient.config.host,
                        time: new Date().toLocaleString()
                    })
                ).catch(err => console.error('Telegram error:', err));
            }
            
            // 1. Конфигурация ESXi
            const esxiConfig = await this.esxiClient.getESXiConfig();
            if (esxiConfig) {
                await this.saveESXiConfig(esxiConfig);
            }
            
            // 2. Виртуальные машины
            const vms = await this.esxiClient.getVMs();
            await this.saveVMs(vms);
            
            // 3. Метрики
            await this.collectMetrics();
            
            // 4. Логи аудита
            const auditLogs = await this.esxiClient.getAuditLogs();
            await this.saveAuditLogs(auditLogs);
            
            this.lastSync = new Date();
            console.log(`✅ Синхронизация завершена: ${vms.length} VM, ${auditLogs.length} логов`);
            
            if (telegramNotifier.enabled) {
                telegramNotifier.sendMessage(
                    telegramNotifier.formatAlert('sync_completed', {
                        host: this.esxiClient.config.host,
                        vmCount: vms.length,
                        logCount: auditLogs.length
                    })
                ).catch(err => console.error('Telegram error:', err));
            }
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error.message);
            
            if (telegramNotifier.enabled) {
                telegramNotifier.sendMessage(
                    telegramNotifier.formatAlert('sync_error', {
                        host: this.esxiClient.config.host,
                        error: error.message
                    })
                ).catch(err => console.error('Telegram error:', err));
            }
            
        } finally {
            this.isSyncing = false;
        }
    }
    
    async saveESXiConfig(config) {
        try {
            await EsxiHost.upsert({
                hostname: config.hostname,
                ip: this.esxiClient.config.host,
                version: config.version,
                status: 'connected',
                cpuModel: config.cpu?.model || 'Unknown',
                cpuCores: config.cpu?.cores || 0,
                memory: config.memory?.size || '0 GB',
                uptime: config.uptime,
                lastSync: new Date(),
                configJson: config
            });
            
            console.log(`✅ Конфигурация ESXi сохранена: ${config.hostname}`);
            
            if (telegramNotifier.enabled) {
                telegramNotifier.sendMessage(
                    telegramNotifier.formatAlert('esxi_config', {
                        host: config.hostname,
                        version: config.version,
                        cpu: `${config.cpu?.cores || 0} cores`,
                        memory: config.memory?.size || '0 GB',
                        uptime: config.uptime
                    })
                ).catch(err => {});
            }
            
        } catch (error) {
            console.error('Ошибка сохранения конфигурации ESXi:', error);
        }
    }
    
    async saveVMs(vms) {
        let savedCount = 0;
        
        for (const vmData of vms) {
            try {
                await Vm.upsert({
                    id: vmData.id,
                    name: vmData.name,
                    status: vmData.status,
                    cpu: 2,
                    ram: 2048,
                    storage: 50,
                    guestOS: vmData.guestOS,
                    esxiHostId: this.esxiClient.config.host,
                    configJson: vmData,
                    lastSync: new Date()
                });
                savedCount++;
                
                if (telegramNotifier.enabled && vmData.status === 'running') {
                    telegramNotifier.sendMessage(
                        telegramNotifier.formatAlert('vm_config', {
                            vmName: vmData.name,
                            cpu: '2 ядер',
                            ram: '2048 MB',
                            storage: '50 GB',
                            os: vmData.guestOS || 'Unknown',
                            status: vmData.status,
                            ip: 'N/A'
                        })
                    ).catch(err => {});
                }
                
            } catch (error) {
                console.error(`Ошибка сохранения VM ${vmData.name}:`, error.message);
            }
        }
        
        console.log(`✅ Сохранено VM: ${savedCount}/${vms.length}`);
        return savedCount;
    }
    
    async collectMetrics() {
        try {
            await Metric.create({
                cpu: Math.random() * 100,
                ram: Math.random() * 100,
                rom: Math.random() * 100,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Ошибка сбора метрик:', error);
        }
    }
    
    async saveAuditLogs(logs) {
        let savedCount = 0;
        
        for (const log of logs) {
            try {
                // ИСПРАВЛЕНО: Используем EsxiAuditLog вместо ActionLog
                await EsxiAuditLog.create({
                    timestamp: new Date(log.timestamp || Date.now()),
                    username: log.user,
                    ip: log.ip,
                    action: log.action,
                    details: JSON.stringify(log),
                    source: 'ESXi'
                });
                savedCount++;
                
                if (log.action === 'login_success' && telegramNotifier.enabled) {
                    telegramNotifier.sendMessage(
                        telegramNotifier.formatAlert('esxi_login', {
                            host: this.esxiClient.config.host,
                            user: log.user,
                            ip: log.ip,
                            timestamp: log.timestamp
                        }),
                        { silent: true }
                    ).catch(err => {});
                }
                
            } catch (error) {
                console.error('Ошибка сохранения лога:', error);
            }
        }
        
        console.log(`✅ Сохранено логов: ${savedCount}/${logs.length}`);
        return savedCount;
    }
    
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.esxiClient.disconnect();
        console.log('⏹️ Синхронизация остановлена');
    }
    
    getStatus() {
        return {
            isSyncing: this.isSyncing,
            connected: this.esxiClient.connected,
            lastSync: this.lastSync,
            host: this.esxiClient.config.host
        };
    }
}

module.exports = new SyncService();