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

var readFilePromise = util.promisify(fs.readFile);

//------------------------------------------------------------------------------

module.exports.run = async function (filename, context)
{
	let folder, script_content;

	folder = path.dirname(filename);

	script_content = await readFilePromise(filename, { encoding: "utf8" });

	if (!context)
		context = {};
	// Provide all the globals listed here: https://nodejs.org/api/globals.html
	context = Object.assign({
		Buffer: Buffer,
		__dirname: folder,
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
				return originalrequire(path.join(folder, pkgPath));
			}
			else {
				// Not absolute, not relative, must be a globally or locally installed module.

				// Try local first.
				// Here we have to require from the node_modules directory directly.
  
			  	var moduleDir = folder;
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
		setTimeout: setTimeout
	}, context);

	let old_cwd = process.cwd();
	process.chdir(path.dirname(filename));

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
}
