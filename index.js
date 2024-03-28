const express = require('express');
const mongoose = require('mongoose');
const Models = require('./models.js');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const app = express();
const upload = multer();

//Middleware
app.use(cors());
app.use(bodyParser.json());

require('dotenv').config();

// Create an instance of the S3 client
const s3Client = new S3Client({
  region: 'us-east-2',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

const Groups = Models.Group;
const Users = Models.User;

//connections
const connect = process.env.CONNECT_URI;
const secret = process.env.JWTSECRET;

mongoose
  .connect(process.env.CONNECT_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

app.get('/', (req, res) => {
  res.send('Base rendered successfully');
});
//------------------------------------------------------

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Find the user by username
      const user = await Users.findOne({ username: username });

      // Check if the user exists and verify the password using the validatePass method
      if (user && user.validatePass(password)) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid username or password' });
      }
    } catch (error) {
      console.log(error);
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Users.findById(id, (err, user) => {
    done(err, user);
  });
});

// Authentication middleware
app.use(passport.initialize());

app.post(
  '/login',
  passport.authenticate('local', { session: false }),
  (req, res) => {
    const token = jwt.sign({ sub: req.user.id }, 'your_secret_key', {
      expiresIn: '7d',
    });
    res.json({ user: req.user, token });
  }
);

//------------------------------------------------------
//ENDPOINTS
app.get('/clubs', (req, res) => {
  Groups.find()
    .then((items) => {
      res.status(201).json(items);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong fetching all groups');
    });
});

//Can use this to get any aspect of a certain club, members, posts, etc.
app.get('/clubs/:name', (req, res) => {
  Groups.findOne({ name: req.params.name })
    .then((item) => {
      res.json(item);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong fetching specific group');
    });
});

app.get('/users', (req, res) => {
  Users.find()
    .then((items) => {
      res.status(201).json(items);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong when fetching all users');
    });
});

app.get('/users/:userId', (req, res) => {
  Users.findOne({ username: req.params.userId })
    .then((profile) => {
      res.status(201).json(profile);
    })
    .catch((err) => {
      console.log(err);
      console.log('something went wrong getting a specific user');
    });
});

app.get('/:user/clubs', (req, res) => {
  Users.findOne({ username: req.params.user })
    .then((userData) => {
      res.status(201).json(userData.clubs);
    })
    .catch((err) => {
      console.log(err);
      console.log('Error fetching users clubs');
    });
});

//POST REQUESTS

//add middleware to check password, etc during this process

//---------------------------------------------------------
app.post('/users', (req, res) => {
  //hashes submitted password to then store hashed password
  let hashedPassword = Users.hashPassword(req.body.password);

  Users.findOne({ username: req.body.username })
    .then((user) => {
      if (user) {
        return res
          .status(400)
          .send('Account with that username already exists');
      } else {
        Users.create({
          username: req.body.username,
          password: hashedPassword,
          bio: req.body.bio,
          profilePic: req.body.profilePic,
        })
          .then((prof) => {
            res.status(201).json(prof);
          })
          .catch((err) => {
            console.log(err);
            console.log('Something went wrong creating a new user profile');
          });
      }
    })
    .catch((prob) => {
      console.log(prob);
      console.log('problem within the outer process of account creation');
    });
});

/*
Need to find a way to find the original creator or the group, 
so that we can push them in to be the first member of the group.

Possibly upon group creation, run a request to the update group members endpoint to immediately put the current user into the group???
*/

app.post('/clubs', (req, res) => {
  Groups.findOne({ name: req.body.name })
    .then((thing) => {
      if (thing) {
        return res.status(400).send('A group with that name already exists');
      } else {
        Groups.create({
          name: req.body.name,
          description: req.body.description,
          members: [req.body.groupCreator],
          books: [],
          posts: [],
          groupImg: 'https://placehold.co/100',
          tags: req.body.tags,
        })
          .then((newGroup) => {
            res.status(201).json(newGroup);
          })
          .catch((err) => {
            console.log(err);
            console.log('Something went wrong with group creation');
          });
      }
    })
    .catch((prob) => {
      console.log(prob);
      console.log(
        'Something went wrong within the outer process of group creation'
      );
    });
});

/*
IMPORTANT: 

CLUB NAME in the request params

USER username in the body request
*/

