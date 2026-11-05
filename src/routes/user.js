import express from "express";
import db from "../db/config.js";

const router = express.Router();

// Enpoint 8
router.delete("/:user_id", async (req, res) => {
    try {
        const deleted_user = req.params.user_id

        if(!/^[1-9]\d*$/.test(deleted_user)) {
            return res.status(400).json({
                message: "Invalid ID, it must be a positive integer."
            });
        }

        const result = await db.collection("user").deleteOne({
            id: Number(deleted_user)
        });

        if (result.deletedCount == 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json({
            message: "User deleted."
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
})

export default router;