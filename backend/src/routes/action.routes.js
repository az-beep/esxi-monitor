const router = require("express").Router();
const controller = require("../controllers/actionlog.controller");
router.get("/", controller.getAllLogs);

module.exports = router;