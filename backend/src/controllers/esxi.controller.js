const { EsxiHost } = require("../models");
const esxiClient = require("../config/esxi");
const { telegramNotifier } = require('./notification.controller');

exports.getESXiConfig = async (req, res) => {
    try {
        const config = await esxiClient.getESXiConfig();
        
        if (config && telegramNotifier.enabled) {
            telegramNotifier.sendMessage(
                telegramNotifier.formatAlert('esxi_config', {
                    host: config.name,
                    version: config.version,
                    cpu: `${config.cpuCores} cores (${config.cpuModel})`,
                    memory: config.memory,
                    uptime: config.uptime + ' hours'
                })
            ).catch(err => {});
        }
        
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllVMs = async (req, res) => {
    try {
        const vms = await esxiClient.getVMs();
        res.json(vms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getVMConfig = async (req, res) => {
    try {
        const vms = await esxiClient.getVMs();
        const vm = vms.find(v => v.id === req.params.id);
        
        if (!vm) {
            return res.status(404).json({ error: "VM не найдена" });
        }
        
        if (telegramNotifier.enabled) {
            telegramNotifier.sendMessage(
                telegramNotifier.formatAlert('vm_config', {
                    vmName: vm.name,
                    cpu: vm.cpu + ' ядер',
                    ram: vm.ram + ' MB',
                    storage: vm.storage + ' GB',
                    os: vm.guestOS,
                    status: vm.status,
                    ip: vm.ipAddress || 'N/A'
                })
            ).catch(err => {});
        }
        
        res.json({
            id: vm.id,
            name: vm.name,
            config: vm.config,
            metrics: {
                cpu: vm.cpu,
                ram: vm.ram,
                storage: vm.storage,
                status: vm.status,
                lastBoot: vm.lastBoot
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getESXiAuditLogs = async (req, res) => {
    try {
        const logs = await esxiClient.getAuditLogs();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getVMAuditLogs = async (req, res) => {
    try {
        const logs = await esxiClient.getVMAuditLogs(req.params.vmId);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHostMetrics = async (req, res) => {
    try {
        if (!esxiClient.client) await esxiClient.connect();
        
        const host = await esxiClient.client.getHostSystem();
        const metrics = {
            cpuUsage: host.summary.quickStats.overallCpuUsage,
            memoryUsage: host.summary.quickStats.overallMemoryUsage,
            uptime: host.summary.quickStats.uptime,
            totalVMs: host.summary.quickStats.totalVm,
            runningVMs: host.summary.quickStats.runningVm,
            storage: {
                total: host.summary.storage.total,
                used: host.summary.storage.used,
                free: host.summary.storage.free
            }
        };
        
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};