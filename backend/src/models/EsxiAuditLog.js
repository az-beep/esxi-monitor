const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EsxiAuditLog = sequelize.define("EsxiAuditLog", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
  },
  ip: {
    type: DataTypes.STRING,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  details: {
    type: DataTypes.TEXT,
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: "ESXi",
  }
});

module.exports = EsxiAuditLog;