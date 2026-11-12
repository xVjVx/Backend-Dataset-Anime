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

        //Check if the body is not empty
        if (users.length === 0){
            return res.status(400).json({
                message: "Body must contain at least one user."
            })
        }
        //Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emails = [];
        for (const u of users){
            if (!u || typeof u !== "object" || Array.isArray(u)) {
                return res.status(400).json({
                    message: "Each user must be an object."
                });
            }
            if (typeof u.nome !== "string" || u.nome.trim() === "") {
                return res.status(400).json({
                    message: "Field 'nome' is required and must be a non-empty string."
                });
            }
            if (typeof u.email !== "string" || !emailRegex.test(u.email.trim())) {
                return res.status(400).json({
                    message: "Field 'email' is required and must be a valid email."
                });
            }
            if (u.idade !== undefined && (!Number.isInteger(u.idade) || u.idade < 1)) {
                return res.status(400).json({
                    message: "Field 'idade' must be a positive integer."
                });
            }
            emails.push(u.email.trim().toLowerCase());
        }
        // Duplicate emails inside the request itself
        if (new Set(emails).size !== emails.length) {
            return res.status(409).json({
                message: "The request contains duplicate emails."
            });
        }

        
        //next available id
        const last = await db.collection("user").find({}).sort({id:-1})
            .limit(1).toArray();
        let nextId = last.length > 0 ? last[0].id + 1 : 1;
        const today = new Date().toISOString().slice(0, 10)

         // Build the documents
        const newUsers = users.map((u, i) => ({
            id: nextId++,
            nome: u.nome.trim(),
            email: emails[i],
            idade: u.idade ?? null,
            cidade: u.cidade ?? null,
            distrito: u.distrito ?? null,
            pais: u.pais ?? "Portugal",
            data_registo: today,
            ativo: u.ativo ?? true,
            avaliacoes: []
        }));
        await db.collection("user").insertMany(newUsers);

        return res.status(201).json(Array.isArray(body) ? newUsers : newUsers[0]);

        
    } catch (error) {
        //On DB Compass, email is an unique index
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already in use."
            });
        }
        return res.status(500).json({
            message: error.message
        });
    }


})


