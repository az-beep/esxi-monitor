const router = require("express").Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.login);
router.get("/verify", require("../middlewares/auth.middleware").authMiddleware);

module.exports = router;
