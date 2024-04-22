# Groups Application(Back End)

## Goal

The goal of this application was to build a full stack application that provides many of the features of a modern social media application.

- Posting capabilities
- Options to join groups, leave groups
- Create your own profile
- Choose your own profile picture, or the profile picture of a group
- Like posts, and unlike posts
- View other user's posts

## Technology

- React
- React Bootstrap
- Node.js
- Mongo.db
- AWS S3
- AWS SDK

## Summary

This project uses React and React Bootstrap to create the front end of the application, and Node.js to create the back end API. MongoDB is used as the datebase, along with AWS S3.

Node.js was used in the backend, with the API offering many endpoints to access data within the database. The API also offers JWT security checks, as well as password encryption/decryption for security and login purposes.

MongoDB is used to hold most data that passes through the application, from user profile, to individual posts and likes. AWS S3 is used purely to hold a user or a group's profile picture.
