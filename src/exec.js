const path = require('path');
const BigNumber = require('bignumber.js');
const Contracts = require('./contracts.js');
const Environment = require('./environment.js');
const ScriptRunner = require('./scriptrunner.js');
const Deploy = require('./deploy.js');

//------------------------------------------------------------------------------

module.exports.name = 'exec';

module.exports.description = 'Run a script inside plum framework environment';

module.exports.run = async function (_options)
{
	let options = Object.assign(_options);
	let test_env = false;

	let filename = options.cmdLineParams.get('file', 'f', true);
	filename = path.resolve(process.cwd(), filename);

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

	console.log("Starting execution...");

	await ScriptRunner.run(filename, {
		web3: options.env.web3,
		contracts: contracts,
		accounts: options.env.accounts,
		BigNumber: BigNumber
	});

	console.log("Execution ended.");
}

module.exports.showHelp = function ()
{
	console.log("Use: plum exec --file script-file.js [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --network network_name:  Use the specified network.");
	console.log("  --deploy:                Deploy contracts before running script.");
	console.log("  --no-compile:            Skip compilation step if deploying.");
	console.log("  --recompile:             Recompile all files if deploying.");
	console.log("  --testenv:               Use Ganache as a test environment (implies deploy).");
	console.log("  --lock-accounts:         Lock test environment accounts.");
	console.log("  --log-tx:                Show Ganache output.");
}
