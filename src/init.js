const fs = require('fs');
const path = require('path');
const cmdLineParams = require('./cmdlineparams.js')
const Config = require('./config.js');
const helpers = require('./helpers.js');

//------------------------------------------------------------------------------

module.exports.name = 'init';

module.exports.description = 'Initializes a folder with a default configuration';

module.exports.run = async function ()
{
	//get working directory override from command-line
	var working_directory = cmdLineParams.get('working-directory', 'wd', true);
	if (working_directory instanceof Error) {
		throw working_directory;
	}
	if (working_directory !== null) {
		if (working_directory.length == 0) {
			throw new Error("Invalid value for working directory argument.");
		}
	}
	else {
		working_directory = '.' + path.sep;
	}

	working_directory = path.resolve(process.cwd(), working_directory);
	working_directory = path.normalize(working_directory + path.sep);

	try {
		var i, files = fs.readdirSync(working_directory);
		for (i = 0; i < files.length; i++) {
			if (files[i] != '.' && files[i] != '..')
				break;
		}
		if (i < files.length) {
			throw 'dummy';
		}
	}
	catch (err) {
		if (err.code !== 'ENOENT') {
			console.log("Target folder exists and is not empty.");
			throw 'silent_quit';
		}
	}

	console.log("Initializing directory for Plum Framework...");

	helpers.mkdirRecursiveSync(working_directory);
	fs.writeFileSync(working_directory + Config.DEFAULT_CONFIG_FILENAME, "module.exports = " + JSON.stringify({
					networks: {
						development: {
							host: "localhost",
							port: 8545,
						}
					},
					compiler: {
						optimizer: {
							enabled: true,
							runs: 2
						}
					}
				}, null, "\t"), { encoding: 'utf8'});
	helpers.mkdirRecursiveSync(working_directory + path.sep + 'build');
	helpers.mkdirRecursiveSync(working_directory + path.sep + 'contracts');
	fs.writeFileSync(working_directory + 'deployment.js', "module.exports = async function (resolve, reject) {\n" +
				"\treject(new Error('Not implemented'));\n" +
				"}\n", { encoding: 'utf8'});

	console.log("Done!");
}

module.exports.showHelp = function ()
{
	console.log("Use: plum init [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --working-directory folder:  Use the specified folder instead of current.");
}
