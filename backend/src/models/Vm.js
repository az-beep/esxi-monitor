const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Vm = sequelize.define("Vm", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cpu: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ram: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  rom: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "stopped",
  },
});

module.exports = Vm;
