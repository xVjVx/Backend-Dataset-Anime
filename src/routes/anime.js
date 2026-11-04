import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/", async (req, res) => {
    let results = await db.collection('anime').find({})
    .limit(5)
    .toArray();
    res.send(results).status(200);
});

export default router;