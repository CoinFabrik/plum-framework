module.exports.parse = function (args)
{
	if (typeof args === 'string') {
		let idx, s;

		s = args;
		args = [];

		idx = 0;
		while (idx < s.length) {
			while (idx < s.length && s.charCodeAt(idx) <= 32) {
				idx++;
			}
			if (idx < s.length) {
				let this_arg = '';
				let in_quotes = 0;

				while (idx < s.length) {
					let ch = s.charAt(idx);

					if (in_quotes == 0) {
						if (ch == '"' || ch == '\'') {
							in_quotes = ch;
						}
						else if (ch <= ' ') {
							break;
						}
						else {
							this_arg += ch;
						}
						idx++;
					}
					else {
						if (ch == '\\' && idx + 1 < s.length && (s.charAt(idx + 1) == '"' || s.charAt(idx + 1) == '\'')) {
							this_arg += s.charAt(idx + 1);
							idx++;
						}
						else if (ch == in_quotes) {
							in_quotes = 0;
						}
						else {
							this_arg += ch;
						}
						idx++;
					}
				}
				args.push(this_arg);
			}
		}
	}
	else {
		args = process.argv.slice(2);
	}
	var action = '';

	if (args.length > 0 && args[0].substr(0, 1) != '-') {
		action = args[0].toLowerCase();
		args = args.slice(1);
	}

	return {
		getAction: function () {
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
		},
		toArray: function () {
			return args.slice();
		}
	}
}
