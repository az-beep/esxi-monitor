const router = require("express").Router();
const controller = require("../controllers/vm.controller");

router.post("/", controller.createVm);
router.get("/", controller.getAllVms);
router.get("/:id", controller.getVmById);
router.put("/:id", controller.updateVm);
router.delete("/:id", controller.deleteVm);
router.post("/:id/start", controller.startVm);
router.post("/:id/stop", controller.stopVm);

module.exports = router;