// Endpoint 6
router.get("/:user_id", async (req, res) => {
    try {
        const user_id = req.params.user_id;

        // Only accept positive integers
        if (!/^[1-9]\d*$/.test(user_id)) {
            return res.status(400).json({
                message: "Invalid ID, it must be a positive integer."
            });
        }

        const id = Number(user_id);

        const result = await db.collection("user").aggregate([
            // Find the user
            { $match: { id: id } },

            // Get the animes this user reviewed (deleted animes are not found)
            {
                $lookup: {
                    from: "anime",
                    localField: "avaliacoes.item_id",
                    foreignField: "id",
                    as: "__animes"
                }
            },

            // Keep reviews of existing animes, most recent first
            {
                $set: {
                    __sorted: {
                        $sortArray: {
                            input: {
                                $filter: {
                                    input: "$avaliacoes",
                                    as: "a",
                                    cond: { $in: ["$$a.item_id", "$__animes.id"] }
                                }
                            },
                            sortBy: { data: -1 }
                        }
                    }
                }
            },

            // Remove duplicates: keep only the most recent review of each anime
            {
                $set: {
                    __unique: {
                        $reduce: {
                            input: "$__sorted",
                            initialValue: [],
                            in: {
                                $cond: [
                                    { $in: ["$$this.item_id", "$$value.item_id"] },
                                    "$$value",
                                    { $concatArrays: ["$$value", ["$$this"]] }
                                ]
                            }
                        }
                    }
                }
            },

            // Top 3: best rating first, ties by most recent date
            {
                $set: {
                    top_3: {
                        $map: {
                            input: {
                                $slice: [
                                    {
                                        $sortArray: {
                                            input: "$__unique",
                                            sortBy: { nota: -1, data: -1 }
                                        }
                                    },
                                    3
                                ]
                            },
                            as: "a",
                            in: {
                                item_id: "$$a.item_id",
                                // Get the anime title
                                titulo: {
                                    $arrayElemAt: [
                                        "$__animes.titulo",
                                        { $indexOfArray: ["$__animes.id", "$$a.item_id"] }
                                    ]
                                },
                                nota: "$$a.nota",
                                comentario: "$$a.comentario",
                                data: "$$a.data"
                            }
                        }
                    }
                }
            },

            // Remove temporary fields, _id and the full reviews list
            { $project: { _id: 0, avaliacoes: 0, __animes: 0, __sorted: 0, __unique: 0 } }
        ]).toArray();

        // No result = user doesn't exist
        if (result.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json(result[0]);
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
});

//Endpoint10
router.put("/:id", async (req, res) => {
    const user_id = req.params.id;

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

// Endpoint 15
router.post("/:id/review/:dataset_id", async (req, res) => {
    try {
        const user_id = req.params.id;
        const anime_id = req.params.dataset_id;
        const { nota, comentario } = req.body;

        // Validar IDs
        if (!/^[1-9]\d*$/.test(user_id) ||
            !/^[1-9]\d*$/.test(anime_id)) {
            return res.status(400).json({
                message: "Invalid ID, it must be a positive integer."
            });
        }

        // Validar nota
        if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
            return res.status(400).json({
                message: "Nota must be an integer between 1 and 5."
            });
        }

        // Validar comentário
        if (typeof comentario !== "string" ||
            comentario.trim() === "") {
            return res.status(400).json({
                message: "Comentario must be a non-empty string."
            });
        }

        // Verificar se o utilizador existe
        const user = await db.collection("user").findOne({
            id: Number(user_id)
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Verificar se o anime existe
        const anime = await db.collection("anime").findOne({
            id: Number(anime_id)
        });

        if (!anime) {
            return res.status(404).json({
                message: "Anime not found."
            });
        }

        // Criar a nova avaliação
        const review = {
            item_id: Number(anime_id),
            nota: nota,
            comentario: comentario.trim(),
            data: new Date().toISOString().split("T")[0]
        };

        // Adicionar avaliação ao utilizador
        await db.collection("user").updateOne(
            { id: Number(user_id) },
            { $push: { avaliacoes: review } }
        );

        return res.status(201).json({
            message: "Review added successfully.",
            review: review
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});

// Lista de animes vistos
router.post("/:user_id/watched_anime", async (req, res) => {
    try {
        const user_id = req.params.user_id;
        const animes = req.body.animes;

        // Validar o ID do utilizador
        if (!/^[1-9]\d*$/.test(user_id)) {
            return res.status(400).json({
                message: "Invalid user ID, it must be a positive integer."
            });
        }

        // Validar a lista de animes
        if (!Array.isArray(animes) || animes.length === 0) {
            return res.status(400).json({
                message: "Animes must be a non-empty array."
            });
        }

        // Validar os IDs dos animes
        if (!animes.every(id => Number.isSafeInteger(id) && id > 0)) {
            return res.status(400).json({
                message: "All anime IDs must be positive integers."
            });
        }

        // Verificar se os animes existem
        const existingAnimes = await db.collection("anime")
            .find({ id: { $in: animes } })
            .project({ id: 1, _id: 0 })
            .toArray();

        if (existingAnimes.length !== new Set(animes).size) {
            return res.status(400).json({
                message: "One or more anime IDs do not exist."
            });
        }

        // Adicionar os animes à lista do utilizador
        const result = await db.collection("user").updateOne(
            { id: Number(user_id) },
            {
                $addToSet: {
                    animes_vistos: { $each: animes }
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json({
            message: "Anime list updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});



// Best IMDB first, tiebreak by lowest id
const BEST_SORT = { classificacao_imdb: -1, id: 1 };

//Very basic recommendation System endpoint
router.get("/:user_id/recommendations", async (req, res) => {
    try {
        const user_id = req.params.user_id;

        //Verify if its a valid ID
        if (!/^[1-9]\d*$/.test(user_id) || !Number.isSafeInteger(Number(user_id))) {
            return res.status(400).json({
                message: "Invalid ID, it must be a positive integer."
            });
        }

        //Find User
        const user = await db.collection("user").findOne({ id: Number(user_id) });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const avaliacoes = Array.isArray(user.avaliacoes) ? user.avaliacoes : [];
        const animes_vistos = Array.isArray(user.animes_vistos) ? user.animes_vistos : [];

        // Watched = animes_vistos + reviewed animes
        const watched = new Set([
            ...animes_vistos,
            ...avaliacoes.map(r => r.item_id)
        ]);
        const watchedIds = [...watched];

        let genre = null;

        //user has reviews -> check highest rated genre
        if (avaliacoes.length > 0) {
            genre = await getTopGenre(avaliacoes);
        }

        //no genre yet but has watch history -> check most watched genre
        if (genre === null && watched.size > 0) {
            genre = await getMostWatchedGenre(watchedIds);
        }

        //got a genre -> best unwatched anime from that genre
        if (genre !== null) {
            const fromGenre = await findBest({ genero: genre, id: { $nin: watchedIds } });

            if (fromGenre) {
                return res.status(200).json(fromGenre);
            }
        }

        //no genre or nothing left in it -> best unwatched anime overall
        const fallback = await findBest({ id: { $nin: watchedIds } });

        if (fallback) {
            return res.status(200).json(fallback);
        }

        return res.status(404).json({
            message: "No recommendation available."
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
})

// Best anime that matches the filter
async function findBest(filter) {
    const result = await db.collection("anime")
        .find(filter)
        .sort(BEST_SORT)
        .limit(1)
        .project({ _id: 0 })
        .toArray();

    return result[0] ?? null;
}

// genero can be a string or an array, always return an array
function toGenreList(genero) {
    if (Array.isArray(genero)) {
        return genero.filter(g => typeof g === "string" && g.trim() !== "");
    }
    if (typeof genero === "string" && genero.trim() !== "") {
        return [genero];
    }
    return [];
}

async function getTopGenre(avaliacoes) {
    // Remove duplicates: keep only the most recent review of each anime
    const latest = new Map();
    for (const review of avaliacoes) {
        if (!review || typeof review.nota !== "number") {
            continue;
        }
        const current = latest.get(review.item_id);
        if (!current || String(review.data ?? "") >= String(current.data ?? "")) {
            latest.set(review.item_id, review);
        }
    }

    if (latest.size === 0) {
        return null;
    }

    // Single query for all reviewed animes (unique ids)
    const animes = await db.collection("anime")
        .find({ id: { $in: [...latest.keys()] } })
        .project({ _id: 0, id: 1, genero: 1 })
        .toArray();

    const animeById = new Map(animes.map(a => [a.id, a]));

    // genre -> { sum, count }
    const genres = new Map();

    for (const review of latest.values()) {
        const anime = animeById.get(review.item_id);

        // Deleted anime: skip
        if (!anime) {
            continue;
        }

        // Anime without genre is skipped (empty list)
        for (const g of toGenreList(anime.genero)) {
            const entry = genres.get(g) ?? { sum: 0, count: 0 };
            entry.sum += review.nota;
            entry.count += 1;
            genres.set(g, entry);
        }
    }

    // Highest average (only avg > 2.5), tiebreak by highest count, then alphabetical
    let top = null;

    for (const [name, { sum, count }] of genres) {
        const avg = sum / count;

        if (avg <= 2.5) {
            continue;
        }

        if (
            top === null ||
            avg > top.avg ||
            (avg === top.avg && count > top.count) ||
            (avg === top.avg && count === top.count && name.localeCompare(top.name) < 0)
        ) {
            top = { name, avg, count };
        }
    }

    // No valid genres found -> null
    return top ? top.name : null;
}

async function getMostWatchedGenre(watchedIds) {
    // Single query for all watched animes
    const animes = await db.collection("anime")
        .find({ id: { $in: watchedIds } })
        .project({ _id: 0, id: 1, genero: 1 })
        .toArray();

    // genre -> count (deleted animes are not found)
    const counts = new Map();

    for (const anime of animes) {
        for (const g of toGenreList(anime.genero)) {
            counts.set(g, (counts.get(g) ?? 0) + 1);
        }
    }

    // Highest count, tiebreak alphabetical
    let top = null;

    for (const [name, count] of counts) {
        if (
            top === null ||
            count > top.count ||
            (count === top.count && name.localeCompare(top.name) < 0)
        ) {
            top = { name, count };
        }
    }

    // No valid genres found -> null
    return top ? top.name : null;
}
export default router;