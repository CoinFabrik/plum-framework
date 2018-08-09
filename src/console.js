const Repl = require('repl');
const vm = require("vm"); 
const BigNumber = require('bignumber.js');
const Contracts = require('./contracts.js');
const Environment = require('./environment.js');
const Compile = require('./compile.js');
const Deploy = require('./deploy.js');
const Exec = require('./exec.js');
const CmdLineParams = require('./cmdlineparams.js')

//------------------------------------------------------------------------------

module.exports.name = 'console';

module.exports.description = 'Start a console powered by the plum framework environment';

module.exports.run = async function (_options)
{
	let options = Object.assign(_options);
	let test_env = false;

	if (options.cmdLineParams.get('testenv')) {
		Environment.setupTestEnv(options);
		test_env = true;
	}

	if (!(options.env)) {
		options.env = await Environment.setup(options.config);
	}

	if (test_env || options.cmdLineParams.get('deploy')) {
		await Deploy.run(options);
	}

	let contracts = await Contracts.initialize(options.env);

	console.log("Starting console... (Enter `.exit` to quit)");

	await new Promise((resolve, reject) => {
		let repl = Repl.start({
			prompt: "plum@" + options.env.network_id.toString() + "> ",
			ignoreUndefined: true,
			eval: function (cmd, context, filename, callback) {
				let cmdLineParams = CmdLineParams.parse(cmd);
				let res;

				if (cmdLineParams.getAction().length > 0) {
					var actionCode = null, actionCodes = [
						Compile, Deploy, Exec
					];

					//map action to action code
					for (let i = 0; i < actionCodes.length; i++) {
						if (cmdLineParams.getAction() == actionCodes[i].name) {
							actionCode = actionCodes[i];
							break;
						}
					}
					if (actionCode) {
						//is the user requesting for action help?
						if (cmdLineParams.get('help', 'h')) {
							actionCode.showHelp();
							callback(null);
						}
						else {
							//execute action
							actionCode.run({
								config: options.config,
								env: options.env,
								cmdLineParams: cmdLineParams
							}).then((res) => {
								//reload contracts
								return Contracts.initialize(options.env);
							}).then((_contracts) => {
								contracts = _contracts;
								repl.context.contracts = contracts;

								callback(null);
							}).catch((err) => {
								return callback(err);
							});
						}
						return;
					}
				}

				try {
					res = vm.runInContext(cmd, context, {
						displayErrors: false
					});
				}
				catch (err) {
					if (err.name === 'SyntaxError') {
						if (/^(Unexpected end of input|Unexpected token)/.test(err.message)) {
							return callback(new repl.Recoverable(err));
						}
					}

					return callback(err);
				}

				callback(null, res);
				return;
			}
		});
		repl.context.web3 = options.env.web3;
		repl.context.contracts = contracts;
		repl.context.accounts = options.env.accounts;
		repl.context.BigNumber = BigNumber;
		repl.context.network_id = options.env.network_id;
		repl.context.arguments = options.cmdLineParams.toArray();

		repl.on("exit", function () {
			resolve();
		});
	});
}

module.exports.showHelp = function ()
{
	console.log("Use: plum console [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --network network_name:  Use the specified network.");
	console.log("  --deploy:                Deploy contracts before starting the console.");
	console.log("  --no-compile:            Skip compilation step if deploying.");
	console.log("  --recompile:             Recompile all files if deploying.");
	console.log("  --testenv:               Use Ganache as a test environment (implies deploy).");
	console.log("  --lock-accounts:         Lock test environment accounts.");
	console.log("  --log-tx:                Show Ganache output.");
	console.log(" ");
	console.log("This action starts a console ready to receive commands to execute inside the Plum Framework environment. " +
	            "See documentation for details.");
}
