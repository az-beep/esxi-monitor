const esxiClient = require("../config/esxi");
const { Vm, EsxiHost, ActionLog } = require("../models");
const { telegramNotifier } = require('../controllers/notification.controller');

class SyncService {
    constructor() {
        this.syncInterval = null;
        this.isSyncing = false;
    }
    
    async startSync(interval = 300000) {
        console.log('Запуск синхронизации с ESXi...');
        
        // Первоначальная синхронизация
        await this.syncAll();
        
        // Периодическая синхронизация
        this.syncInterval = setInterval(async () => {
            if (!this.isSyncing) {
                await this.syncAll();
            }
        }, interval);
    }
    
    async syncAll() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        try {
            console.log('Синхронизация данных с ESXi...');
            
            // Уведомление о начале синхронизации
            if (telegramNotifier.enabled) {
                telegramNotifier.sendMessage(
                    telegramNotifier.formatAlert('sync_started', {
                        host: esxiClient.config.host,
                        time: new Date().toLocaleString()
                    })
                ).catch(err => {});
            }
            
            // 1. Получаем конфигурацию ESXi
            const esxiConfig = await esxiClient.getESXiConfig();
            
            if (esxiConfig) {
                // Сохраняем/обновляем хост ESXi
                await EsxiHost.upsert({
                    hostname: esxiConfig.name,
                    ip: esxiClient.config.host,
                    version: esxiConfig.version,
                    status: 'connected',
                    cpuModel: esxiConfig.cpuModel,
                    cpuCores: esxiConfig.cpuCores,
                    memory: esxiConfig.memory,
                    uptime: esxiConfig.uptime,
                    lastSync: new Date(),
                    configJson: esxiConfig
                });
                
                // Уведомление о получении конфигурации ESXi
                if (telegramNotifier.enabled) {
                    telegramNotifier.sendMessage(
                        telegramNotifier.formatAlert('esxi_config', {
                            host: esxiConfig.name,
                            version: esxiConfig.version,
                            cpu: `${esxiConfig.cpuCores} cores (${esxiConfig.cpuModel})`,
                            memory: esxiConfig.memory,
                            uptime: esxiConfig.uptime + ' hours'
                        })
                    ).catch(err => {});
                }
            }
            
            // 2. Получаем список VM
            const vms = await esxiClient.getVMs();
            
            // 3. Сохраняем VM в базу
            for (const vmData of vms) {
                await Vm.upsert({
                    id: vmData.id,
                    name: vmData.name,
                    status: vmData.status,
                    cpu: vmData.cpu,
                    ram: vmData.ram,
                    storage: vmData.storage,
                    ipAddress: vmData.ipAddress,
                    guestOS: vmData.guestOS,
                    esxiHostId: esxiConfig?.name || esxiClient.config.host,
                    configJson: vmData.config,
                    lastSync: new Date(),
                    lastBoot: vmData.lastBoot
                });
            }
            
            // 4. Получаем логи аудита
            const auditLogs = await esxiClient.getAuditLogs();
            
            // 5. Сохраняем логи аудита
            for (const log of auditLogs) {
                await ActionLog.create({
                    userId: 1, // Системный пользователь
                    action: log.action,
                    details: JSON.stringify(log),
                    timestamp: new Date(log.timestamp || Date.now())
                });
                
                // Уведомление о входе в ESXi
                if (log.action === 'ESXi Login' && telegramNotifier.enabled) {
                    telegramNotifier.sendMessage(
                        telegramNotifier.formatAlert('esxi_login', {
                            host: esxiConfig?.name || esxiClient.config.host,
                            user: log.user,
                            ip: log.ip,
                            timestamp: log.timestamp
                        }),
                        { silent: true }
                    ).catch(err => {});
                }
            }
            
            // 6. Логируем успешную синхронизацию
            await ActionLog.create({
                userId: 1, // Системный пользователь
                action: "Синхронизация с ESXi",
                details: `Синхронизировано ${vms.length} VM, ${auditLogs.length} логов`
            });
            
            console.log(`Синхронизация завершена. VM: ${vms.length}, Логи: ${auditLogs.length}`);
            
            // Уведомление о завершении синхронизации
            if (telegramNotifier.enabled) {
                telegramNotifier.sendMessage(
                    telegramNotifier.formatAlert('sync_completed', {
                        host: esxiConfig?.name || esxiClient.config.host,
                        vmCount: vms.length,
                        logCount: auditLogs.length
                    })
                ).catch(err => {});
            }
            
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            
            await ActionLog.create({
                userId: 1,
                action: "Ошибка синхронизации",
                details: error.message
            });
            
            if (telegramNotifier.enabled) {
                telegramNotifier.sendMessage(
                    telegramNotifier.formatAlert('sync_error', {
                        host: esxiClient.config.host,
                        error: error.message
                    })
                ).catch(err => {});
            }
            
        } finally {
            this.isSyncing = false;
        }
    }
    
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    getStatus() {
        return {
            isSyncing: this.isSyncing,
            interval: this.syncInterval ? 'active' : 'stopped',
            lastSync: new Date()
        };
    }
}

module.exports = new SyncService();