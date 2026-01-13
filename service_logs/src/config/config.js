require('dotenv').config();

module.exports = {
  port: process.env.PORT || 10000,
  nodeEnv: process.env.NODE_ENV || 'production',
  db: {
    host: process.env.DB_HOST || 'service_logs_mysql',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Ttct@835!!',
    database: process.env.DB_NAME || 'service_logs'
  }
};

