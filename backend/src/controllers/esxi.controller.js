const ESXiClient = require("../config/esxi");
const { telegramNotifier } = require('./notification.controller');

class ESXiController {
  constructor() {
    this.client = new ESXiClient();
  }

  // Получить конфигурацию ESXi хоста
  async getESXiConfig(req, res) {
    try {
      await this.client.connect();
      const config = await this.client.getESXiConfig();
      
      if (!config) {
        return res.status(404).json({ error: "Конфигурация не получена" });
      }

      // Уведомление в Telegram
      if (telegramNotifier.enabled) {
        telegramNotifier.sendMessage(
          telegramNotifier.formatAlert('esxi_config', {
            host: config.hostname,
            version: config.version,
            cpu: `${config.cpu?.cores || 0} ядер`,
            memory: config.memory?.size || 'N/A',
            uptime: config.uptime || 'N/A'
          })
        ).catch(err => console.error('Telegram error:', err));
      }

      res.json(config);
    } catch (error) {
      console.error('Ошибка получения конфигурации:', error);
      res.status(500).json({ error: error.message });
    } finally {
      this.client.disconnect();
    }
  }

  // Получить список всех VM
  async getAllVMs(req, res) {
    try {
      await this.client.connect();
      const vms = await this.client.getVMs();
      
      // Уведомление о количестве VM
      if (telegramNotifier.enabled && vms.length > 0) {
        const running = vms.filter(vm => vm.status === 'running').length;
        telegramNotifier.sendMessage(
          `📊 Собраны данные VM:\nВсего: ${vms.length}\nЗапущено: ${running}`
        ).catch(err => {});
      }

      res.json(vms);
    } catch (error) {
      console.error('Ошибка получения VM:', error);
      res.status(500).json({ error: error.message });
    } finally {
      this.client.disconnect();
    }
  }

  // Получить логи аудита (входы в ESXi)
  async getAuditLogs(req, res) {
    try {
      await this.client.connect();
      const logs = await this.client.getAuditLogs();
      
      if (telegramNotifier.enabled && logs.length > 0) {
        const recentLogs = logs.slice(0, 3);
        recentLogs.forEach(log => {
          if (log.action === 'login_success') {
            telegramNotifier.sendMessage(
              telegramNotifier.formatAlert('esxi_login', {
                host: this.client.config.host,
                user: log.user,
                ip: log.ip,
                timestamp: log.timestamp
              }),
              { silent: true }
            ).catch(err => {});
          }
        });
      }

      res.json(logs);
    } catch (error) {
      console.error('Ошибка получения логов:', error);
      res.status(500).json({ error: error.message });
    } finally {
      this.client.disconnect();
    }
  }

  // Получить метрики хоста
  async getHostMetrics(req, res) {
    try {
      await this.client.connect();
      
      // Получаем базовые метрики
      const [cpu, memory, uptime] = await Promise.all([
        this.client.executeCommand("esxtop -b -n 1 | head -5 | tail -1 | awk '{print $100}'").catch(() => "0"),
        this.client.executeCommand("free | grep Mem | awk '{print $3/$2 * 100.0}'").catch(() => "0"),
        this.client.executeCommand("uptime -p").catch(() => "N/A")
      ]);

      res.json({
        cpuUsage: parseFloat(cpu) || 0,
        memoryUsage: parseFloat(memory) || 0,
        uptime: uptime.trim(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Ошибка получения метрик:', error);
      res.status(500).json({ error: error.message });
    } finally {
      this.client.disconnect();
    }
  }

  // Получить конфигурацию конкретной VM
  async getVMConfig(req, res) {
    try {
      const vmId = req.params.id;
      await this.client.connect();
      
      // Получаем конфигурацию VM
      const config = await this.client.executeCommand(`vim-cmd vmsvc/get.config ${vmId}`);
      const status = await this.client.executeCommand(`vim-cmd vmsvc/power.getstate ${vmId}`);
      
      const vmConfig = {
        id: vmId,
        config: config,
        status: status.includes('Powered on') ? 'running' : 'stopped',
        timestamp: new Date().toISOString()
      };

      // Уведомление
      if (telegramNotifier.enabled) {
        telegramNotifier.sendMessage(
          `🔍 Получена конфигурация VM ID: ${vmId}\nСтатус: ${vmConfig.status}`
        ).catch(err => {});
      }

      res.json(vmConfig);
    } catch (error) {
      console.error('Ошибка получения конфигурации VM:', error);
      res.status(500).json({ error: error.message });
    } finally {
      this.client.disconnect();
    }
  }
}

module.exports = new ESXiController();