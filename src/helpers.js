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

//------------------------------------------------------------------------------

module.exports.validateAddress = function (address)
{
	if (typeof address !== 'string')
		return null;
	if (address.substr(0, 2).toLowerCase() == '0x')
		address = address.substr(2);
	if (!/^[0-9a-f]{40}$/i.test(address))
		return null;
	return '0x' + address;
}

module.exports.trim = function (str)
{
	return str.replace(/^\s+|\s+$/gm,'');
}

module.exports.mkdirRecursiveSync = function(dir)
{
	var chunks = path.normalize(dir).split(path.sep);
	var currPath = '';

	currPath = chunks[0] + path.sep;
	chunks.shift();

	if (chunks[chunks.length - 1] === '') {
		chunks.pop();
	}

	for (let i = 0; i < chunks.length; i++) {
		currPath += chunks[i] + path.sep;
		if (!fs.existsSync(currPath)) {
			fs.mkdirSync(currPath);
		}
	}
}

module.exports.toInteger = function (value)
{
	if (typeof value === 'string') {
		value = parseInt(value);
		if (value == NaN)
			return null;
	}
	if (typeof value !== 'number' || (value % 1) !== 0) {
		return null;
	}
	return null;
}
