const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Vm = sequelize.define("Vm", {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: "stopped",
    },
    cpu: {
        type: DataTypes.INTEGER,
    },
    ram: {
        type: DataTypes.INTEGER,
    },
    storage: {
        type: DataTypes.INTEGER,
    },
    ipAddress: {
        type: DataTypes.STRING,
    },
    guestOS: {
        type: DataTypes.STRING,
    },
    esxiHostId: {
        type: DataTypes.STRING,
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
    },
    lastSync: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    lastBoot: {
        type: DataTypes.DATE,
    }
});

module.exports = Vm;