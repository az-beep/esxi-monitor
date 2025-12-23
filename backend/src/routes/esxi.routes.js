const router = require("express").Router();
const controller = require("../controllers/esxi.controller");

router.get("/", controller.getAllEsxi);
router.get("/:id", controller.getEsxiById);

module.exports = router;