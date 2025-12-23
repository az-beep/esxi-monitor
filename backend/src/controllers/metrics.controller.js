const { Metric, Vm } = require("../models");

exports.getMetricsByVm = async (req, res) => {
  try {
    const metrics = await Metric.findAll({
      where: { vmId: req.params.vmId },
      order: [["timestamp", "DESC"]],
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLatestMetrics = async (req, res) => {
  try {
    const metrics = await Metric.findAll({
      include: [{ model: Vm, include: ["EsxiHost"] }],
      order: [["timestamp", "DESC"]],
      limit: 50,
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};