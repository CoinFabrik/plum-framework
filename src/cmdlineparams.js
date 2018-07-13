/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */

//------------------------------------------------------------------------------

function CommandLineParameters()
{
	var self = this;
	var args = process.argv.slice(2);
	var action = '';

	if (args.length > 0 && args[0].substr(0, 1) != '-') {
		action = args[0].toLowerCase();
		args = args.slice(1);
	}

	return {
		getAction: function ()
		{
			return action;
		},
		hasArgs: function () {
			return args.length > 0;
		},
		get: function (long_name, short_name, hasValue, acceptMultipleValues)
		{
			if (!long_name)
				throw new Error("Missing argument name.");
			long_name = '--' + long_name.toLowerCase();
			if (short_name)
				short_name = '-' + short_name.toLowerCase();

			for (let idx = 0; idx < args.length; idx++) {
				let param = args[idx].toLowerCase();
				if (param == long_name || (short_name && param == short_name)) {
					if (!hasValue)
						return true;

					if (acceptMultipleValues) {
						var values = [];

						idx++;
						while (idx < args.length && args[idx].substr(0, 1) != '-') {
							values.push(args[idx++]);
						}
						return values;
					}

					if (idx + 1 >= args.length)
						return new Error("Missing argument for parameter '" + param + "'.");
					return args[idx + 1];
				}
			}
			return null;
		}
	}
}

module.exports = new CommandLineParameters();
