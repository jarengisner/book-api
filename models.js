const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

let groupSchema = mongoose.Schema({
  name: { type: String, required: true },
  description: {},
  members: [{ type: Object }],
  books: [{ type: Object }],
  posts: [
    {
      postUser: { type: String },
      postBody: { type: String },
      date: { type: String },
      likes: { type: Number, default: 0 },
      likedBy: [String],
    },
  ],
  groupImg: { type: String },
  tags: { type: Array },
});

//postUser, postBody, date, likes, likedBy, id

let userSchema = mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  bio: { type: String },
  profilePic: { type: String },
});

userSchema.statics.hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

userSchema.methods.validatePass = function (password) {
  return bcrypt.compareSync(password, this.password);
};

let Group = mongoose.model('Group', groupSchema);
let User = mongoose.model('User', userSchema);

module.exports.Group = Group;
module.exports.User = User;
