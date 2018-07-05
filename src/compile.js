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
const Web3 = require('web3');

//------------------------------------------------------------------------------

module.exports.name = 'compile';

module.exports.description = 'Compiles the smart contracts';

module.exports.run = function (config, args, working_directory)
{
	//get command-line options
	var cmdline_opts = commandLineArgs([
		{ name: 'all' }
	], {
		argv: args
	});
	
}

module.exports.showHelp = function ()
{
	console.log("Use: plum compile [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --all: Recompile all files.");
}
