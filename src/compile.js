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
const compiler = require('solc-native');
const cmdLineParams = require('./cmdlineparams.js')
const Contract = require('./contract.js');

//------------------------------------------------------------------------------

module.exports.name = 'compile';

module.exports.description = 'Compiles the smart contracts';

module.exports.run = async function (config, recompileAll)
{
	var source_files = config.getSourceFiles();

	//should us recompile all?
	if (typeof recompileAll === 'undefined') {
		recompileAll = cmdLineParams.get('all') ? true : false;
	}
	if (!recompileAll) {
		source_files = filterNewerFiles(config, source_files);
	}

	for (const source_file of source_files) {
		var dest_file = config.directories.build + source_file.substr(0, source_file.length - 3) + 'json';

		await doCompile(config.directories.contracts + source_file, dest_file, config);
	}
	console.log("Compilation ended.");
}

module.exports.showHelp = function ()
{
	console.log("Use: plum compile [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --all: Recompile all files.");
}

//------------------------------------------------------------------------------

function filterNewerFiles(config, source_files)
{
	//get compiled files
	var compiled_files = config.getCompiledFiles();
	if (compiled_files.length == 0) {
		return source_files;
	}

	var final_files = [];

	for (let i = 0; i < source_files.length; i++) {
		//replace extension
		var s = source_files[i].substr(0, source_files[i].length - 3).toLowerCase() + 'json';

		//find the matching compiled file
		var ndx = compiled_files.findIndex(function(file) {
			return file.toLowerCase() == s;
		});
		if (ndx >= 0) {
			//match found, check last write time of both
			try {
				var src_stat = fs.statSync(config.directories.contracts + source_files[i]);
				var dest_stat = fs.statSync(config.directories.build + compiled_files[ndx]);
				if (src_stat.mtime > dest_stat.mtime) {
					//source is newer, add to list
					final_files.push(source_files[i]);
				}
				else {
					console.log("Skipping '" + config.directories.contracts + source_files[i] + "'...");
				}
			}
			catch (err) {
				//on error, add to list
				final_files.push(source_files[i]);
			}
		}
		else {
			//if not found, add to list
			final_files.push(source_files[i]);
		}
	}

	return final_files;
}

async function doCompile(source_file, dest_file, config)
{
	console.log("Compiling '" + source_file + "'...");

	try {
		var hasErrors = false;
		var ret = await compiler.compile({
			files : source_file
		});

		for (let i = 0; i < ret.errors.length; i++) {
			var err = ret.errors[i];

			var s = '';
			if (err.source) {
				if (err.source.file) {
					s = err.source.file;
				}
			}
			if (s.length > 0)
				s += " ";
			s += '[' + err.severity + '] ' + err.message;
			console.log(s);

			if (err.severity == 'error')
				hasErrors = true;
		}
		if (hasErrors) {
			throw new Error("Compilation failed!");
		}

		var name = path.basename(source_file.toLowerCase(), '.sol');
		var obj = null;

		Object.keys(ret.output).forEach(function (key) {
			if ((!obj) && key.toLowerCase() == name)
				obj = ret.output[key];
		});
		if (obj) {
			try {
				var contract = new Contract(obj, config);
				await contract.save(dest_file);
			}
			catch (err) {
				throw new Error("Unable to save output: " + err.toString());
			}
		}
	}
	catch (err) {
		throw new Error("Unable to compile: " + err.toString());
	}
}
