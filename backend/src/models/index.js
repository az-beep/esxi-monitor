const { sequelize } = require("../config/database");
const User = require("./User");
const EsxiHost = require("./EsxiHost");
const Vm = require("./Vm");
const Metric = require("./Metric");
const ActionLog = require("./ActionLog");

// Связи
EsxiHost.hasMany(Vm, { foreignKey: "esxiHostId", sourceKey: "hostname" });
Vm.belongsTo(EsxiHost, { foreignKey: "esxiHostId", targetKey: "hostname" });

Vm.hasMany(Metric, { foreignKey: "vmId" });
Metric.belongsTo(Vm, { foreignKey: "vmId" });

User.hasMany(ActionLog, { foreignKey: "userId" });
ActionLog.belongsTo(User, { foreignKey: "userId" });

ActionLog.belongsTo(Vm, { foreignKey: "vmId" });

module.exports = {
    sequelize,
    User,
    EsxiHost,
    Vm,
    Metric,
    ActionLog,
};