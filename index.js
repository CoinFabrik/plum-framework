/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */
const Config = require('./src/config.js');
const Compile = require('./src/compile.js');
const Migrate = require('./src/migrate.js');

//------------------------------------------------------------------------------

var args = process.argv.slice(2);
var config;
var actionCode = null, actionCodes = [
	Compile, Migrate
];
var working_directory = null;

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

//is the user requesting for action help?
for (let i = 0; i < args.length; i++) {
	var arg = args[i].toLowerCase();
	if (arg == '--help' || arg == '-h') {
		actionCode.showHelp();
		process.exit(1);
	}
}

//extract global command-line parameters
for (let i = 0; i < args.length; i++) {
	var arg = args[i].toLowerCase();
	if (arg == '--working-directory' || arg == '-wd') {
		if (i + 1 >= args.length) {
			console.log("Error: Missing value for working directory argument.");
			process.exit(1);
		}
		working_directory = args[i + 1];
		if (working_directory.length == 0) {
			console.log("Error: Invalid value for working directory argument.");
			process.exit(1);
		}

		//remove from arguments
		args.splice(i, 2);
		break;
	}
}

//read configuration settings
try {
	config = new Config(working_directory);
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
actionCode.run(config, args).catch((err) => {
	if (err)
		console.log("Error: " + err.toString());
	process.exit(1);
});

//------------------------------------------------------------------------------

function showHelp()
{
	console.log("Use: plum action [options]");
	console.log(" ");
	console.log("Where 'action' can be:");
	for (let i = 0; i < actionCodes.length; i++) {
		console.log('  ' + actionCodes[i].name + ': ' + actionCodes[i].description);
	}
}
