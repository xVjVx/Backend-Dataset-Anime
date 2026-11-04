import express from 'express'

import anime from './routes/anime.js'

const app = express()
const port = 3000

app.use(express.json())

app.use("/", anime)

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})