var emailExistence = require('./email-existence.js');
var _ = require('lodash');

createPossibleAddresses = function(name, domain){
	var addresses = [];
	var variations = [];
	domain = domain.trim().toLowerCase();

	var latinize = require('latinize');
	name = latinize(name.toLowerCase());
	
	var nameParts = [];
	nameParts[0] = name.trim().replace(/[^a-zA-Z ]/g, "").split(" ");

	var j = 0;

	var Combinatorics = require('js-combinatorics');

	cmb = Combinatorics.permutationCombination(nameParts[0]);
	variations[0] = cmb.toArray();

	for(var i = 0;i < nameParts[0].length;i++){
		j++;
		nameParts[j] = _.clone(nameParts[0]);
		nameParts[j][i] = nameParts[j][i].substring(0,1);
		cmb = Combinatorics.permutationCombination(nameParts[j]);
		variations[j] = cmb.toArray();
	}

	variations = _.flatten(variations);

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