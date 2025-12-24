const axios = require('axios');

class TelegramNotifier {
    constructor() {
        this.botToken = '8359101654:AAG95K8Mbi_BmCAn4R5WOe37KijuUXSJMi4';
        this.chatId ='977325615';
        this.enabled = !!this.botToken && !!this.chatId;
    }

    async sendMessage(message, options = {}) {
        if (!this.enabled) {
            return { success: false, error: 'Telegram не настроен' };
        }
        
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            
            const payload = {
                chat_id: this.chatId,
                text: message,
                parse_mode: 'HTML',
                disable_notification: options.silent || false,
                ...options
            };
            
            const response = await axios.post(url, payload);
            return { success: true, data: response.data };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatAlert(type, data) {
        const icons = {
            critical: '🔴',
            warning: '🟡',
            info: '🔵',
            success: '🟢',
            esxi: '🖥️',
            vm: '💻',
            login: '🔑',
            config: '⚙️'
        };
        
        const icon = icons[type] || '⚪';
        
        const templates = {
            
            esxi_config: `${icons.esxi} <b>Получена конфигурация ESXi</b>\n` +
                        `Хост: <code>${data.host}</code>\n` +
                        `Версия: ${data.version}\n` +
                        `CPU: ${data.cpu}\n` +
                        `Память: ${data.memory}\n` +
                        `Uptime: ${data.uptime}\n` +
                        `Время: ${new Date().toLocaleString()}`,
            
            vm_config: `${icons.vm} <b>Получена конфигурация VM</b>\n` +
                      `ВМ: <code>${data.vmName}</code>\n` +
                      `CPU: ${data.cpu}\n` +
                      `RAM: ${data.ram}\n` +
                      `Хранилище: ${data.storage}\n` +
                      `ОС: ${data.os}\n` +
                      `Статус: ${data.status}\n` +
                      `IP: ${data.ip || 'N/A'}\n` +
                      `Время: ${new Date().toLocaleString()}`,
            
            esxi_login: `${icons.login} <b>Вход в ESXi</b>\n` +
                       `Хост: ${data.host}\n` +
                       `Пользователь: ${data.user}\n` +
                       `IP: ${data.ip}\n` +
                       `Время: ${data.timestamp || new Date().toLocaleString()}`,
            
            vm_login: `${icons.login} <b>Вход в VM</b>\n` +
                     `ВМ: <code>${data.vmName}</code>\n` +
                     `Пользователь: ${data.user}\n` +
                     `IP: ${data.ip}\n` +
                     `Время: ${data.timestamp || new Date().toLocaleString()}`,
            
            sync_started: `${icons.info} <b>Начата синхронизация с ESXi</b>\n` +
                         `Хост: ${data.host}\n` +
                         `Время: ${new Date().toLocaleString()}`,
            
            sync_completed: `${icons.success} <b>Синхронизация завершена</b>\n` +
                           `Хост: ${data.host}\n` +
                           `VM: ${data.vmCount}\n` +
                           `Время: ${new Date().toLocaleString()}`,
            
            sync_error: `${icons.critical} <b>Ошибка синхронизации</b>\n` +
                       `Хост: ${data.host}\n` +
                       `Ошибка: ${data.error}\n` +
                       `Время: ${new Date().toLocaleString()}`
        };
        
        return templates[type] || `${icon} ${data.message || JSON.stringify(data)}`;
    }
}

const telegramNotifier = new TelegramNotifier();
exports.telegramNotifier = telegramNotifier;