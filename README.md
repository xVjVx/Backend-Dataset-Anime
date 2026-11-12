# Anime Dataset API

A RESTful backend API developed with **Node.js, Express.js and MongoDB**, designed to manage an anime dataset and its associated users, reviews and viewing history.

This project was developed as part of an **academic project**, with the purpose of applying practical knowledge of backend development, REST API design, database management and data manipulation using MongoDB.

## Features

### Anime Management
- Retrieve the anime dataset with pagination.
- Add one or multiple anime entries.
- Update existing anime information.
- Delete anime entries.
- Retrieve anime by release year.
- Filter anime by genre and episode count.
- Retrieve anime ranked by IMDb score.
- Convert IMDb ratings into a 5-star rating system.
- Calculate average user ratings and total reviews for each anime.
- Retrieve the highest-rated anime.
- Sort anime by the number of user reviews.

### User Management
- Retrieve all registered users with pagination.
- Register one or multiple users.
- Automatically generate unique sequential user IDs.
- Validate user information, including email addresses.
- Retrieve individual user profiles.
- Update user information.
- Delete users.
- Prevent duplicate email addresses.

### Reviews and Ratings
- Allow users to review anime.
- Associate reviews with specific users and anime.
- Validate ratings (1–5) and review comments.
- Calculate average anime ratings based on user reviews.
- Retrieve a user's top 3 highest-rated anime.
- Handle deleted anime when processing user reviews.

### Watch History and Recommendations
- Maintain a list of anime watched by each user.
- Prevent duplicate entries in watch history.
- Generate personalized anime recommendations based on user preferences.
- Prioritize genres with the highest average user ratings.
- Use watch history to determine preferred genres when no reviews are available.
- Recommend the highest-rated unwatched anime as a fallback.

### Additional Analytics
- Identify the highest-rated anime in each Portuguese district based on user reviews.
- Calculate average ratings per district.
- Consider only the most recent review from each user for each anime.

## Technologies

- **Node.js** – JavaScript runtime environment.
- **Express.js** – Backend framework for building REST APIs.
- **MongoDB** – NoSQL database for storing anime and user information.
- **MongoDB Node.js Driver** – Database connectivity and operations.
- **dotenv** – Environment variable management.
- **Nodemon** – Development utility for automatically restarting the server.

## Project Structure

```text
Backend-Dataset-Anime/
│
├── src/
│   ├── app.js
│   │
│   ├── db/
│   │   └── config.js
│   │
│   └── routes/
│       ├── anime.js
│       └── user.js
│
├── .env
├── .gitignore
├── package.json
└── package-lock.json
```

## API Endpoints

All endpoints return JSON responses.

### Anime — `/anime`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/anime` | Retrieve all anime entries (paginated). |
| POST | `/anime` | Create one or multiple anime entries. |
| GET | `/anime/:year` | Retrieve anime released in a specific year. |
| GET | `/anime/score/:anime_id` | Retrieve an anime with its average user rating and review count. |
| PUT | `/anime/:anime_id` | Update an anime entry. |
| DELETE | `/anime/:anime_id` | Delete an anime entry. |
| GET | `/anime/top/:limit` | Retrieve the highest-rated anime. |
| GET | `/anime/ratings/:order` | Sort anime by number of reviews (`asc` or `desc`). |
| GET | `/anime/star` | Retrieve anime with a 5-star rating representation. |
| GET | `/anime/filter` | Filter anime by genre and episode count. |
| GET | `/anime/district` | Retrieve the highest-rated anime for each Portuguese district. |

### Users — `/users`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | Retrieve all users (paginated). |
| POST | `/users` | Register one or multiple users. |
| GET | `/users/:user_id` | Retrieve a user profile and their top 3 reviewed anime. |
| PUT | `/users/:id` | Update user information. |
| DELETE | `/users/:user_id` | Delete a user. |
| POST | `/users/:id/review/:dataset_id` | Submit an anime review. |
| POST | `/users/:user_id/watched_anime` | Add anime to a user's watch history. |
| GET | `/users/:user_id/recommendations` | Generate personalized anime recommendations. |

### Pagination and Filtering

Several endpoints support pagination through query parameters.

Example:

```http
GET /anime?page=1&perPage=20
```

The filtering endpoint supports the following parameters:

```http
GET /anime/filter?genero=Action&minEpisodios=12&maxEpisodios=24&page=1&perPage=20
```

The anime ranking endpoint accepts:

```http
GET /anime/ratings/desc
GET /anime/ratings/asc
```

## Database Structure

The application uses MongoDB with two main collections:

- **anime** – Stores anime information, including title, genre, release year, studio, episode count, IMDb rating, original language and popularity.
- **user** – Stores user information, registration details, reviews and watched anime.

## Installation and Setup

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/xVjVx/Backend-Dataset-Anime.git
cd Backend-Dataset-Anime
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root directory:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
DB_NAME=your_database_name
```

Replace the MongoDB connection string and database name with your own configuration.

**Important:** Never commit your `.env` file or expose database credentials.

### 4. Start the application

Run the backend directly:

```bash
node src/app.js
```

For development with automatic restarts:

```bash
npx nodemon src/app.js
```

Once running, the API will be available at:

```text
http://localhost:3000
```

## Academic Context

This project was developed for educational purposes as part of a university course.

Its main objective was to explore backend development through the implementation of a RESTful API, integrating Node.js, Express.js and MongoDB.

Throughout the project, particular attention was given to CRUD operations, data validation, database aggregation pipelines, pagination, user-generated content and basic recommendation algorithms.

---
