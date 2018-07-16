/**
 * [plum-framework]{@link https://github.com/CoinFabrik/plum-framework}
 *
 * @version 1.0.0
 * @author Mauro H. Leggieri
 * @copyright CoinFabrik, 2018
 * @license MIT
 */
const cmdLineParams = require('./cmdlineparams.js')
const Contracts = require('./contracts.js');
const Environment = require('./environment.js');
const Compile = require('./compile.js');
const ScriptRunner = require('./scriptrunner.js');

//------------------------------------------------------------------------------

module.exports.name = 'deploy';

module.exports.description = 'Deploy compiled smart contracts';

module.exports.run = async function (config, env)
{
	if (cmdLineParams.get('recompile')) {
		await Compile.run(config, true);
	}
	else if (!cmdLineParams.get('no-compile')) {
		await Compile.run(config, false);
	}

	if (!env) {
		env = await Environment.setup(config);
	}

	let contracts = await Contracts.initialize(env);

	console.log("Starting deployment...");

	await ScriptRunner.run(config.directories.base + 'deployment.js', {
		web3: env.web3,
		contracts: contracts,
		accounts: env.accounts
	});

	Contracts.saveAll(contracts);

	console.log("Deployment ended.");
}

module.exports.showHelp = function ()
{
	console.log("Use: plum deploy [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --no-compile:            Skip compilation step.");
	console.log("  --recompile:             Recompile all files.");
	console.log("  --network network_name:  Use the specified network.");
}
