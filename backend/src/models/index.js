const { sequelize } = require("../config/database");
const User = require("./User");
const EsxiHost = require("./EsxiHost");
const Vm = require("./Vm");
const Metric = require("./Metric");
const EsxiAuditLog = require("./EsxiAuditLog");

// Связи (ИСПРАВЛЕНО)
EsxiHost.hasMany(Vm, { foreignKey: "esxiHostId" });
Vm.belongsTo(EsxiHost, { foreignKey: "esxiHostId" });

// Эта связь не нужна, пока нет ActionLog модели
// User.hasMany(ActionLog, { foreignKey: "userId" });
// ActionLog.belongsTo(User, { foreignKey: "userId" });

module.exports = {
  sequelize,
  User,
  EsxiHost,
  Vm,
  Metric,
  EsxiAuditLog
};