const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Metric = sequelize.define("Metric", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cpu: DataTypes.FLOAT,
  ram: DataTypes.FLOAT,
  rom: DataTypes.FLOAT,
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Metric;
