const express = require('express');
const mongoose = require('mongoose');
const Models = require('./models.js');

const app = express();

const Groups = Models.Group;
const Users = Models.User;

//connections
const connect = process.env.CONNECTION_URI;

mongoose.connect(connect, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
      res.status(201).json(item);
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

//POST REQUESTS

//add middleware to check password, etc during this process
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
          members: [],
          books: [],
          posts: [],
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

//update

//delete

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

const port = 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port: ${port}`);
});
