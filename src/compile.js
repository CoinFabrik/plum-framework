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
const commandLineArgs = require('command-line-args')
const compiler = require('solc-native');
const helpers = require('./helpers.js');

//------------------------------------------------------------------------------

module.exports.name = 'compile';

module.exports.description = 'Compiles the smart contracts';

module.exports.run = async function (config, args)
{
	//get command-line options
	var cmdline_opts = commandLineArgs([
		{ name: 'all' }
	], {
		argv: args
	});

	var source_files = config.getSourceFiles();
	if (typeof cmdline_opts.all === 'undefined') {
		source_files = filterNewerFiles(config, source_files);
	}

	var source_dir = config.getContractsFolder();
	var target_dir = config.getBuildFolder();

	for (const source_file of source_files) {
		var dest_file = target_dir + source_file.substr(0, source_file.length - 3) + 'json';

		await doCompile(source_dir + source_file, dest_file);
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
	if (compiled_files.length == 0)
		return source_files;

	var source_dir = config.getContractsFolder();
	var target_dir = config.getBuildFolder();
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
				var src_stat = fs.statSync(source_dir + source_files[i]);
				var dest_stat = fs.statSync(target_dir + compiled_files[ndx]);
				if (src_stat.mtime > dest_stat.mtime) {
					//source is newer, add to list
					final_files.push(source_files[i]);
				}
				else {
					console.log("Skipping '" + source_dir + source_files[i] + "'...");
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

async function doCompile(source_file, dest_file)
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
				helpers.mkdirRecursiveSync(path.dirname(dest_file));

				fs.writeFileSync(dest_file, JSON.stringify(obj, null, 2));
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
