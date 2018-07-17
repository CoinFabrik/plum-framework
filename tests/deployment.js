const fs = require('fs');

module.exports = async function (resolve, reject)
{
	const _1e18 = '1000000000000000000';

	contracts.SafeMath.new().then((instance) => {
		console.log("Have SafeMath instance at address: " + instance.address);

		return contracts.SampleToken.new("PFCAT", "Plum Framework Cats token", new BigNumber(_1e18));
	}).then((instance) => {
		console.log("Have SampleToken[PFCAT] instance at address: " + instance.address);

		return contracts.SampleToken.new("PFDOG", "Plum Framework Dogs token", new BigNumber(_1e18));
	}).then((instance) => {
		console.log("Have SampleToken[PFDOG] instance at address: " + instance.address);

		resolve();
	}).catch((err) => {
		reject(err);
	});
}