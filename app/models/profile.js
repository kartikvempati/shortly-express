var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var crypto = require('crypto');



var Profile = db.Model.extend({
  tableName: 'profiles'
  // initialize: function(){
    // this.on('creating', function(model, attrs, options){
    //   var shasum = crypto.createHash('sha1');
    //   shasum.update(model.get('password'));
    //   model.set('password', shasum.digest('hex').slice(0, 10));
    // });
  // }
});

module.exports = Profile;