app.put('/clubs/join/:name/:username', async (req, res) => {
  try {
    // Find the user by username in the request body
    const user = await Users.findOne({ username: req.params.username });

    // If the user is not found, return an error response
    if (!user) {
      return res
        .status(400)
        .json({ error: 'No user with this username exists' });
    } else {
      console.log(user);
    }

    // Find the group by name in the URL parameter
    const group = await Groups.findOne({ name: req.params.name });

    // If the group is not found, return an error response
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    } else {
      console.log(group);
    }

    // Push the user object into the members array of the group
    group.members.push(user);

    // Update the group in the database
    const updatedGroup = await Groups.findOneAndUpdate(
      { name: req.params.name },
      { $set: { members: group.members } },
      { new: true }
    );

    // Return the updated group
    res.json(updatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/*
Pretty sure this may be able to be done within just one findOneAndUpdate, will require some more thinking, this is
just to get the idea of what we are going for
*/

app.put('/clubs/:name/:username/leave', async (req, res) => {
  try {
    // Find the group
    const group = await Groups.findOne({ name: req.params.name });

    // If the group is not found, return an error response
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update the group members
    const currentGroupMembers = group.members;
    const newGroupMembers = currentGroupMembers.filter(
      (member) => member.username !== req.params.username
    );

    // Update the group in the database
    const updatedGroup = await Groups.findOneAndUpdate(
      { name: req.params.name },
      { $set: { members: newGroupMembers } },
      { new: true }
    );

    // Return the updated group
    res.json(updatedGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//update group photo

app.put(
  '/groups/:groupname/picture',
  upload.single('photo'),
  async (req, res) => {
    const groupname = req.params.groupname;
    const photo = req.file;
    const region = 'us-east-2';

    try {
      // Upload photo to S3 bucket
      const s3UploadParams = {
        Bucket: 'appphotostorage',
        Key: `${groupname}/${photo.originalname}`,
        Body: photo.buffer,
        ContentType: photo.mimetype,
      };

      const uploadResult = await s3Client.send(
        new PutObjectCommand(s3UploadParams)
      );

      // Update group's profile picture attribute with the URL to the uploaded photo
      const photoUrl = `https://${s3UploadParams.Bucket}.s3.${region}.amazonaws.com/${s3UploadParams.Key}`;
      const updatedGroup = await Groups.findOneAndUpdate(
        { name: groupname },
        { $set: { groupImg: photoUrl } },
        { new: true }
      );

      res.json(updatedGroup);
    } catch (error) {
      console.error(
        'Error uploading photo to S3 or updating group profile:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: error.message,
      });
    }
  }
);

//update user photo
////////////////////////////
///////////////////////////
app.put(
  '/users/:username/picture',
  upload.single('photo'),
  async (req, res) => {
    const username = req.params.username;
    const photo = req.file;
    const region = 'us-east-2';

    try {
      // Upload photo to S3 bucket
      const s3UploadParams = {
        Bucket: 'appphotostorage',
        Key: `${username}/${photo.originalname}`,
        Body: photo.buffer,
        ContentType: photo.mimetype,
      };

      const uploadResult = await s3Client.send(
        new PutObjectCommand(s3UploadParams)
      );

      // Update user's profilePic attribute with the URL to the uploaded photo
      const photoUrl = `https://${s3UploadParams.Bucket}.s3.${region}.amazonaws.com/${s3UploadParams.Key}`;
      const updatedUser = await Users.findOneAndUpdate(
        { username: username },
        { $set: { profilePic: photoUrl } },
        { new: true }
      );

      res.json(updatedUser);
    } catch (error) {
      console.error(
        'Error uploading photo to S3 or updating user profile:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: error.message,
      });
    }
  }
);
///////////////////////////
//////////////////////////
//////////////////////////

//update profile
app.put('/users/update/:username', (req, res) => {
  Users.findOneAndUpdate(
    { username: req.params.username },
    {
      $set: {
        bio: req.body.newBio,
      },
    },
    { new: true }
  )
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong when updating user details');
    });
});

//Update Password
app.put('/user/updatepassword/:username', (req, res) => {
  Users.findOneAndUpdate(
    { username: req.params.username },
    { $set: { password: req.body.password } },
    { new: true }
  )
    .then((updatedUser) => {
      console.log(updatedUser);
      res.json(updatedUser);
    })
    .catch((err) => {
      console.log(err);
      console.log('something went wrong when changing password');
    });
});

//updates posts to a clubs page
//SUPER IMPORTANT BELOW
/*
Posts need to be made in object format, so that we can add a date, etc, for filtering/presenting posts in order of most recent by default, etc.
*/
app.put('/clubs/:name/posts', (req, res) => {
  Groups.findOneAndUpdate(
    { name: req.params.name },
    { $push: { posts: req.body.post } },
    { new: true }
  )
    .then((newPost) => {
      res.json(newPost);
      console.log('Post successfully made');
    })
    .catch((err) => {
      console.log(err);
    });
});

//Update all group details
//People will only have the option to update the details if they are the first in the members array aka they made the group
app.put('/clubs/:name/details', (req, res) => {
  Groups.findOneAndUpdate(
    { name: req.params.name },
    {
      $set: {
        name: req.body.name,
        description: req.body.description,
        tags: req.body.tags,
      },
    },
    { new: true }
  )
    .then((updatedGroup) => {
      console.log('Group updated succesffully');
      res.json(updatedGroup);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong updating the group details');
    });
});

app.put('/clubs/:name/groupImg', (req, res) => {
  Groups.findOneAndUpdate(
    { name: req.params.name },
    { $set: { groupImg: req.body.groupImg } },
    { new: true }
  )
    .then(() => {
      console.log('Group Image succesffully updated');
    })
    .catch((err) => {
      console.log(err);
    });
});

//Delete requests

//Delete

//------------------------------------------

app.delete('/user/:username', (req, res) => {
  Users.findOneAndRemove({ username: req.params.username })
    .then((user) => {
      if (!user) {
        console.log('user does not exist');
      } else {
        res.send('User was deleted');
        //add functionality to remove user from state
      }
    })
    .catch((err) => {
      console.log(err);
      console.log('something went wrong in account deletion');
    });
});

app.delete('/clubs/:name', (req, res) => {
  //Add logic to check and make sure that the user deleting the club is the one that created the club
  //Does current user === group member[0] maybe????
  Groups.findOneAndRemove({ name: req.params.name }).then((club) => {
    if (!club) {
      console.log('This club does not exist');
      res.send('This club cannot be found');
    } else {
      res.send('Club was deleted');
    }
  });
});

const port = 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port: ${port}`);
});
