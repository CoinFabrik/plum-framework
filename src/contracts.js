/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */
const Contract = require('./contract.js');

//------------------------------------------------------------------------------

module.exports.initialize = function (env)
{
	return new Promise((resolve, reject) => {
		var compiled_files, contracts = {};

		try {
			compiled_files = env.config.getCompiledFiles();

			for (let i = 0; i < compiled_files.length; i++) {
				var contract = new Contract(env.config.directories.build + compiled_files[i], env);
				contracts[contract.contractName] = contract;
			}
		}
		catch (err) {
			reject(err);
			return;
		}

		resolve(contracts);
	});
}

module.exports.saveAll = function (contracts)
{
	Object.keys(contracts).forEach(function (key) {
		contracts[key].save();
	});
}
