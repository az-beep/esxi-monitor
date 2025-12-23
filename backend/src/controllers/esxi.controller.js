const { EsxiHost } = require("../models");
const { telegramNotifier } = require('./notification.controller');

exports.getAllEsxi = async (req, res) => {
  try {
    const list = await EsxiHost.findAll();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEsxiById = async (req, res) => {
  try {
    const esxi = await EsxiHost.findByPk(req.params.id);
    if (!esxi) {
      return res.status(404).json({ error: "ESXi хост не найден" });
    }
    res.json(esxi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
