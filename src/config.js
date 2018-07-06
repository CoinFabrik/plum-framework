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
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

var DEFAULT_CONFIG_FILENAME = "plum_settings.json"; 

//------------------------------------------------------------------------------

function Config(working_directory)
{
	var self = this;

	if (!working_directory)
		working_directory = '.' + path.sep;

	working_directory = path.resolve(process.cwd(), working_directory);
	working_directory = path.normalize(working_directory + path.sep);

	json = fs.readFileSync(working_directory + DEFAULT_CONFIG_FILENAME, {encoding: 'utf8'});
	try {
		json = JSON.parse(json);
	}
	catch (err) {
		if (err.code === 'ENOENT') {
			throw new Error("Missing configuration file.");
		}
		throw new Error("Invalid configuration file.");
	}

	this.config = Object.assign({}, json);
	if (typeof this.config.networks !== 'object' || Object.prototype.toString.call(this.config.networks) == '[object Array]') {
		throw new Error("Missing networks in configuration file.");
	}

	Object.keys(this.config.networks).forEach(function (key) {
		var network = self.config.networks[key];

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
		else {
			network.gas = new BigNumber(6721975);
		}

		if (typeof network.gasPrice !== 'undefined') {
			try {
				network.gasPrice = new BigNumber(network.gasPrice);
			}
			catch (err) {
				throw new Error("Invalid gas price value for network '" + key + "'.");
			}
		}
		else {
			network.gasPrice = new BigNumber(100000000000);
		}
		
		if (typeof network.from !== 'undefined') {
			network.from = helpers.validateAddress(network.from);
			if (!(network.from))
			throw new Error("Invalid 'from' address for network '" + key + "'.");
		}
		else {
			network.from = null;
		}
	});

	if (typeof this.config.compiler === 'undefined') {
		this.config.compiler = {};
	}
	if (typeof this.config.compiler !== 'object' || Object.prototype.toString.call(this.config.compiler) == '[object Array]') {
		throw new Error("Invalid compiler options in configuration file.");
	}

	this.config.compiler = Object.assign( {
		"optimizer": {
			"enabled": false,
			"runs": 0
		}
	}, this.config.compiler);

	if (typeof this.config.compiler.optimizer.enabled !== 'boolean') {
		if (this.config.compiler.optimizer.enabled !== 'number') {
			throw new Error("Invalid compiler optimization options in configuration file.");
		}
		var enabled = parseInt(this.config.compiler.optimizer.enabled);
		if (enabled == NaN) {
			throw new Error("Invalid compiler optimization options in configuration file.");
		}
		this.config.compiler.optimizer.enabled = (enabled != 0) ? true : false;
	}
	
	if (typeof this.config.compiler.optimizer.runs !== 'undefined') {
		if (typeof this.config.compiler.optimizer.runs !== 'number' || (this.config.compiler.optimizer.runs % 1) !== 0 || this.config.compiler.optimizer.runs < 0) {
			throw new Error("Invalid compiler optimization runs count in configuration file.");
		}
	}
	else {
		this.config.compiler.optimizer.runs = 0;
	}

	if (typeof this.config.directories === 'undefined') {
		this.config.directories = {};
	}
	if (typeof this.config.directories !== 'object' || Object.prototype.toString.call(this.config.directories) == '[object Array]') {
		throw new Error("Invalid directories section in configuration file.");
	}

	this.config.directories = Object.assign( {
		"contracts": "./contracts",
		"build": "./build",
	}, this.config.directories);

	if (typeof this.config.directories.contracts !== 'string') {
		throw new Error("Invalid contracts directory in configuration file.");
	}
	if (typeof this.config.directories.build !== 'string') {
		throw new Error("Invalid build directory in configuration file.");
	}

	this.config.directories.base = working_directory;
	this.config.directories.contracts = path.normalize(path.resolve(working_directory, this.config.directories.contracts) + path.sep);
	this.config.directories.build = path.normalize(path.resolve(working_directory, this.config.directories.build) + path.sep);
}

Config.prototype.getNetwork = function (network_name, cb)
{
	return new Promise((resolve, reject) => {
		if (typeof this.config.networks[network_name] === 'undefined') {
			reject(new Error("Undefined network"));
			return;
		}
		var network = this.config.networks[network_name];
		var provider;

		if (network.provider && typeof network.provider == "function") {
			provider = network.provider();
		}
		else if (network.provider) {
			provider = network.provider;
		}
		else {
			provider = new Web3.providers.HttpProvider("http://" + network.host + ":" + network.port);
		}
		
		//augment "provider"
		provider.getGas = function () {
			return network.gas;
		};

		provider.getGasPrice = function () {
			return network.gasPrice;
		};

		provider.getSender = function () {
			return network.from;
		};

		web3.eth.getCoinbase(function(err, coinbase) {
			if (err) {
				reject(new Error("Could not connect to your RPC client. Please check your RPC configuration."));
				return;
			}

			resolve(provider);
		});
	});
}

Config.prototype.getCompilerOptions = function ()
{
	return Object.assign({}, this.config.compiler);
}

Config.prototype.getContractsFolder = function ()
{
	return this.config.directories.contracts;
}

Config.prototype.getSourceFiles = function ()
{
	return readdir_recursive(this.config.directories.contracts, 'sol');
}

Config.prototype.getBuildFolder = function ()
{
	return this.config.directories.build;
}

Config.prototype.getCompiledFiles = function ()
{
	return readdir_recursive(this.config.directories.build, 'json');
}

module.exports = Config;

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
