const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EsxiHost = sequelize.define("EsxiHost", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "connected",
  },
});

module.exports = EsxiHost;
