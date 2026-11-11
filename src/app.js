import express from 'express'

import anime from './routes/anime.js'
import user from './routes/user.js'

const app = express()
const port = process.env.PORT

app.use(express.json())

// Anime Route
app.use("/anime", anime)

//User Route
app.use("/users", user)

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})