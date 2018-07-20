const path = require('path');
const fs = require('fs');
const compiler = require('solc-native');
const cmdLineParams = require('./cmdlineparams.js')
const Contract = require('./contract.js');
const helpers = require('./helpers.js');

const MULTI_COMPILE = 4;

//------------------------------------------------------------------------------

module.exports.name = 'compile';

module.exports.description = 'Compiles the smart contracts';

module.exports.run = async function (config, recompileAll)
{
	let i, source_files = config.getSourceFiles();

	//should us recompile all?
	if (typeof recompileAll === 'undefined') {
		recompileAll = cmdLineParams.get('all') ? true : false;
	}
	if (!recompileAll) {
		source_files = filterNewerFiles(config, source_files);
	}

	await compileFiles(source_files, config);

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

function compileFiles(source_files, config)
{
	return new Promise((resolve, reject) => {
		let idx = 0;
		let activeCount = 0;
		let gotError = null;

		const compileNextFile = (_id) => {
			if ((!gotError) && idx < source_files.length) {
				activeCount++;

				var src = config.directories.contracts + source_files[idx];
				var dest = config.directories.build + source_files[idx].substr(0, source_files[idx].length - 3) + 'json';
				idx++;

				console.log(_id.toString() + "> Compiling '" + src + "'...");
			
				compileFile(src, config).then((res) => {
					if (!gotError) {
						//print output if we didn't got a previous error
						printWarningsAndErrors(_id, res);

						gotError = saveOutput(res.json, dest, config);
					}

					activeCount--;
					compileNextFile(_id);
				},
				(err) => {
					if (!gotError) {
						//print output if we didn't got a previous error
						printWarningsAndErrors(_id, err);

						gotError = err;
					}

					activeCount--;
					compileNextFile(_id);
				});
			}
			else {
				if (activeCount == 0) {
					if (!gotError)
						resolve();
					else
						reject(gotError);
				}
			}
		};

		for (let i = 0; i < source_files.length && i < MULTI_COMPILE; i++) {
			compileNextFile(i + 1);
		}
	});
}

function compileFile(source_file, config)
{
	return new Promise(async (resolve, reject) => {
		let warningsAndErrors = [];
		let err = null;
		let obj = null;

		try {
			let hasError = false;

			let ret = await compiler.compile({
				file: source_file,
				optimize: config.compilerOptions.optimizer.enabled,
				optimize_runs: config.compilerOptions.optimizer.runs
			});

			for (let i = 0; i < ret.errors.length; i++) {
				let _err = ret.errors[i];

				let s = '';
				if (_err.source) {
					if (_err.source.file) {
						s = _err.source.file;
					}
				}
				if (s.length > 0) {
					s += " ";
				}
				warningsAndErrors.push(s + '[' + _err.severity + '] ' + _err.message);

				if (_err.severity == 'error') {
					hasError = true;
				}
			}
			if (!hasError) {
				let name = path.basename(source_file.toLowerCase(), '.sol');

				Object.keys(ret.output).forEach(function (key) {
					if ((!obj) && key.toLowerCase() == name)
						obj = ret.output[key];
				});
			}
			else {
				let _err = new Error("Compilation failed!");
				_err.warningsAndErrors = warningsAndErrors;
				throw _err;
			}
		}
		catch (_err) {
			err = _err;
		}

		if (!err) {
			resolve({
				json: obj,
				warningsAndErrors: warningsAndErrors
			});
		}
		else {
			reject(err);
		}
	});
}

function printWarningsAndErrors(_id, obj)
{
	if (obj.warningsAndErrors) {
		obj.warningsAndErrors.forEach((s) => {
		console.log(_id.toString() + "> " + s);
		});
	}
}

function saveOutput(json, dest_file, config)
{
	try {
		if (json) {
			var contract = new Contract(json, config);
			contract.save(dest_file);
		}
		else {
			//if no output, then create a dummy file
			helpers.mkdirRecursiveSync(path.dirname(dest_file));
			fs.writeFileSync(dest_file, "{ }\n");
		}
	}
	catch (err) {
		return new Error("Unable to save output: " + err.toString());
	}
	return null;
}