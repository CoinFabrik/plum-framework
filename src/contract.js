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

//------------------------------------------------------------------------------

function Contract(source, env, config)
{
	var json = null;
	var idx;

	this._dirty = false;
	if (typeof source === 'object') {
		json = source;
		this._dirty = true;
	}
	else if (typeof source === 'string') {
		this.filename = source;
		json = fs.readFileSync(source, {encoding: 'utf8'});
		json = JSON.parse(json);
	}
	else {
		throw new Error("Invalid contract source.");
	}

	//some validations
	if (typeof json.contractName !== 'string' || json.contractName.length == 0) {
		throw new Error("Invalid contract.");
	}
	if (typeof json.abi !== 'object' || Object.prototype.toString.call(json.abi) != '[object Array]') {
		throw new Error("Invalid contract.");
	}
	if (typeof json.bytecode !== 'string') {
		throw new Error("Invalid contract.");
	}

	//validate networks
	if (typeof json.networks === 'object' && Object.prototype.toString.call(json.networks) != '[object Array]') {
		var final_networks = {};

		Object.keys(json.networks).forEach(function (key) {
			key = parseInt(key);
			if (Key != NaN && key > 0 && typeof final_networks[key] === 'undefined') {
				var network = json.networks[i];

				var address = helpers.validateAddress(network.address);
				var lastUpdate = Date.parse(network.lastUpdate);
				if (address && lastUpdate != NaN) {
					var links = {};
					if (typeof networks.links === 'object' && Object.prototype.toString.call(networks.links) != '[object Array]') {
						Object.keys(networks.links).forEach(function (nl_key) {
							var nl_address = helpers.validateAddress(networks.links[nl_key].address);
							if (nl_address) {
								links[nl_key] = nl_address;
							}
						});
					}

					final_networks[key] = {
						address: address,
						lastUpdate: lastUpdate,
						links: links
					}
				}
			}
		});
		json.networks = final_networks;
	}
	else {
		delete json.networks;
	}

	//check bytecode and find links
	this.linksCache = [];
	idx = 0;
	while (idx < json.bytecode.length) {
		let ch = json.bytecode.charCodeAt(idx);
		if ((ch >= 48 && ch <= 57) || (ch >= 65 && ch <= 70) || (ch >= 97 && ch <= 102)) {
			ch = (idx + 1 < json.bytecode.length) ? json.bytecode.charCodeAt(idx + 1) : 0;
			if ((ch < 48 || ch > 57) && (ch < 65 || ch > 70) && (ch < 97 || ch > 102)) {
				throw new Error("Invalid bytecode.");
			}
			idx += 2;
		}
		else if (ch == 95) {
			//start of a link
			var s;

			ch = (idx + 39 < json.bytecode.length) ? json.bytecode.charCodeAt(idx + 39) : 0;
			if (ch != 95) {
				throw new Error("Invalid link in bytecode.");
			}

			s = json.bytecode.substr(idx, 40).replace(new RegExp("^[_]+|[_]+$", "g"), "");
			if (s.length == 0) {
				throw new Error("Invalid link in bytecode.");
			}

			//add to cache
			this.linksCache.push({
				name: s,
				start: idx,
				len: 40
			});
		}
		else {
			throw new Error("Invalid bytecode.");
		}
	}

	this.json = json;
	this.env = env;
	this.config = (env) ? env.config : config;
	this.default_tx_opts = {};
	this.synchronizationTimeout = 240000;
	this.contractName = json.contractName;
}

Contract.prototype.setAddress = function (address)
{
	if (!this.env) {
		throw new Error("Environment not set.");
	}
	var network_id = this.env.network_id;

	address = validateAddress(address);

	if (typeof this.json.networks[network_id] !== 'object') {
		this.json.networks[network_id] = {};
	}
	this.json.networks[network_id].address = address;
	this.json.networks[network_id].lastUpdate = Date.now;
	this._dirty = true;
}

Contract.prototype.clearLinks = function ()
{
	if (!this.env) {
		throw new Error("Environment not set.");
	}
	var network_id = this.env.network_id;

	address = validateAddress(address);

	if (typeof this.json.networks[network_id] !== 'object') {
		this.json.networks[network_id] = {};
	}
	delete this.json.networks[network_id].links;
	this.json.networks[network_id].lastUpdate = Date.now;
	this._dirty = true;
}

