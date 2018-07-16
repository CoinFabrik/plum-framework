module.exports = async function (resolve, reject)
{
	contracts.SampleToken.deployed().then(async (instance) => {
		console.log("Found SampleToken instance at address: " + instance.address);

		let balance = await instance.balanceOf(accounts[0]);
		console.log("Balance of account[0] is: " + balance.toString());

		resolve();
	}).catch((err) => {
		reject(err);
	});
}
