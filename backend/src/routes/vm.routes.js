const router = require("express").Router();
const controller = require("../controllers/vm.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Все маршруты требуют авторизации
router.use(authMiddleware);

// Только чтение данных
router.get("/", controller.getAllVms);
router.get("/:id", controller.getVmById);
router.get("/:id/live-metrics", controller.getVMLiveMetrics);

module.exports = router;