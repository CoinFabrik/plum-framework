/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */
const path = require('path');
const fs = require('fs');
const commandLineArgs = require('command-line-args')
const helpers = require('./helpers.js');

//------------------------------------------------------------------------------

module.exports.name = 'migrate';

module.exports.description = 'Deploy compiled smart contracts';

module.exports.run = async function (config, args)
{
	//get command-line options
	var cmdline_opts = commandLineArgs([
		{ name: 'no-compile' },
		{ name: 'recompile' },
		{ name: 'network', type: String },
	], {
		argv: args
	});

	console.log("Migration ended.");
}

module.exports.showHelp = function ()
{
	console.log("Use: plum migrate [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --no-compile:            Skip compilation step.");
	console.log("  --recompile:             Recompile all files.");
	console.log("  --network network_name:  Use the specified network.");
}

//------------------------------------------------------------------------------
