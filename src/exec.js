const path = require('path');
const ganache_cli = require('ganache-cli');
const BigNumber = require('bignumber.js');
const cmdLineParams = require('./cmdlineparams.js')
const Contracts = require('./contracts.js');
const Environment = require('./environment.js');
const ScriptRunner = require('./scriptrunner.js');
const Deploy = require('./deploy.js');

//------------------------------------------------------------------------------

module.exports.name = 'exec';

module.exports.description = 'Run a script inside plum framework environment';

module.exports.run = async function (config)
{
	let test_env = false;

	let filename = cmdLineParams.get('file', 'f', true);
	filename = path.resolve(process.cwd(), filename);

	if (cmdLineParams.get('testenv')) {
		var ganache_opts = {
			gasLimit: '6000000',
			mnemonic: 'master metallic arbitrary sciences throw external reactions kitties before officers rural',
			secure: cmdLineParams.get('lock-accounts')
		};
		if (cmdLineParams.get('log-tx')) {
			ganache_opts.logger = {
				log: function () {
					console.log.apply(console, arguments);
				}
			};
		}

		//override configuration
		config.network_name = 'testenv';
		config.networks = {
			testenv: {
				provider: ganache_cli.provider(ganache_opts)
			}
		};
		test_env = true;
	}

	let env = await Environment.setup(config);

	if (test_env || cmdLineParams.get('deploy')) {
		await Deploy.run(config, env);
	}

	let contracts = await Contracts.initialize(env);

	console.log("Starting execution...");

	await ScriptRunner.run(filename, {
		web3: env.web3,
		contracts: contracts,
		accounts: env.accounts,
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
