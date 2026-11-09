import express from "express";
import db from "../db/config.js";

const router = express.Router();


//Endpoint 1
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;

        if (page < 1 || perPage < 1) {
            return res.status(400).json({
                message: "page and perPage must be positive integers."
            });
        }

        const items = await db.collection("anime").countDocuments();
        const pages = Math.ceil(items / perPage);

        const results = await db.collection("anime").find({})
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