Contract.prototype.addLink = function (contractName, address)
{
	if (!this.env) {
		throw new Error("Environment not set.");
	}
	var network_id = this.env.network_id;

	if (contractName.length == 0) {
		throw new Error("Invalid contract name.");
	}
	address = validateAddress(address);

	if (typeof this.json.networks[network_id] !== 'object') {
		this.json.networks[network_id] = {};
	}
	if (typeof this.json.networks[network_id].links !== 'object') {
		this.json.networks[network_id].links = {};
	}
	this.json.networks[network_id].links[contractName] = address;
	this.json.networks[network_id].lastUpdate = Date.now;
	this._dirty = true;
}

Contract.prototype.buildBytecode = function ()
{
	var i, bytecode;

	if (!this.env) {
		throw new Error("Environment not set.");
	}
	var network_id = this.env.network_id;

	if (this.linksCache.length == 0) {
		return this.json.bytecode;
	}
	if (typeof this.json.networks[network_id] !== 'object') {
		throw new Error("Network '" + network_id.toString() + "' not defined.");
	}
	if (typeof this.json.networks[network_id].links !== 'object') {
		throw new Error("Links not defined in network '" + network_id.toString() + "'.");
	}

	//replace links
	bytecode = this.json.bytecode;
	for (i = 0; i < this.linksCache.length; i++) {
		var contractName = this.linksCache[i].name;

		if (typeof this.json.networks[network_id].links[contractName] === 'undefined') {
			throw new Error("Undefined link of library '" + contractName + "'.");
		}
		var address = this.json.networks[network_id].links[contractName].substr(2); //strip 0x prefix

		bytecode = bytecode.substr(0, this.linksCache[i].start) + address + bytecode.substr(this.linksCache[i].start + this.linksCache[i].len);
	}
	return bytecode;
}

Contract.prototype.save = function (filename, force)
{
	if (!filename) {
		filename = this.filename;
	}
	if (typeof filename !== 'string' || filename.length == 0) {
		throw new Error('No destination filename specified.');
	}
	if (this._dirty || force) {
		helpers.mkdirRecursiveSync(path.dirname(filename));
		fs.writeFileSync(filename, JSON.stringify(this.json, null, 2));
		this._dirty = false;
	}
}

Contract.prototype.setDefaultTxOptions = function (tx_opts)
{
	if (!tx_opts)
			tx_opts = {};
	this.default_tx_opts = tx_opts;
}

Contract.prototype.at = function (address)
{
	var self = this;

	return new Promise((resolve, reject) => {
		address = helpers.validateAddress(address);
		if (!address) {
			reject(new Error("Invalid address."));
			return;
		}

		if (!self.env) {
			reject(new Error("Environment not set."));
			return;
		}

		let ContractDef = self.env.web3.eth.contract(self.json.abi);
		self.web3.eth.getCode(address, function(err, code) {
			if (err) {
				reject(err);
				return;
			}

			if (!code || code.replace("0x", "").replace(/0/g, "") === '') {
			  reject(new Error("Cannot create instance of " + self.json.contractName + "; no code at address " + address));
			  return;
			}

			var instance = ContractDef.at(address);

			override(instance, self);

			resolve(instance);
		});
	});
}

Contract.prototype.new = function ()
{
	var self = this;
	var args = Array.prototype.slice.call(arguments);

	return new Promise((resolve, reject) => {
		var tx_opts = {};
		var last_arg = args[args.length - 1];

		// It's only tx_opts if it's an object and not a BigNumber.
		if (typeof last_arg === "object" && Object.prototype.toString.call(last_arg) != '[object Array]' && (!isBigNumber(last_arg))) {
			tx_opts = args.pop();
		} 

		if (!self.env) {
			reject(new Error("Environment not set."));
			return;
		}

		// Validate constructor args
		var constructor = self.json.abi.filter(function(item) {
			return item.type === 'constructor';
		});

		if (constructor.length && constructor[0].inputs.length !== args.length){
			reject(new Error(self.contractName + " contract constructor expected " + constructor[0].inputs.length + " arguments, received " + args.length));
			return;
		}

		let ContractDef = self.env.web3.eth.contract(self.json.abi);
		if (!tx_opts.data) {
			try {
				tx_opts.data = self.buildBytecode();
			}
			catch (err) {
				reject(err);
				return;
			}
		}

		self.env.configureTxOptions(tx_opts);

		args.push(tx_opts, function(err, instance) {
			if (err) {
				reject(err);
				return;
			}

			if (instance != null && instance.address != null) {
				override(instance, self);

				resolve(instance);
			}
		});
		ContractDef.new.apply(ContractDef, args);
	});
}

