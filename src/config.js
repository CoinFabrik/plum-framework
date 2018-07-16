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
const helpers = require('./helpers.js');
const BigNumber = require('bignumber.js');
const cmdLineParams = require('./cmdlineparams.js')

var DEFAULT_CONFIG_FILENAME = "plum_settings.js"; 

//------------------------------------------------------------------------------

module.exports.setup = function ()
{
	return new Promise((resolve, reject) => {
		//get working directory override from command-line
		var working_directory = cmdLineParams.get('working-directory', 'wd', true);
		if (working_directory instanceof Error) {
			reject(working_directory);
			return;
		}
		if (working_directory !== null) {
			if (working_directory.length == 0) {
				reject(new Error("Invalid value for working directory argument."));
				return;
			}
		}
		else {
			working_directory = '.' + path.sep;
		}

		working_directory = path.resolve(process.cwd(), working_directory);
		working_directory = path.normalize(working_directory + path.sep);

		try {
			json = require(working_directory + DEFAULT_CONFIG_FILENAME);
		}
		catch (err) {
			if (err.code === 'MODULE_NOT_FOUND') {
				reject(new Error("Missing configuration file. Cannot proceed."));
			}
			else {
				reject(err);
			}
			return;
		}

		var config = Object.assign({}, json);
		if (typeof config.networks !== 'object' || Object.prototype.toString.call(config.networks) == '[object Array]') {
			reject(new Error("Missing networks in configuration file."));
			return;
		}

		try {
			Object.keys(config.networks).forEach(function (key) {
				var network = config.networks[key];

				if (!(network.provider)) {
					if (typeof network.host !== 'string' || network.host.length == 0) {
						throw new Error("Invalid host for network '" + key + "'.");
					}

					if (typeof network.port !== 'undefined') {
						if (typeof network.port !== 'number' || (network.port % 1) !== 0 || network.port < 1 || network.port > 65535) {
							throw new Error("Invalid port for network '" + key + "'.");
						}
					}
					else {
						network.port = 8545;
					}

					if (typeof network.secure !== 'undefined') {
						if (typeof network.secure !== 'boolean') {
							if (network.secure !== 'number') {
								throw new Error("Invalid secure value for network '" + key + "'.");
							}
							var secure = parseInt(network.secure);
							if (secure == NaN) {
								throw new Error("Invalid secure value for network '" + key + "'.");
							}
							network.secure = (secure != 0) ? true : false;
						}
					}
					else {
						network.secure = false;
					}
				}

				if (typeof network.network_id !== 'undefined') {
					if (typeof network.network_id === 'string' && network.network_id == "*") {
						network.network_id = 0;
					}
					else if (typeof network.network_id !== 'number' || (network.network_id % 1) !== 0 || network.network_id < 0) {
						throw new Error("Invalid id for network '" + key + "'.");
					}
				}
				else {
					network.network_id = 0;
				}

				if (typeof network.gas !== 'undefined') {
					try {
						network.gas = new BigNumber(network.gas);
					}
					catch (err) {
						throw new Error("Invalid gas value for network '" + key + "'.");
					}
				}

				if (typeof network.gasPrice !== 'undefined') {
					try {
						network.gasPrice = new BigNumber(network.gasPrice);
					}
					catch (err) {
						throw new Error("Invalid gas price value for network '" + key + "'.");
					}
				}
				
				if (typeof network.from !== 'undefined') {
					network.from = helpers.validateAddress(network.from);
					if (!(network.from)) {
						throw new Error("Invalid 'from' address for network '" + key + "'.");
					}
				}
			});
		}
		catch (err) {
			reject(err);
			return;
		}

		if (typeof config.compiler === 'undefined') {
			config.compiler = {};
		}
		if (typeof config.compiler !== 'object' || Object.prototype.toString.call(config.compiler) == '[object Array]') {
			reject(new Error("Invalid compiler options in configuration file."));
			return;
		}

		config.compilerOptions = Object.assign( {
			"optimizer": {
				"enabled": false,
				"runs": 0
			}
		}, config.compiler);
		delete config.compiler;

		if (typeof config.compilerOptions.optimizer.enabled !== 'boolean') {
			if (config.compilerOptions.optimizer.enabled !== 'number') {
				reject(new Error("Invalid compiler optimization options in configuration file."));
				return;
			}
			var enabled = parseInt(config.compilerOptions.optimizer.enabled);
			if (enabled == NaN) {
				reject(new Error("Invalid compiler optimization options in configuration file."));
				return;
			}
			config.compilerOptions.optimizer.enabled = (enabled != 0) ? true : false;
		}
		
		if (typeof config.compilerOptions.optimizer.runs !== 'undefined') {
			if (typeof config.compilerOptions.optimizer.runs !== 'number' || (config.compilerOptions.optimizer.runs % 1) !== 0 || config.compilerOptions.optimizer.runs < 0) {
				reject(new Error("Invalid compiler optimization runs count in configuration file."));
				return;
			}
		}
		else {
			config.compilerOptions.optimizer.runs = 0;
		}

		if (typeof config.directories === 'undefined') {
			config.directories = {};
		}
		if (typeof config.directories !== 'object' || Object.prototype.toString.call(config.directories) == '[object Array]') {
			reject(new Error("Invalid directories section in configuration file."));
			return;
		}

		config.directories = Object.assign( {
			"contracts": "./contracts",
			"build": "./build",
		}, config.directories);

		if (typeof config.directories.contracts !== 'string') {
			reject(new Error("Invalid contracts directory in configuration file."));
			return;
		}
		if (typeof config.directories.build !== 'string') {
			reject(new Error("Invalid build directory in configuration file."));
			return;
		}

		config.directories.base = working_directory;
		config.directories.contracts = path.normalize(path.resolve(working_directory, config.directories.contracts) + path.sep);
		config.directories.build = path.normalize(path.resolve(working_directory, config.directories.build) + path.sep);

		//get network from command-line or set default
		config.network_name = cmdLineParams.get('network', null, true);
		if (config.network_name instanceof Error) {
			reject(config.network_name);
			return;
		}
		if (config.network_name === null || config.network_name.length == 0) {
			config.network_name = 'development';
		}

		//public functions
		config.getSourceFiles = function ()
		{
			return readdir_recursive(config.directories.contracts, 'sol');
		};

		config.getCompiledFiles = function ()
		{
			return readdir_recursive(config.directories.build, 'json');
		};

		config.getSelectedNetwork = function ()
		{
			return new Promise((resolve, reject) => {
				if (typeof config.networks[config.network_name] === 'object')
					resolve(config.networks[config.network_name]);
				else
					reject(new Error("Undefined network."));
			});
		};

		resolve(config);
	});
}

//------------------------------------------------------------------------------

function readdir_recursive(dir, file_type, suffix)
{
	var items, files = [];

	if (!suffix) {
		file_type = '.' + file_type.toLowerCase();
		suffix = '';
	}

	try {
		items = fs.readdirSync(dir + suffix);
	}
	catch (err) {
		if (err.code !== 'EACCES' && err.code !== 'ENOENT')
			throw err;
		items = [];
	}

	for (let i = 0; i < items.length; i++) {
		var filename, stats;

		if (items[i] == '.' || items[i] == '..')
			continue;

		filename = path.join(dir + suffix, items[i]);
		try {
			stats = fs.statSync(filename);
		}
		catch (err) {
			if (err.code !== 'EACCES')
				throw err;
			continue;
		}

		if (stats.isDirectory()) {
			var inner_files = readdir_recursive(dir, file_type, suffix + items[i] + path.sep);
			files = files.concat(inner_files);
		}
		else {
			if (items[i].slice(-file_type.length).toLowerCase() == file_type) {
				files.push(suffix + items[i]);
			}
		}
	}
	return files;
}
