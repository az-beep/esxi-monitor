const express = require("express");
const app = express();
const cors = require("cors");
const { authMiddleware } = require("./middlewares/auth.middleware");

// настройка CORS
app.use(cors({
  origin: ['https://localhost:443', 'https://localhost', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

app.use("/auth", require("./routes/auth.routes"));

app.get("/health", (req, res) => {
  res.json({
    статус: "работает",
    сервис: "vm-management-backend",
    время: new Date().toISOString()
  });
});

// маршруты, требующие авторизации
app.use("/esxi", authMiddleware, require("./routes/esxi.routes"));
app.use("/vm", authMiddleware, require("./routes/vm.routes"));
app.use("/metrics", authMiddleware, require("./routes/metrics.routes"));
app.use("/logs", authMiddleware, require("./routes/action.routes"));
app.use("/users", authMiddleware, require("./routes/user.routes"));

// корневой маршрут
app.get("/", (req, res) => {
  res.json({
    сообщение: "VM Management API",
    статус: "работает",
    версия: "1.0.0",
    эндпоинты: [
      "GET  /",
      "GET  /health",
      "POST /auth/login",
      "GET  /auth/verify",
      "GET  /esxi",
      "GET  /esxi/:id",
      "GET  /vm",
      "POST /vm",
      "GET  /vm/:id",
      "PUT  /vm/:id",
      "DELETE  /vm/:id",
      "POST  /vm/:id/start",
      "POST  /vm/:id/stop",
      "GET  /metrics",
      "GET  /logs",
      "GET  /users",
      "POST /users",
      "DELETE /users/:id"
    ]
  });
});

app.use((req, res) => {
  res.status(404).json({ ошибка: "Маршрут не найден" });
});

module.exports = app;