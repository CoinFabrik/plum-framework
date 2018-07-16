/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */
const path = require('path');
const cmdLineParams = require('./cmdlineparams.js')
const Contracts = require('./contracts.js');
const Environment = require('./environment.js');
const ScriptRunner = require('./scriptrunner.js');
const Deploy = require('./deploy.js');
const ganache_cli = require('ganache-cli');

//------------------------------------------------------------------------------

module.exports.name = 'exec';

module.exports.description = 'Run a script inside plum framework environment';

module.exports.run = async function (config)
{
	let run_deploy = false;

	let filename = cmdLineParams.get('file', 'f', true);
	filename = path.resolve(process.cwd(), filename);

	if (cmdLineParams.get('testenv')) {
		//override configuration
		config.network_name = 'testenv';
		config.networks = {
			testenv: {
				provider: ganache_cli.provider({
					gasLimit: '6000000',
					mnemonic: 'dead fish racket soul plunger dirty boats cracker mammal nicholas cage',
				})
			}
		};
		run_deploy = true;
	}

	let env = await Environment.setup(config);

	if (run_deploy || cmdLineParams.get('deploy')) {
		await Deploy.run(config, env);
	}

	let contracts = await Contracts.initialize(env);

	console.log("Starting execution...");

	await ScriptRunner.run(filename, {
		web3: env.web3,
		contracts: contracts,
		accounts: env.accounts
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
}
