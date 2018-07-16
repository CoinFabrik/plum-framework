const fs = require('fs');

module.exports = async function (resolve, reject)
{
	contracts.SafeMath.new().then((instance) => {
		console.log("Have SafeMath instance at address: " + instance.address);

		return contracts.SampleToken.new();
	}).then((instance) => {
		console.log("Have SampleToken instance at address: " + instance.address);

		resolve();
	}).catch((err) => {
		reject(err);
	});
}