const Config = require('./src/config.js');
const Compile = require('./src/compile.js');
const Deploy = require('./src/deploy.js');
const Exec = require('./src/exec.js');
const Init = require('./src/init.js');
const cmdLineParams = require('./src/cmdlineparams.js')

//------------------------------------------------------------------------------

var config;
var actionCode = null, actionCodes = [
	Compile, Deploy, Exec, Init
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

if (actionCode == Init) {
	actionCode.run().catch((err) => {
		dumpError(err);
		process.exit(1);
	});
}
else {
	//read configuration settings
	Config.setup().then((config) => {
		//execute action
		return actionCode.run(config);
	}).catch((err) => {
		dumpError(err);
		process.exit(1);
	});
}

//------------------------------------------------------------------------------

function showHelp()
{
	let i, maxlen;

	console.log("Use: plum action [options]");
	console.log(" ");
	console.log("Where 'action' can be:");

	for (i = maxlen = 0; i < actionCodes.length; i++) {
		if (actionCodes[i].name.length > maxlen)
			maxlen = actionCodes[i].name.length;
	}
	for (i = 0; i < actionCodes.length; i++) {
		console.log('  ' + actionCodes[i].name + ':' + (' '.repeat(1 + maxlen - actionCodes[i].name.length)) + actionCodes[i].description + '.');
	}
}

function dumpError(err)
{
	if (err && err !== 'silent_quit') {
		if (err.stack)
			console.log(err.stack);
		else
			console.log(err.toString());
	}
}
