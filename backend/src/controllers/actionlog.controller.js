const { ActionLog, User, Vm } = require("../models");

exports.getAllLogs = async (req, res) => {
  try {
    const logs = await ActionLog.findAll({
      include: [User, Vm],
      order: [["timestamp", "DESC"]],
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
