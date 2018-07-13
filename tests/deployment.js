const fs = require('fs');

module.exports = async function (resolve, reject)
{
	contracts.SampleToken.new().then((instance) => {
		console.log("have instance");

		resolve();
	}).catch((err) => {
		reject(err);
	});
}