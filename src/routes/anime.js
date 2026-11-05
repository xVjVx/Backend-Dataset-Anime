import express from "express";
import db from "../db/config.js";

const router = express.Router();

// Endpoint 7
router.delete("/:anime_id", async (req, res) => {
    try {
        const deleted_id = req.params.anime_id;

        if(!/^[1-9]\d*$/.test(deleted_id)) {
            return res.status(400).json({
                message: "Invalid ID, it must be a positive integer."
            });
        }

        const result = await db.collection("anime").deleteOne({
            id: Number(deleted_id)
        });

        if (result.deletedCount == 0) {
            return res.status(404).json({
                message: "Anime not found."
            });
        }

        return res.status(200).json({
            message: "Anime deleted."
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
})

export default router;