var db = require('../config');
var Profile = require('../models/profile');

var Profiles = new db.Collection();

Profiles.model = Profile;

module.exports = Profiles;