/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const vm = require('vm');
const util = require('util');
const originalrequire = require("original-require");
const cmdLineParams = require('./cmdlineparams.js')
const Contracts = require('./contracts.js');
const Environment = require('./environment.js');
const Compile = require('./compile.js');

var readFilePromise = util.promisify(fs.readFile);

//------------------------------------------------------------------------------

module.exports.name = 'deploy';

module.exports.description = 'Deploy compiled smart contracts';

module.exports.run = async function (config)
{
	if (cmdLineParams.get('recompile')) {
		Compile.run(config, true);
	}
	else if (!cmdLineParams.get('no-compile')) {
		Compile.run(config, false);
	}

	let env = await Environment.setup(config);

	let contracts = await Contracts.initialize(env);

	var filename = config.directories.base + 'deployment.js';

	let script_content = await readFilePromise(filename, { encoding: "utf8" });

	// Provide all the globals listed here: https://nodejs.org/api/globals.html
	var context = {
		Buffer: Buffer,
		__dirname: path.dirname(filename),
		__filename: filename,
		clearImmediate: clearImmediate,
		clearInterval: clearInterval,
		clearTimeout: clearTimeout,
		console: console,
		exports: exports,
		global: global,
		module: new Module(filename),
		process: process,
		require: function (pkgPath)
		{
			// Ugh. Simulate a full require function for the file.
			pkgPath = pkgPath.trim();

			// If absolute, just require.
			if (path.isAbsolute(pkgPath)) {
				return originalrequire(pkgPath);
			}
  
			// If relative, it's relative to the file.
			if (pkgPath[0] == ".") {
				return originalrequire(path.join(path.dirname(filename), pkgPath));
			}
			else {
				// Not absolute, not relative, must be a globally or locally installed module.

				// Try local first.
				// Here we have to require from the node_modules directory directly.
  
			  	var moduleDir = path.dirname(filename);
			  	while (true) {
					try {
						return originalrequire(path.join(moduleDir, 'node_modules', pkgPath));
					}
					catch (e)
					{ }
					var oldModuleDir = moduleDir;
					moduleDir = path.join(moduleDir, '..');
					if (moduleDir === oldModuleDir)
						break;
				}
  
				// Try global, and let the error throw.
				return originalrequire(pkgPath);
			}
		},
		setImmediate: setImmediate,
		setInterval: setInterval,
		setTimeout: setTimeout,
		web3: env.web3,
		contracts: contracts
	};

	let old_cwd = process.cwd();
	process.chdir(path.dirname(filename));

	console.log("Starting deployment...");
	try {
		let script = new vm.Script(script_content, {
			filename: filename
		});
		script.runInNewContext(context);

		if (typeof context.module.exports !== 'function') {
			throw new Error('Expected function in module.exports.');
		}

		let p = new Promise((resolve, reject) => {

			context.module.exports(resolve, reject);
		})
		await p;
	}
	catch (err) {
		process.chdir(old_cwd);

		throw err;
	}
	process.chdir(old_cwd);

	Contracts.saveAll(contracts);

	console.log("Deployment ended.");
}

module.exports.showHelp = function ()
{
	console.log("Use: plum deploy [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --no-compile:            Skip compilation step.");
	console.log("  --recompile:             Recompile all files.");
	console.log("  --network network_name:  Use the specified network.");
}
