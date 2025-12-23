const router = require("express").Router();
const controller = require("../controllers/metrics.controller");

router.get("/vm/:vmId", controller.getMetricsByVm);
router.get("/latest", controller.getLatestMetrics);

module.exports = router;