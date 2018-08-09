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

module.exports.run = async function (_options)
{
	let options = Object.assign(_options);
	let source_files;

	//should us recompile all?
	if (typeof options.recompileAll === 'undefined') {
		options.recompileAll = options.cmdLineParams.get('all') ? true : false;
	}

	source_files = options.config.getSourceFiles();
	if (!(options.recompileAll)) {
		source_files = filterNewerFiles(options.config, source_files);
	}

	await compileFiles(source_files, options.config);

	console.log("Compilation ended.");
}

module.exports.showHelp = function ()
{
	console.log("Use: plum compile [options]");
	console.log(" ");
	console.log("Where 'options' can be:");
	console.log("  --all: Recompile all files.");
	console.log(" ");
	console.log("This action compiles Solidity files inside `contracts` folder and puts the generated json files inside the `build` folder. " +
	            "The directory tree inside `contracts` in maintained.");
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
		let s = source_files[i].substr(0, source_files[i].length - 3).toLowerCase() + 'json';

		//find the matching compiled file
		let ndx = compiled_files.findIndex(function(file) {
			return file.toLowerCase() == s;
		});
		if (ndx >= 0) {
			//match found, check last write time of both
			try {
				let src_stat = fs.statSync(config.directories.contracts + source_files[i]);
				let dest_stat = fs.statSync(config.directories.build + compiled_files[ndx]);
				if (src_stat.mtime > dest_stat.mtime) {
					//source is newer, add to list
					final_files.push(source_files[i]);
				}
				else {
					//we still have to check if some of the imported dependencies is newer
					const regex = /import\s+.*"([^"]*)"\s*;/gm;
					let j, filename, imported_files = [];

					try {
						let content = fs.readFileSync(config.directories.contracts + source_files[i], 'utf-8');
						let m;

						while ((m = regex.exec(content)) !== null) {
							// This is necessary to avoid infinite loops with zero-width matches
							if (m.index === regex.lastIndex) {
								regex.lastIndex++;
							}
							if (m.length == 2) {
								imported_files.push(m[1]);
							}
						}
					}
					catch (err) {
						//ignore errors
					}
					for (j = 0; j < imported_files.length; j++) {
						try {
							filename = path.resolve(config.directories.contracts, imported_files[j]);
							src_stat = fs.statSync(filename);
							if (src_stat.mtime > dest_stat.mtime) {
								break;
							}
						}
						catch (err) {
							//ignore errors
						}
					}
					if (j < imported_files.length) {
						//imported file source is newer, add to list
						final_files.push(source_files[i]);
					}
					else {
						console.log("Skipping '" + config.directories.contracts + source_files[i] + "'...");
					}
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

		if (source_files.length == 0) {
			resolve();
		}
		const compileNextFile = (_id) => {
			if ((!gotError) && idx < source_files.length) {
				activeCount++;

				let src = config.directories.contracts + source_files[idx];
				let destFolder = path.dirname(config.directories.build + source_files[idx]);
				if (destFolder.slice(-1) != path.sep) {
					destFolder += path.sep;
				}
				idx++;

				console.log(_id.toString() + "> Compiling '" + src + "'...");
			
				compileFile(src, config).then((res) => {
					if (!gotError) {
						//print output if we didn't got a previous error
						printWarningsAndErrors(_id, res);

						gotError = saveOutput(res.json, destFolder, config);
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
				let normalized_source_file = path.normalize(source_file);
				//let name = path.basename(source_file.toLowerCase(), '.sol');

				obj = {};
				Object.keys(ret.output).forEach(function (key) {
					if (path.normalize(ret.output[key].sourceFile) == normalized_source_file)
						obj[key] = ret.output[key];
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

function saveOutput(json, destFolder, config)
{
	try {
		if (json) {
			Object.keys(json).forEach(function (key) {
				var contract = new Contract(json[key], config);
				contract.save(destFolder + json[key].contractName + ".json");
			});
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