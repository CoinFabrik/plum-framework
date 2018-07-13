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
const Deploy = require('./src/deploy.js');
const cmdLineParams = require('./src/cmdlineparams.js')

//------------------------------------------------------------------------------

var config;
var actionCode = null, actionCodes = [
	Compile, Deploy
];

if (cmdLineParams.getAction().length == 0) {
	//no action specified
	if (!cmdLineParams.hasArgs()) {
		console.log("Error: Action to execute not specified.");
		showHelp();
		process.exit(1);
	}

	//is help?
	if (cmdLineParams.get('help', 'h')) {
		showHelp();
	}
	else {
		console.log("Error: No action specified. Run 'plum --help' to get assistance.");
	}
	process.exit(1);
}

//map action to action code
for (let i = 0; i < actionCodes.length; i++) {
	if (cmdLineParams.getAction() == actionCodes[i].name) {
		actionCode = actionCodes[i];
		break;
	}
}
if (!actionCode) {
	console.log("Error: Invalid action specified. Run 'plum --help' to get assistance.");
	process.exit(1);
}

//is the user requesting for action help?
if (cmdLineParams.get('help', 'h')) {
	actionCode.showHelp();
	process.exit(1);
}

//read configuration settings
Config.setup().then((config) => {
	//execute action
	return actionCode.run(config);
}).catch((err) => {
	if (err) {
		if (err.stack)
			console.log(err.stack);
		else
			console.log(err.toString());
	}
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
