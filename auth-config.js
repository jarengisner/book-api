const jwt = require('jsonwebtoken'),
  passport = require('passport');

const secret = process.env.JWTSECRET;

require('./passport-config.js');

const generateToken = (user) => {
  return jwt.sign(user, secret, {
    subject: user.username,
    expiresIn: '7d',
    algorithm: 'HS256',
  });
};

//check user against passport security
module.exports = (router) => {
  router.post('/login', (req, res) => {
    passport.authenticate('local', { session: false }, (error, user, info) => {
      if (error || !user) {
        console.log(
          'Something did not go right, or there is no user to be found'
        );
        res
          .status(400)
          .json({
            message:
              'Something went wrong / there is no user under these credentials',
          });
      }

      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }

        let token = generateToken(user.toJSON());
        return res.json({ user, token });
      });
    });
  });
};
