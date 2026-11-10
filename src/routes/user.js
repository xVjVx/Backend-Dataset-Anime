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

//Endpoint10
router.put("/:user_id", async (req, res) => {
    const user_id = req.params.user_id;

    if (!/^[1-9]\d*$/.test(user_id) || !Number.isSafeInteger(Number(user_id))) {
        return res.status(400).json({
            message: "Invalid ID, it must be a positive integer."
        });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            message: "Request body must be a JSON object."
        });
    }

    const updates = { ...req.body };
    const updateKeys = Object.keys(updates);

    if (updateKeys.length === 0) {
        return res.status(400).json({
            message: "Request body must contain at least one field to update."
        });
    }

    const invalidKeys = updateKeys.filter((key) =>
        key === "id" ||
        key === "_id" ||
        key.startsWith("$") ||
        key.includes(".")
    );

    if (invalidKeys.length > 0) {
        return res.status(400).json({
            message: "ID fields and MongoDB operator/path keys cannot be updated."
        });
    }

    try {
        const filter = { id: Number(user_id) };
        const result = await db.collection("user").updateOne(
            filter,
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        return res.status(200).json({ message: "User updated." });
    } catch (error) {
        console.error("Failed to update user:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});

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
});

export default router;