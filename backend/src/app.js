const express = require("express");
const app = express();
const cors = require("cors");

// CORS для фронтенда
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:80'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

app.use(express.json());

// Аутентификация
app.use("/auth", require("./routes/auth.routes"));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "esxi-monitor-api",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Мониторинг (требует авторизации)
app.use("/api", require("./routes/monitor.routes"));

// Корневой маршрут
app.get("/", (req, res) => {
  res.json({
    name: "ESXi Monitoring API",
    description: "Система мониторинга ESXi хостов",
    version: "1.0.0",
    endpoints: [
      "GET  /health",
      "POST /auth/login",
      "GET  /api/esxi/config",
      "GET  /api/esxi/metrics",
      "GET  /api/esxi/audit",
      "GET  /api/vms",
      "GET  /api/vms/:id/config",
      "GET  /api/sync/status",
      "POST /api/sync/now"
    ]
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

module.exports = app;