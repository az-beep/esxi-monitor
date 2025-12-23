const app = require("./app");
const sequelize = require("./config/database");
const syncService = require("./services/esxi.service");

const PORT = process.env.PORT || 5000;

const createDefaultUser = async () => {
  const { User } = require("./models");
  const bcrypt = require("bcrypt");

  try {
    const existing = await User.findOne({ where: { email: "admin@esxi.local" } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        email: "admin@esxi.local",
        password: hashedPassword,
        role: "admin"
      });
      console.log("✅ Создан пользователь по умолчанию: admin@esxi.local / admin123");
    }
  } catch (error) {
    console.error("Ошибка создания пользователя:", error.message);
  }
};

const startServer = async () => {
  try {
    // Подключаемся к БД
    await sequelize.authenticate();
    console.log("✅ Подключение к БД установлено");

    // Синхронизируем модели
    await sequelize.sync({ alter: true });
    console.log("✅ Модели БД синхронизированы");

    // Создаём пользователя по умолчанию
    await createDefaultUser();

    // Запускаем фоновую синхронизацию (каждые 5 минут)
    await syncService.startSync(300000);

    // Запускаем сервер
    app.listen(PORT, () => {
      console.log("=".repeat(50));
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📡 ESXi Host: ${process.env.ESXI_HOST || '192.168.56.10'}`);
      console.log(`🔗 API: http://localhost:${PORT}`);
      console.log("=".repeat(50));
      console.log("📊 Синхронизация с ESXi запущена...");
    });

  } catch (error) {
    console.error("❌ Ошибка запуска сервера:", error.message);
    process.exit(1);
  }
};

startServer();