module.exports = Contract;

//------------------------------------------------------------------------------

function validateAddress(address)
{
	address = helpers.validateAddress(address);
	if (!address)
		throw new Error("Invalid address.");
	return address;
}

function override(instance, _this)
{
	var new_api = {};

	//promisify functions
	for (let i = 0; i < _this.json.abi.length; i++) {
		let abi_item = _this.json.abi[i];

		if (abi_item.type == "function") {
			if (abi_item.constant == true) {
				new_api[abi_item.name] = convertToPromise(instance[abi_item.name], _this);
			}
			else {
				new_api[abi_item.name] = convertToPromise(instance[abi_item.name], _this, true);
			}

			new_api[abi_item.name].call = convertToPromise(instance[abi_item.name].call, _this);
			new_api[abi_item.name].sendTransaction = convertToPromise(instance[abi_item.name].sendTransaction, _this);
			new_api[abi_item.name].request = instance[abi_item.name].request;
			new_api[abi_item.name].estimateGas = convertToPromise(instance[abi_item.name].estimateGas, _this);
		}
	}

	//add a send transaction
	new_api.sendTransaction = convertToPromise(function (tx_opts, callback) {
		if (typeof tx_opts == "function") {
			callback = tx_opts;
			tx_opts = {};
		}
  
		tx_opts.to = self.address;
  
		constructor.web3.eth.sendTransaction.apply(constructor.web3.eth, [tx_opts, callback]);
	}, _this, true);

	new_api.send = function (value)
	{
		return instance.sendTransaction({
			value: value
		});
	};

	Object.keys(new_api).forEach(function (key) {
		instance[key] = new_api[key];
	});
}

function convertToPromise(api_call, _this, makeSync)
{
	return function() {
		var args = Array.prototype.slice.call(arguments);
		var tx_opts = {};
		var last_arg = args[args.length - 1];

		// It's only tx_opts if it's an object and not a BigNumber.
		if (typeof last_arg === "object" && Object.prototype.toString.call(last_arg) != '[object Array]' && (!isBigNumber(last_arg))) {
			tx_opts = args.pop();
		}

		tx_opts = Object.assign( _this.default_tx_opts, tx_opts);

		return new Promise((resolve, reject) => {
			var cb = function(err, res) {
				if (err) {
					reject(err);
					return;
				}

				if (!makeSync) {
					resolve(res);
				}
				else {
					var timeout = 240000;
					if (_this.synchronizationTimeout === 0 || typeof _this.synchronizationTimeout !== 'undefined') {
						timeout = _this.synchronizationTimeout;
					}

					var start = new Date().getTime();

					var queryTxResult = function()
					{
						_this.env.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
							if (err && !err.toString().includes('unknown transaction'))
							{
								reject(err);
								return;
							}

							// Reject on transaction failures, accept otherwise
							// Handles "0x00" or hex 0
							if (receipt != null) {
								if (parseInt(receipt.status, 16) == 0) {
									var err, message, gasLimit;

  									gasLimit = parseInt(tx_opts.gas) || 90000;

									if (receipt.gasUsed === gasLimit) {
										message = "Transaction: " + tx + " exited with an error (status 0) after consuming all gas.\n" +
													"Please check that the transaction:\n" +
													"    - satisfies all conditions set by Solidity `assert` statements.\n" +
													"    - has enough gas to execute the full transaction.\n" +
													"    - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).";
									}
									else {
										message = "Transaction: " + tx + " exited with an error (status 0).\n" +
													"Please check that the transaction:\n" +
													"    - satisfies all conditions set by Solidity `require` statements.\n" +
													"    - does not trigger a Solidity `revert` statement.\n";
									}

									err = new Error(message);
									err.tx = tx;
									err.receipt = receipt; 
									reject(err);
								}
								else {
									resolve({
										tx: tx,
										receipt: receipt /*,
										logs: Utils.decodeLogs(C, instance, receipt.logs) */
									});
								}
								return;
							}

							if (timeout > 0 && new Date().getTime() - start > timeout) {
								reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
								return;
							}

							setTimeout(queryTxResult, 1000);
						});
					};

					queryTxResult();
				}
			};

			self.env.configureTxOptions(tx_opts);

			args.push(tx_opts, cb);
			api_call.apply(instance, args);
		});
	};
}

function isBigNumber(obj)
{
	if (typeof obj === "object") {
		try {
			new BigNumber(obj);
			return true;
		}
		catch (e) {
		}
	}
	return false;
}
