const BigNumber = require('bignumber.js');
const Contracts = require('./contracts.js');
const Environment = require('./environment.js');
const Compile = require('./compile.js');
const ScriptRunner = require('./scriptrunner.js');

//------------------------------------------------------------------------------

module.exports.name = 'deploy';

module.exports.description = 'Deploy compiled smart contracts';

module.exports.run = async function (_options)
{
	let options = Object.assign(_options);

	if (options.cmdLineParams.get('recompile')) {
		options.recompileAll = true;
		await Compile.run(options);
	}
	else if (!(options.cmdLineParams.get('no-compile'))) {
		options.recompileAll = false;
		await Compile.run(options);
	}

	if (!(options.env)) {
		options.env = await Environment.setup(options.config);
	}

	let contracts = await Contracts.initialize(options.env);

	console.log("Starting deployment...");

	await ScriptRunner.run(options.config.directories.base + 'deployment.js', {
		web3: options.env.web3,
		contracts: contracts,
		accounts: options.env.accounts,
		BigNumber: BigNumber,
		network_id: options.env.network_id,
		arguments: options.cmdLineParams.toArray()
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
	console.log(" ");
	console.log("This action executes the `deployment.js` script to deploy compiled smart contracts into an Ethereum network. " +
	            "See documentation for details about contents of this file.");
}
