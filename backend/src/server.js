const app = require("./app");
const sequelize = require("./config/database");
const syncService = require("./services/sync.service");

const PORT = 5000;

const createDefaultUsers = async () => {
    const { User } = require("./models");
    const bcrypt = require("bcrypt");

    try {
        const users = [
            { email: "admin@vm.local", password: "admin123", role: "admin" },
        ];
        
        for (const userData of users) {
            const existing = await User.findOne({ where: { email: userData.email } });
            if (!existing) {
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                await User.create({
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role
                });
            }
        }
    } catch (error) {
        console.error("Ошибка создания пользователей:", error.message);
    }
};

const startServer = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        await createDefaultUsers();
        
        // Запускаем синхронизацию с ESXi (каждые 2 минуты)
        await syncService.startSync(120000);
        
        app.listen(PORT, () => {
            console.log("=".repeat(50));
            console.log(`API: http://localhost:${PORT}`);
            console.log(`ESXi Host: ${process.env.ESXI_HOST || '192.168.1.100'}`);
            console.log(`Adminer: http://localhost:8080`);
            console.log("=".repeat(50));
            console.log("Синхронизация с ESXi запущена...");
        });
        
    } catch (err) {
        console.error("Ошибка запуска сервера:", err.message);
        process.exit(1);
    }
};

startServer();