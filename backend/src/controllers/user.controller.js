const bcrypt = require("bcrypt");
const { User, ActionLog } = require("../models");
const { telegramNotifier } = require('./notification.controller');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { email, password, role = "admin" } = req.body;
        
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Пользователь уже существует" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            email,
            password: hashedPassword,
            role
        });

        if (telegramNotifier.enabled) {
            telegramNotifier.sendMessage(
                telegramNotifier.formatAlert('user_created', {
                    email: user.email,
                    role: user.role,
                    createdBy: req.user.email
                })
            ).catch(err => {});
        }
        
        await ActionLog.create({
            userId: req.user.id,
            action: `Создание пользователя: ${email}`,
            details: `Роль: ${role}`
        });
        
        res.status(201).json({
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        
        if (user.id === req.user.id) {
            return res.status(400).json({ error: "Нельзя удалить самого себя" });
        }

        await user.destroy();

        if (telegramNotifier.enabled) {
            telegramNotifier.sendMessage(
                telegramNotifier.formatAlert('user_deleted', {
                    email: user.email,
                    role: user.role,
                    deletedBy: req.user.email
                })
            ).catch(err => {});
        }
        
        await ActionLog.create({
            userId: req.user.id,
            action: `Удаление пользователя: ${user.email}`
        });
        

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
