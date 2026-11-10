import express from "express";
import db from "../db/config.js";

const router = express.Router();


// Endpoint 2
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;

        if (page < 1 || perPage < 1) {
            return res.status(400).json({
                message: "page and perPage must be positive integers."
            });
        }

        const items = await db.collection("user").countDocuments();
        const pages = Math.ceil(items / perPage);

        const results = await db.collection("user").find({})
            .skip((page - 1) * perPage)
            .limit(perPage)
            .toArray();

        return res.status(200).json({
            first: 1,
            prev: page > 1 ? page - 1 : null,
            next: page < pages ? page + 1 : null,
            last: pages,
            pages: pages,
            items: items,
            data: results
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
})

// Endpoint 4
router.post("/", async (req, res) => {
    try {
        const body = req.body;
        const users = Array.isArray(body) ? body : [body];
        
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }


})

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