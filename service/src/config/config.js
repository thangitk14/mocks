require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'developer'}` });

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};
