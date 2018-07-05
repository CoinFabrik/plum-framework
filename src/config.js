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

var DEFAULT_CONFIG_FILENAME = "plum_settings.js"; 

//------------------------------------------------------------------------------

function Config(working_directory) {
	if (!working_directory)
		working_directory = process.cwd();
	var filename = working_directory + path.sep + DEFAULT_CONFIG_FILENAME;

	var default_tx_values = {
		gas: 6721975,
		gasPrice: 100000000000, // 100 Shannon,
		from: null
	  };

	json = fs.readFileSync(filename, {encoding: 'utf8'});
	json = JSON.parse(json);

	this.config = Object.assign({}, json);
}

module.exports = Config;
