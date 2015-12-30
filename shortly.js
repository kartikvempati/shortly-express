var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var crypto = require('crypto'); //wont need when using passport
var passport = require('passport')
var GitHubStrategy = require('passport-github2').Strategy;


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var Profile = require('./app/models/profile');
var Profiles = require('./app/collections/profiles')

var app = express();
app.use(session({secret: "nyan", cookie: {}, resave: false, saveUninitialized: false }));


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GitHubStrategy({
    clientID: "ee25bfdfc441d509dc53",
    clientSecret: "7e188ed37d400a5526d8b99ae703416694cac544",
    callbackURL: "http://localhost:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      var email = profile.emails[0].value;
      console.log(profile.emails[0].value, "EMAIL");
      
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      new Profile({ 'email':email }).fetch().then(function(found) {

      Profiles.create({
        'email': email
      })
      // this needs to be edited to fit into the google/twitter/github strategy
      .then(function(newProfile) {
        //write cookie
        // req.session.login = email;
        // res.redirect('/');
        return done(null, newProfile);
      });
  });


      // return done(null, profile);
    });
  }
));


// Can remove when using passport
var checkUser = function (req, res, next) {
   var cookie = req.session.login;
   if (cookie) {
    next();
   }
   else if (req.isAuthenticated()){
    next();
   }
   else {
    res.redirect('/login');
   }
};


app.get('/', checkUser,
function(req, res) {
  res.render('index');
});

app.get('/create', checkUser,
function(req, res) {
  res.render('index');
});

app.get('/links', checkUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});




/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/logout', function(req, res){
  req.session.destroy();
  res.redirect('/login')
});

app.get('/login', function(req, res){
  res.render('login');
});

app.get('/signup', function(req, res){
  res.render('signup');
});

app.post('/signup', function(req, res){
  var username = req.body.username;
  var password = req.body.password;



  new User({ 'username': username, 'password': password }).fetch().then(function(found) {

      Users.create({
        'username': username,
        'password': password
      })
      // this needs to be edited to fit into the google/twitter/github strategy
      .then(function(newUser) {
        //write cookie
        req.session.login = username;
        res.redirect('/');
      });
  });

});


app.post('/login', function(req, res){
  // Remove crypto and hashing for the github oauth
  var shasum = crypto.createHash('sha1');
  var username = req.body.username;
  var password = req.body.password;
  shasum.update(password);
  password = shasum.digest('hex').slice(0, 10)

  new User({ 'username': username, 'password': password }).fetch().then(function(user) {


    if(user){
      //check password

      if(user.get('password') == password){
        req.session.login = username;
        res.redirect('/');
      }
      else{
        // WRONG PASSWORD
        res.redirect('/login');
      }
    }
    else{
      // USERNAME DOESNT EXIST
      res.redirect('/login');
    }
    
  });  
});


app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  console.log("SUCCESS");
  res.redirect('/');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
