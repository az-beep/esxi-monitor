const ESXiClient = require('./src/config/esxi'); // путь к вашему файлу
const client = new ESXiClient();

async function test() {
    console.log('🔍 Тестирование подключения к ESXi...');
    console.log('📡 Подключаемся к:', client.config.host);
    console.log('👤 Пользователь:', client.config.username);
    
    try {
        // 1. Подключение
        await client.connect();
        console.log('✅ SSH подключение установлено');
        
        // 2. Простая команда
        const hostname = await client.executeCommand('hostname');
        console.log('✅ Команда выполнена. Hostname:', hostname);
        
        // 3. Получение VM
        console.log('🔄 Получаем список VM...');
        const vms = await client.getVMs();
        console.log(`✅ Получено VM: ${vms.length}`);
        
        if (vms.length > 0) {
            vms.slice(0, 3).forEach(vm => {
                console.log(`   - ${vm.name} (${vm.status})`);
            });
            if (vms.length > 3) {
                console.log(`   ... и ещё ${vms.length - 3} VM`);
            }
        }
        
        // 4. Конфигурация ESXi
        console.log('🔄 Получаем конфигурацию ESXi...');
        const config = await client.getESXiConfig();
        if (config) {
            console.log('✅ Конфигурация получена:');
            console.log(`   Hostname: ${config.hostname}`);
            console.log(`   Version: ${config.version}`);
            console.log(`   CPU: ${config.cpu.cores} cores`);
            console.log(`   Memory: ${config.memory.size}`);
        }
        
        // 5. Логи
        console.log('🔄 Получаем логи аудита...');
        const logs = await client.getAuditLogs();
        console.log(`✅ Получено логов: ${logs.length}`);
        
        if (logs.length > 0) {
            logs.slice(0, 2).forEach(log => {
                console.log(`   ${log.timestamp} - ${log.user} - ${log.action}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка теста:', error.message);
        if (error.stderr) {
            console.error('STDERR:', error.stderr);
        }
    } finally {
        client.disconnect();
        console.log('📴 Соединение закрыто');
    }
}

// Запуск теста
test();