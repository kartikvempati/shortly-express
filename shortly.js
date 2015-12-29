var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var crypto = require('crypto');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();
app.use(session({secret: "nyan", cookie: {}, resave: false, saveUninitialized: false }));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

/*
  checks cookie header if logged in
  if true, call next
  else, res.redirect('login')
  
*/

// function parseCookies (request) {
//     var list = {},
//         rc = request.headers.cookie;

//     rc && rc.split(';').forEach(function( cookie ) {
//         var parts = cookie.split('=');
//         list[parts.shift().trim()] = decodeURI(parts.join(''));
//     });

//     return list;
// }

var checkUser = function (req, res, next) {
   var cookie = req.session.login;
   console.log(req.session.login);
   if (cookie) {
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
      .then(function(newUser) {
        //write cookie
        req.session.login = username;
        console.log(res.session);
        res.redirect('/');
      });
  });

});


app.post('/login', function(req, res){
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
        console.log(res.session);
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
// app.post('/login', middleware(),function(req, res){
//   //get username, password from the request body
//   //check if username exists
//     // if it does
//     // check password matches in db
//       //if it does
//       // render index, create cookie for user
//       // if it doesn't
//       // go back to /login  
// });


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
