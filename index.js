var emailExistence = require('./email-existence.js');
var _ = require('lodash');

createPossibleAddresses = function(name, domain){
	var addresses = [];
	var variations = [];

	// Clean domain input
	domain = domain.trim().toLowerCase();

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
		addresses.push(variations[i].join('') + "@" + domain);
		addresses.push(variations[i].join('.') + "@" + domain);
	}

	return _.uniq(addresses);
}

module.exports = function(name,domain,options,callback){
	// check if options are given
	if(typeof options === "function"){
		callback = options;
		options = {};
	}
	
	emailExistence(createPossibleAddresses(name, domain), options ,function(err, validAddresses) {
		callback(err, validAddresses);
	});
}