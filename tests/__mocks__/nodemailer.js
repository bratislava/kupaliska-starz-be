module.exports = {
	createTransport: () => ({
		verify: () => {},
		sendMail: async () => Promise.resolve(),
	}),
}
