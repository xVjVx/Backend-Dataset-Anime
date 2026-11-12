import express from "express";
import db from "../db/config.js";

const router = express.Router();

// Valida a paginação.
function getPagination(query) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);

    if (
        !Number.isSafeInteger(page) || page < 1 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 20
    ) {
        return null;
    }

    return {
        page,
        pageSize,
        skip: (page - 1) * pageSize
    };
}
// Junta as avaliações aos animes
const ratingStages = [
    {
        $lookup: {
            from: "user",
            let: { animeId: "$id" },
            pipeline: [
                { $unwind: "$avaliacoes" },
                {
                    $match: {
                        $expr: {
                            $eq: ["$avaliacoes.item_id", "$$animeId"]
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        nota: "$avaliacoes.nota"
                    }
                }
            ],
            as: "__ratings"
        }
    },
    {
        $set: {
            total_ratings: { $size: "$__ratings" },
            average_score: { $avg: "$__ratings.nota" }
        }
    },
    { $unset: "__ratings" }
];


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

// Endpoint 3
router.post("/", async (req, res) => {
    try {
        const novos = req.body;

        if (!novos || Object.keys(novos).length == 0) {
            return res.status(400).json({
                message: "Request body is empty."
            });
        }

        let result;

        if (Array.isArray(novos)) {
            result = await db.collection("anime").insertMany(novos);
        } else {
            result = await db.collection("anime").insertOne(novos);
        }

        return res.status(201).json(result);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
})

//Endpoint 5
router.get("/score/:anime_id", async (req, res) => {
    try {
        //Verify if the ID is a simple integer
        const anime_id = req.params.anime_id;
        if(!/^[1-9]\d*$/.test(anime_id)){
            return res.status(400).json({
                message: "ID must be a positive integer."
            });
        }

        const id = Number(anime_id);

        //Find the Anime (and the average score)
        const result = await db.collection("anime").aggregate([
            { $match: { id: id } },
            ...ratingStages,
            { $set: { average_score: { $round: ["$average_score", 2] } } },
            { $project: { _id: 0 } }
        ]).toArray();

        //If it doesn't exist, return an error
        if (result.length === 0) {
            return res.status(404).json({
                message: "Anime not found."
            });
        }
        //return the result
        return res.status(200).json(result[0]);
        
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
});

// Enpoint 9
router.put("/:anime_id", async (req, res) => {
    try {
        const updated_id = req.params.anime_id;
        const updates = req.body;

        if(!/^[1-9]\d*$/.test(updated_id)) {
            return res.status(400).json({
                message: "Invalid ID, it must be a positive integer."
            });
        }

        if (!updates || typeof updates != "object" || Array.isArray(updates) || Object.keys(updates).length == 0) {
            return res.status(400).json({
                message: "No fileds provided for update."
            });
        }

        const allowedFields = [
            "titulo",
            "genero",
            "ano_lancamento",
            "estudio",
            "episodios",
            "classificacao_imdb",
            "idioma_original",
            "popularidade"
        ];

        const invalidFields = Object.keys(updates).filter(
            field => !allowedFields.includes(field)
        );

        if (invalidFields.length > 0) {
            return res.status(400).json({
                message: "Invalid fields", invalidFields
            });
        }

        const result = await db.collection("anime").updateOne(
            {id: Number(updated_id)},
            {$set: updates}
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Anime not found."
            });
        }

        return res.status(200).json({
            message: "Anime updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});

// Endpoint 11: mostra os animes mais bem avaliados
router.get("/top/:limit", async (req, res) => {
    const limit = Number(req.params.limit);
    const pagination = getPagination(req.query);

    if (!Number.isSafeInteger(limit) || limit < 1) {
        return res.status(400).json({ message: "Invalid limit." });
    }

    if (pagination === null) {
        return res.status(400).json({ message: "Invalid pagination." });
    }

    try {
        const topAnime = await db.collection("anime").aggregate([
            ...ratingStages,
            { $sort: { average_score: -1, id: 1 } },
            { $limit: limit }
        ]).toArray();

        const results = topAnime.slice(
            pagination.skip,
            pagination.skip + pagination.pageSize
        );

        return res.status(200).json({
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: topAnime.length,
            results
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error." });
    }
});



// Endpoint 12: ordena os animes pelo número de avaliações
router.get("/ratings/:order", async (req, res) => {
    const order = req.params.order.toLowerCase();
    const pagination = getPagination(req.query);

    if (order !== "asc" && order !== "desc") {
        return res.status(400).json({ message: "Use asc or desc." });
    }

    if (pagination === null) {
        return res.status(400).json({ message: "Invalid pagination." });
    }

    try {
        const direction = order === "asc" ? 1 : -1;

        const anime = await db.collection("anime").aggregate([
            ...ratingStages,
            { $sort: { total_ratings: direction, id: 1 } }
        ]).toArray();

        const results = anime.slice(
            pagination.skip,
            pagination.skip + pagination.pageSize
        );

        return res.status(200).json({
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: anime.length,
            results
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error." });
    }
});


// Endpoint 13
router.get("/star", async (req, res) => {
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
            .sort({ classificacao_imdb: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .toArray();

        const data = results.map(anime => ({
            ...anime,
            stars: Math.round(anime.classificacao_imdb / 2)
        }));

        return res.status(200).json({
            first: 1,
            prev: page > 1 ? page - 1 : null,
            next: page < pages ? page + 1 : null,
            last: pages,
            pages: pages,
            items: items,
            data: data
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});
 
 // Endpoint 16 Filtrar por género e episódios
router.get("/filter", async (req, res) => {
    try {
        const page = Number(req.query.page ?? 1);
        const perPage = Number(req.query.perPage ?? 20);

        const { genero, minEpisodios, maxEpisodios } = req.query;

        if (!Number.isInteger(page) || !Number.isInteger(perPage)
            || page < 1 || perPage < 1) {
            return res.status(400).json({
                message: "page and perPage must be positive integers."
            });
        }

        const filter = {};

        // Filtrar por género
        if (genero !== undefined) {
            if (typeof genero !== "string" || genero.trim() === "") {
                return res.status(400).json({
                    message: "Invalid genre."
                });
            }

            // Escapar caracteres especiais e ignorar maiúsculas
            const genre = genero.trim()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            filter.genero = {
                $regex: genre,
                $options: "i"
            };
        }

        // Filtrar pelo número mínimo de episódios
        if (minEpisodios !== undefined) {
            const min = Number(minEpisodios);

            if (!Number.isInteger(min) || min < 0) {
                return res.status(400).json({
                    message: "Invalid minimum episodes."
                });
            }

            filter.episodios = {
                ...filter.episodios,
                $gte: min
            };
        }

        // Filtrar pelo número máximo de episódios
        if (maxEpisodios !== undefined) {
            const max = Number(maxEpisodios);

            if (!Number.isInteger(max) || max < 0) {
                return res.status(400).json({
                    message: "Invalid maximum episodes."
                });
            }

            filter.episodios = {
                ...filter.episodios,
                $lte: max
            };
        }

        // Verificar se o mínimo é maior que o máximo
        if (filter.episodios?.$gte !== undefined &&
            filter.episodios?.$lte !== undefined &&
            filter.episodios.$gte > filter.episodios.$lte) {
            return res.status(400).json({
                message: "Minimum episodes cannot exceed maximum episodes."
            });
        }

        // Contar os animes encontrados
        const items = await db.collection("anime")
            .countDocuments(filter);

        const pages = Math.ceil(items / perPage);

        // Pesquisar os animes
        const results = await db.collection("anime").find(filter)
            .sort({ id: 1 })
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
});

// Endpoint 19 - favorite anime by district
router.get("/district", async (req, res) => {
    try {
        const results = await db.collection("user").aggregate([
            {$match: { distrito: {$type: "string",$ne: "" } } },
            {
                $unwind: {
                    path: "$avaliacoes",
                    includeArrayIndex: "reviewIndex"
                }
            },
            {
                $match: {
                    "avaliacoes.item_id": { $type: "number" },
                    "avaliacoes.nota": {
                        $type: "number",
                        $gte: 1,
                        $lte: 5
                    }
                }
            },
            //e um utilizador avaliou o mesmo anime várias vezes, apenas é considerada a mais recente!
            {
                $sort: {
                    "avaliacoes.data": -1,
                    reviewIndex: -1
                }
            },
            {
                $group: {
                    _id: {
                        distrito: "$distrito",
                        userId: "$id",
                        animeId: "$avaliacoes.item_id"
                    },
                    nota: { $first: "$avaliacoes.nota" }
                }
            },
            // Calcula a média por anime e distrito.
            {
                $group: {
                    _id: {
                        distrito: "$_id.distrito",
                        animeId: "$_id.animeId"
                    },
                    averageRating: { $avg: "$nota" },
                    reviewerCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "anime",
                    localField: "_id.animeId",
                    foreignField: "id",
                    as: "anime"
                }
            },
            { $unwind: "$anime" },
            // Maior média primeiro; desempata pelo número de avaliadores.
            {
                $sort: {
                    "_id.distrito": 1,
                    averageRating: -1,
                    reviewerCount: -1,
                    "_id.animeId": 1
                }
            },
            // Escolhe o anime preferido de cada distrito.
            {
                $group: {
                    _id: "$_id.distrito",
                    animeId: { $first: "$_id.animeId" },
                    averageRating: { $first: "$averageRating" },
                    reviewerCount: { $first: "$reviewerCount" },
                    anime: { $first: "$anime" }
                }
            },
            {
                $project: {
                    _id: 0,
                    distrito: "$_id",
                    animeId: 1,
                    averageRating: { $round: ["$averageRating", 2] },
                    reviewerCount: 1,
                    anime: {
                        id: "$anime.id",
                        titulo: "$anime.titulo"
                    }
                }
            },
            { $sort: { distrito: 1 } }
        ]).toArray();

        return res.status(200).json(results);
    } catch (error) {
        console.error("Failed to get favorite anime by district:", error);
        return res.status(500).json({
            message: "Internal server error."
        });
    }
});




// Endpoint 14
router.get("/:year", async (req, res) => {
    try {
        const year = Number(req.params.year);
        const page = Number(req.query.page ?? 1);
        const perPage = Number(req.query.perPage ?? 20);

        if (!Number.isInteger(year) || year < 1900) {
            return res.status(400).json({
                message: "Invalid year."
            });
        }

        if (!Number.isInteger(page) || !Number.isInteger(perPage)
            || page < 1 || perPage < 1) {
            return res.status(400).json({
                message: "page and perPage must be positive integers."
            });
        }

        const filter = { ano_lancamento: year };

        const items = await db.collection("anime")
            .countDocuments(filter);

        const pages = Math.ceil(items / perPage);

        const results = await db.collection("anime").find(filter)
            .sort({ id: 1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .toArray();

        if (items === 0) {
            return res.status(404).json({
                message: "No anime found for this year."
            });
        }

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
});


export default router;