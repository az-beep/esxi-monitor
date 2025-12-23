const router = require("express").Router();
const esxiController = require("../controllers/esxi.controller");
const syncService = require("../services/esxi.service");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Все маршруты требуют авторизации
router.use(authMiddleware);

// === ESXi Мониторинг ===
router.get("/esxi/config", esxiController.getESXiConfig);
router.get("/esxi/metrics", esxiController.getHostMetrics);
router.get("/esxi/audit", esxiController.getAuditLogs);

// === Виртуальные машины ===
router.get("/vms", esxiController.getAllVMs);
router.get("/vms/:id/config", esxiController.getVMConfig);

// === Синхронизация ===
router.get("/sync/status", (req, res) => {
  res.json(syncService.getStatus());
});

router.post("/sync/now", async (req, res) => {
  try {
    await syncService.syncAll();
    res.json({ 
      success: true, 
      message: "Синхронизация запущена",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;