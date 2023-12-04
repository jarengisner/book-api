const passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  Models = require('./models.js'),
  passportJwt = require('passport-jwt');

let Users = Models.User,
  JWTStrategy = passportJwt.Strategy,
  ExtractJWT = passportJwt.ExtractJwt;

const secret = process.env.JWTSECRET;

passport.use(
  new LocalStrategy(
    {
      usernameField: 'Username',
      passwordField: 'Password',
    },
    //Used async await because I feel like it simplified writing this//
    async (username, password, callback) => {
      console.log(username + ' ' + password);
      try {
        const user = await Users.findOne({ Username: username });
        //checks is the user exists in the db//
        if (!user) {
          console.log('incorrect username');
          return callback(null, false, { message: 'Incorrect Username' });
        }
        console.log(user.validatePassword(password));
        //uses our validate password method which checks hashed password against db storage//
        //Our password we input is already hashed and compared when we send our login request, due to calling authenticate//
        if (user.validatePassword(password) === false) {
          console.log('incorrect password');
          return callback(null, false, { message: 'Incorrect password' });
        }
        //if none of the above are the case, this runs//
        console.log('It worked');
        return callback(null, user);
      } catch (error) {
        console.log(error);
        return callback(error);
      }
    }
  )
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    },
    (jwtPayload, callback) => {
      return Users.findById(jwtPayload._id)
        .then((user) => {
          return callback(null, user);
        })
        .catch((error) => {
          return callback(error);
        });
    }
  )
);
