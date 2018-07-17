module.exports = async function (resolve, reject)
{
	var catTokenInstance = null;
	var dogTokenInstance = null;

	contracts.SampleToken.deployed(0).then(async (instance) => {
		console.log("Found SampleToken[PFCAT] instance at address: " + instance.address);
		catTokenInstance = instance;

		return contracts.SampleToken.deployed(1);
	}).then(async (instance) => {
		console.log("Found SampleToken[PFDOG] instance at address: " + instance.address);
		dogTokenInstance = instance;

		return catTokenInstance.mint(accounts[1], new BigNumber(100));
	}).then(async (tx) => {
		return dogTokenInstance.mint(accounts[1], new BigNumber(200));
	}).then(async (tx) => {

		let balance = await dogTokenInstance.balanceOf(accounts[1]);
		console.log("Balance of account[1] is: " + balance.toString());

		resolve();
	}).catch((err) => {
		reject(err);
	});
}
