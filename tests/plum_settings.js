module.exports = {
	networks: {
		development: {
			host: "localhost",
			port: 8545,
			//network_id: 1,                  //if network_id is not provided, it will be taken from the network
			//gas: 6000000                    //optional
			//gasPrice: 1000000               //optional
			//provider: new Provider(...)     //if defined, will be used instead of http://host:port
		}
	},
	compiler: {
		optimizer: {
			enabled: false,
			runs: 0
		}
	}
}
