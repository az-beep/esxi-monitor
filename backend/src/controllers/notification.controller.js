const axios = require('axios');

class TelegramNotifier {
  constructor() {
    this.botToken = '8359101654:AAG95K8Mbi_BmCAn4R5WOe37KijuUXSJMi4';
    this.chatId = '977325615';
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
      success: '🟢'
    };

    const icon = icons[type] || '⚪';
    
    const templates = {
      login: `${icons.success} <b>Вход пользователя</b>\n` +
             `Пользователь: ${data.email}\n` +
             `Роль: ${data.role}\n` +
             `IP: ${data.ip || 'Н/Д'}\n` +
             `Время: ${new Date().toLocaleString()}`,

      user_created: `${icons.success} <b>Создан новый пользователь</b>\n` +
                  `Пользователь: ${data.email}\n` +
                  `Роль: ${data.role}\n` +
                  `Создал: ${data.createdBy}\n` +
                  `Время: ${new Date().toLocaleString()}`,
      
      user_deleted: `${icons.critical} <b>Удален пользователь</b>\n` +
                  `Пользователь: ${data.email}\n` +
                  `Роль: ${data.role}\n` +
                  `Удалил: ${data.deletedBy}\n` +
                  `Время: ${new Date().toLocaleString()}`,
      vm_created: `${icons.info} <b>Создана новая VM</b>\n` +
                  `ВМ: <code>${data.vmName}</code>\n` +
                  `CPU: ${data.cpu}%\n` +
                  `RAM: ${data.ram} MB\n` +
                  `ROM: ${data.rom} GB\n` +
                  `Пользователь: ${data.userEmail}\n` +
                  `Время: ${new Date().toLocaleString()}`,

      vm_updated: `${icons.info} <b>Обновлена VM</b>\n` +
                  `ВМ: <code>${data.vmName}</code>\n` +
                  `Статус: ${data.status}\n` +
                  `Пользователь: ${data.userEmail}\n` +
                  `Время: ${new Date().toLocaleString()}`,

      vm_deleted: `${icons.critical} <b>Удалена VM</b>\n` +
                  `ВМ: <code>${data.vmName}</code>\n` +
                  `Пользователь: ${data.userEmail}\n` +
                  `Время: ${new Date().toLocaleString()}`,
          
      vm_status: `${icons.info} <b>Статус ВМ изменен</b>\n` +
                  `ВМ: <code>${data.vmName}</code>\n` +
                  `Статус: ${data.oldStatus} → ${data.newStatus}\n` +
                  `Пользователь: ${data.userEmail}\n` +
                  `Время: ${new Date().toLocaleString()}`,
    };

    return templates[type] || `${icon} ${data.message || JSON.stringify(data)}`;
  }
}

const telegramNotifier = new TelegramNotifier();

exports.telegramNotifier = telegramNotifier;