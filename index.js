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
const Config = require('./src/config.js');

const Compile = require('./src/compile.js');

//------------------------------------------------------------------------------

var args = process.argv.slice(2);
var config;
var actionCode = null, actionCodes = [ Compile ];

//if no arguments, show help
if (args.length < 1) {
	console.log("Error: Action to execute not specified.");
	showHelp();
	process.exit(1);
}

//extract action to execute
action = args[0].toLowerCase();
args = args.slice(1);

//is help?
if (action == '--help' || action == '-h') {
	showHelp();
	process.exit(1);
}

//map action to action code
for (let i = 0; i < actionCodes.length; i++) {
	if (action == actionCodes[i].name) {
		actionCode = actionCodes[i];
		break;
	}
}
if (!actionCode) {
	console.log("Error: Invalid action specified. Run 'plum --help' to get assistance.");
	process.exit(1);
}

//extract global command-line parameters
var cmdline_opts = commandLineArgs([
	{ name: 'working-directory', alias: 'd', type: String },
	{ name: 'help', alias: 'h' }
], {
	argv: args
});

//show action's help if requested
if (typeof cmdline_opts["help"] !== 'undefined') {
	actionCode.showHelp();
	process.exit(1);
}

//check if a working directory was specified
if (typeof cmdline_opts["working-directory"] !== 'string')
	cmdline_opts["working-directory"] = './';

cmdline_opts["working-directory"] = path.resolve(process.cwd(), cmdline_opts["working-directory"]);
cmdline_opts["working-directory"] = path.normalize(cmdline_opts["working-directory"] + path.sep);

//read configuration settings
try {
	config = new Config(cmdline_opts["working-directory"]);
}
catch (err) {
	if (err.code === 'ENOENT') {
		console.log("Error: Missing configuration file. Cannot proceed.");
	}
	else {
		console.log(err.toString());
	}
	process.exit(1);
}

//execute action
actionCode.run(config, args, cmdline_opts["working-directory"]);

function showHelp()
{
	console.log("Use: plum action [options]");
	console.log(" ");
	console.log("Where 'action' can be:");
	for (let i = 0; i < actionCodes.length; i++) {
		console.log('  ' + actionCodes[i].name + ': ' + actionCodes[i].description);
	}
}
