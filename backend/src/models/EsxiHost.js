const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EsxiHost = sequelize.define("EsxiHost", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    hostname: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    version: {
        type: DataTypes.STRING,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: "disconnected",
    },
    cpuModel: {
        type: DataTypes.STRING,
    },
    cpuCores: {
        type: DataTypes.INTEGER,
    },
    memory: {
        type: DataTypes.STRING,
    },
    storage: {
        type: DataTypes.STRING,
    },
    uptime: {
        type: DataTypes.INTEGER,
    },
    lastSync: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    configJson: {
        type: DataTypes.TEXT,
        get() {
            const rawValue = this.getDataValue('configJson');
            return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
            this.setDataValue('configJson', JSON.stringify(value));
        }
    }
});

module.exports = EsxiHost;