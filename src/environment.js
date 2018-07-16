/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */
const Web3 = require('web3');
const util = require('util');
const BigNumber = require('bignumber.js');

//------------------------------------------------------------------------------

module.exports.setup = function (config)
{
	return new Promise((resolve, reject) => {
		var env = {
			config: config
		};

		config.getSelectedNetwork().then(async (network) => {
			if (network.provider && typeof network.provider == "function") {
				provider = network.provider();
			}
			else if (network.provider) {
				provider = network.provider;
			}
			else {
				var scheme = (network.secure) ? "https" : "http";
				provider = new Web3.providers.HttpProvider(scheme + "://" + network.host + ":" + network.port.toString());
			}

			env.web3 = new Web3();
			env.web3.setProvider(provider);

			if (typeof network.network_id === 'undefined' || network.network_id == 0) {
				var getNetworkPromise = util.promisify(env.web3.version.getNetwork);

				try {
					env.network_id = await getNetworkPromise();
				}
				catch (err) {
					throw new Error("Could not connect to your RPC client. Please check your RPC configuration.");
				}
			}
			else {
				env.network_id = network.network_id;
			}

			var getAccountsPromise = util.promisify(env.web3.eth.getAccounts);
			env.accounts = await getAccountsPromise();

			env.configureTxOptions = function (tx_opts) {
				if (typeof tx_opts.gas === 'undefined') {
					if (typeof network.gas !== 'undefined')
						tx_opts.gas = network.gas;
					else
						tx_opts.gas = new BigNumber(6000000);
				}
				if (typeof tx_opts.gasPrice === 'undefined') {
					if (typeof network.gasPrice !== 'undefined')
						tx_opts.gasPrice = network.gasPrice;
					else
						tx_opts.gasPrice = new BigNumber(100000000000);
				}
				if (typeof tx_opts.from === 'undefined') {
					if (typeof network.from !== 'undefined')
						tx_opts.from = network.from;
					else
						tx_opts.from = env.accounts[0];
				}
			};

			resolve(env);
		}).catch((err) => {
			reject(err);
			return;
		});
	});
}
