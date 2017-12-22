const port = process.env.PORT || 8819
const express = require('express')
express()
	.use(express.static('src'))
	.listen(port, () => console.log(`openui5 hacker news pwa sample is live on port ${port}`))