//jshint esversion:6
require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require('mongoose-findorcreate');

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

//setup express session refer to express-session docs
app.use(session({
  secret: "thisisbharath",
  resave: false,
  saveUninitialized: true,
}))
//initialize and use passport
app.use(passport.initialize());
app.use(passport.session());


//mongoose connection
mongoose.connect('mongodb://localhost:27017/newDB',{ useNewUrlParser: true });
//define the schema
const schema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});
//initialize passportLocalMongoose
schema.plugin(passportLocalMongoose);
schema.plugin(findOrCreate);
//define the model
const User = mongoose.model("User",schema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
//google auth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.SECRET_KEY,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//home roue
app.get("/",function(req,res){
  res.render("home");
});

//login route
app.get("/login",function(req,res){
  res.render("login");
});
//secrets route


//register route
app.get("/register",function(req,res){
res.render("register");
});
//secrets
app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});
//submit
app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});
//logout route
app.get('/logout', function(req, res) {
    req.session.destroy(function(e){
        req.logout();
        res.redirect('/');
    });
});
// app.get("/logout",function(req,res){
//   req.logout();
//
//   res.redirect("/login");
// })
//auth route
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  //callback from google
  app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
  app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;

  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
    // console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });
//getting the registration details
app.post("/register",function(req,res){
  User.register({username:req.body.username}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
     }
     else
     {
       passport.authenticate("local")(req,res,function(){
         res.redirect("/secrets");
       });
     }
});
  });

//getting the detals from the login page and verifying the user
app.post("/login",function(req,res){
  const user = new User({
    username:req.body.username,
    password:req.body.password
  });
  req.login(user, function(err) {
    if(err){
      console.log(err);}
    else{
      passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");});
  }
  })

});



app.listen(3000,function(){
  console.log("Server Started");
});
