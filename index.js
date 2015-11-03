var emailExistence = require('./email-existence.js');
var _ = require('lodash');
var Promise = require('bluebird');

function createPossibleAccounts(name){

	var addresses = [];
	var variations = [];
	// Removing non english characters and converting name to lovercase
	var latinize = require('latinize');
	name = latinize(name.toLowerCase());
	
	// Converting name string to an array
	var nameParts = [];
	nameParts[0] = name.trim().replace(/[^a-zA-Z ]/g, "").split(" ");

	// Conuter for variations
	var j = 0;

	// Combinations library
	var Combinatorics = require('js-combinatorics');

	// Execute cominations on simpla name parts
	cmb = Combinatorics.permutationCombination(nameParts[0]);
	variations[0] = cmb.toArray();

	// Creating initials with normal name parts
	for(var i = 0;i < nameParts[0].length;i++){
		j++;
		nameParts[j] = _.clone(nameParts[0]);
		nameParts[j][i] = nameParts[j][i].substring(0,1);
		cmb = Combinatorics.permutationCombination(nameParts[j]);
		variations[j] = cmb.toArray();
	}

	// Creating initials only nameparts
	j++;
	nameParts[j] = _.clone(nameParts[0]);
	for(var i = 0;i < nameParts[0].length;i++){
		nameParts[j][i] = nameParts[j][i].substring(0,1);
	}
	cmb = Combinatorics.permutationCombination(nameParts[j]);
	variations[j] = cmb.toArray();


	// Flattening array
	variations = _.flatten(variations);


	// Creating final addresses from variations
	for(var i=0; i < variations.length; i++){
		addresses.push(variations[i].join(''));
		addresses.push(variations[i].join('.'));
	}

	return _.sortBy(_.uniq(addresses), function(o){ return o.length }).reverse();
}

function emailFinder(name,domain,options,callback){
	// check if options are given
	if(typeof options === "function"){
		callback = options;
		options = {};
	}


	// Lets create guesses for accouns
	var accounts = createPossibleAccounts(name);

	// Handling maximum account guessing per connection (this is for 421 Too many error)
	options.max_try_per_connection = options.max_try_per_connection || 15;
	var i,j,chunk = options.max_try_per_connection;
	var temparray = [];
	for (i=0,j=accounts.length; i<j; i+=chunk) {
	    temparray.push(accounts.slice(i,i+chunk));
	}
	

	Promise.map(temparray, function(chunk){
		return emailExistence(chunk, domain, options); 
	},{concurrency: 1}).then(function(results){
		var validAddresses = [];
		
		results.forEach(function(result){
			result.forEach(function(email){
				validAddresses.push(email);
			})
		});

		// Return validated addresses
		callback(null,validAddresses);

	}).catch(function(reason){

		// If shit hits the fan
		callback(reason);

	});
}

module.exports = emailFinder;