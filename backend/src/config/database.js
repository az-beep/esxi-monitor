const { Sequelize } = require("sequelize");

console.log('Конфигурация БД:');
console.log('  DB_HOST:',  'postgres');
console.log('  DB_NAME:',  'vm_db');
console.log('  DB_USER:',  'admin');
console.log('  DB_PASS:',  'admin');

const sequelize = new Sequelize('vm_db',  'admin',  'admin', 
  {
    host: 'postgres',
    port:  5432,
    dialect: "postgres",
    logging: false,
  }
);

module.exports = sequelize;