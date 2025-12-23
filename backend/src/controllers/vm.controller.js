const { Vm, EsxiHost, Metric, ActionLog, User } = require("../models");
const esxiClient = require("../config/esxi");
const { telegramNotifier } = require('./notification.controller');

exports.getAllVms = async (req, res) => {
    try {
        // Получаем VM из базы (синхронизированные данные)
        const vms = await Vm.findAll({ 
            order: [['name', 'ASC']],
            include: [{ model: Metric, limit: 10, order: [['timestamp', 'DESC']] }]
        });
        
        res.json(vms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getVmById = async (req, res) => {
    try {
        const vm = await Vm.findByPk(req.params.id, { 
            include: [Metric] 
        });
        
        if (!vm) {
            return res.status(404).json({ error: "ВМ не найдена" });
        }
        
        res.json(vm);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getVMLiveMetrics = async (req, res) => {
    try {
        // Получение реальных метрик VM с ESXi
        const vms = await esxiClient.getVMs();
        const vm = vms.find(v => v.id === req.params.id);
        
        if (!vm) {
            return res.status(404).json({ error: "ВМ не найдена на ESXi" });
        }
        
        // Сохраняем метрики в базу
        const metric = await Metric.create({
            vmId: vm.id,
            cpu: vm.cpu,
            ram: vm.ram,
            storage: vm.storage,
            timestamp: new Date()
        });
        
        res.json({
            vm: vm.name,
            metrics: {
                cpu: vm.cpu,
                ram: vm.ram,
                storage: vm.storage,
                status: vm.status,
                timestamp: new Date()
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// УДАЛЕНЫ ВСЕ МЕТОДЫ УПРАВЛЕНИЯ (createVm, updateVm, deleteVm, startVm, stopVm)