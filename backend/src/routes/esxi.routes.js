const router = require("express").Router();
const controller = require("../controllers/esxi.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Все маршруты требуют авторизации
router.use(authMiddleware);

router.get("/config", controller.getESXiConfig);
router.get("/vms", controller.getAllVMs);
router.get("/audit", controller.getESXiAuditLogs);
router.get("/metrics", controller.getHostMetrics);
router.get("/vm/:id/config", controller.getVMConfig);
router.get("/vm/:vmId/audit", controller.getVMAuditLogs);

module.exports = router;