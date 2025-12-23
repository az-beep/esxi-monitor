const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, ActionLog } = require("../models");
const { telegramNotifier } = require('./notification.controller');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }
    
    const cleanPassword = password.trim();
    const cleanHash = user.password.trim();
    
    const validPassword = await bcrypt.compare(cleanPassword, cleanHash);
    
    if (!validPassword) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" }
    );
    
    await ActionLog.create({
      userId: user.id,
      action: "Вход в систему"
    });

    if (telegramNotifier && telegramNotifier.enabled) {
      telegramNotifier.sendMessage(
        telegramNotifier.formatAlert('login', {
          email: user.email,
          role: user.role,
          ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }),
        { silent: true }
      ).catch(err => console.error('Ошибка телеграм-уведомления:', err));
    }
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      } 
    });
    
  } catch (error) {
    console.error("Ошибка входа:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не предоставлен" });
    }

    const decoded = jwt.verify(token, "secret");
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    res.json({ valid: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(401).json({ error: "Неверный токен" });
  }
};