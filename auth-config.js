const jwt = require('jsonwebtoken'),
  passport = require('passport');

const secret = process.env.JWTSECRET;

const generateToken = (user) => {
  return jwt.sign(user, secret, {
    subject: user.username,
    expiresIn: '7d',
    algorithm: 'HS256',
  });
};

//check user against passport security
