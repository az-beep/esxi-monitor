const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

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