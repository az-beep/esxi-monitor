const { Vm, EsxiHost, Metric, ActionLog, User } = require("../models");
const { telegramNotifier } = require('./notification.controller');

exports.getAllVms = async (req, res) => {
  try {
    const vms = await Vm.findAll({ include: EsxiHost });
    res.json(vms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVmById = async (req, res) => {
  try {
    const vm = await Vm.findByPk(req.params.id, { include: [EsxiHost, Metric] });
    if (!vm) {
      return res.status(404).json({ error: "ВМ не найдена" });
    }
    res.json(vm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createVm = async (req, res) => {
  try {
    const { name, cpu, ram, rom, esxiHostId } = req.body;

    const existingVm = await Vm.findOne({ where: { name } });
    if (existingVm) {
      return res.status(400).json({ error: "VM с таким именем уже существует" });
    }
    
    //const esxiHost = await EsxiHost.findByPk(esxiHostId);
    //if (!esxiHost) {
    //  return res.status(404).json({ error: "ESXi хост не найден" });
    //}
    const vm = await Vm.create({
      name,
      cpu,
      ram,
      rom,
      //esxiHostId,
      status: "stopped",
    });

    await ActionLog.create({
      userId: req.user.id,
      vmId: vm.id,
      action: "Создание VM",
      details: `Имя: ${name}, CPU: ${cpu}%, RAM: ${ram} MB, ROM: ${rom} GB`
    });

    // тг увед
    if (telegramNotifier.enabled) {
      telegramNotifier.sendMessage(
        telegramNotifier.formatAlert('vm_created', {
          vmName: vm.name,
          cpu: cpu,
          ram: ram,
          rom: rom,
          userEmail: req.user.email
        })
      ).catch(err => {});
    }

    res.status(201).json(vm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateVm = async (req, res) => {
  try {
    const vm = await Vm.findByPk(req.params.id);
    if (!vm) {
      return res.status(404).json({ error: "ВМ не найдена" });
    }
    const { name, cpu, ram, rom, status, esxiHostId } = req.body;
    await vm.update({ name, cpu, ram, rom, status, esxiHostId });

    await ActionLog.create({
      userId: req.user.id,
      vmId: vm.id,
      action: "Обновление VM",
    });

    // тг увед
    if (telegramNotifier.enabled) {
      telegramNotifier.sendMessage(
        telegramNotifier.formatAlert('vm_updated', {
          vmName: name,
          status: status,
          userEmail: req.user.email
        })
      ).catch(err => {});
    }
    
    res.json(vm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteVm = async (req, res) => {
  try {
    const vm = await Vm.findByPk(req.params.id);
    if (!vm) {
      return res.status(404).json({ error: "ВМ не найдена" });
    }
    const vmInfo = {
      name: vm.name,
      cpu: vm.cpu,
      ram: vm.ram,
      rom: vm.rom,
      status: vm.status
    };

    await vm.destroy();

    await ActionLog.create({
      userId: req.user.id,
      action: "Удаление VM",
      details: `Имя: ${vmInfo.name}, CPU: ${vmInfo.cpu}%, RAM: ${vmInfo.ram} MB, ROM: ${vmInfo.rom} GB, Статус: ${vmInfo.status}`
    });

    // тг увед
    if (telegramNotifier.enabled) {
      telegramNotifier.sendMessage(
        telegramNotifier.formatAlert('vm_deleted', {
          vmName: vm.name,
          userEmail: req.user.email
        })
      ).catch(err => {});
    }

    res.json({ message: "ВМ успешно удалена" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Запуск/остановка VM (имитация)
exports.startVm = async (req, res) => {
  try {
    const vm = await Vm.findByPk(req.params.id);
    if (!vm) {
      return res.status(404).json({ error: "ВМ не найдена" });
    }

    const oldStatus = vm.status;
    await vm.update({ status: "running" });

    await ActionLog.create({
      userId: req.user.id,
      vmId: vm.id,
      action: "Запуск VM",
      details: `ВМ: ${vm.name}, Статус: ${oldStatus} → running`
    });

    // тг увед
    if (telegramNotifier.enabled) {
      telegramNotifier.sendMessage(
        telegramNotifier.formatAlert('vm_status', {
          vmName: vm.name,
          oldStatus: oldStatus,
          newStatus: 'running',
          userEmail: req.user.email
        })
      ).catch(err => console.error('Ошибка уведомления:', err));
    }

    res.json({ message: "ВМ запущена", vm });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.stopVm = async (req, res) => {
  try {
    const vm = await Vm.findByPk(req.params.id);
    if (!vm) {
      return res.status(404).json({ error: "ВМ не найдена" });
    }
    const oldStatus = vm.status;
    await vm.update({ status: "stopped" });

    await ActionLog.create({
      userId: req.user.id,
      vmId: vm.id,
      action: "Остановка VM",
      details: `ВМ: ${vm.name}, Статус: ${oldStatus} → stopped`
    });

    if (telegramNotifier.enabled) {
      telegramNotifier.sendMessage(
        telegramNotifier.formatAlert('vm_status', {
          vmName: vm.name,
          oldStatus: oldStatus,
          newStatus: 'stopped',
          userEmail: req.user.email
        })
      ).catch(err => console.error('Ошибка уведомления:', err));
    }

    res.json({ message: "ВМ остановлена", vm });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};