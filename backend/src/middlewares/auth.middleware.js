const jwt = require("jsonwebtoken");
const { User } = require("../models");

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Доступ запрещен. Токен не предоставлен." });
        }

        const decoded = jwt.verify(token, "secret");
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "Пользователь не найден." });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Неверный или просроченный токен." });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен. Только для администраторов." });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };