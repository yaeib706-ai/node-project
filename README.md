# API Documentation

Base URL: `http://localhost:5000`

## Authentication

- Protected routes require `Authorization: Bearer <token>`.
- Token is returned from `POST /api/users/login`.

## API Endpoints

| Method | Endpoint | Auth Required | Params / Query | Description |
| --- | --- | --- | --- | --- |
| POST | `/api/users/signup` | No | Body: `name`, `email`, `password`, `address`, `role?` | Create a new user account. |
| POST | `/api/users/login` | No | Body: `email`, `password` | Authenticate user and return JWT token. |
| GET | `/api/users` | Yes (`admin`/`manager`) | None | Get all users (without passwords). |
| PUT | `/api/users/password/:id` | Yes (self or `admin`/`manager`) | Path: `id`, Body: `password` | Update user password. |
| DELETE | `/api/users/:id` | Yes (self or `admin`/`manager`) | Path: `id` | Delete a user account. |
| GET | `/api/recipes` | No (public route) | Query: `page?`, `limit?`, `search?` | List recipes with pagination and optional search. |
| GET | `/api/recipes/time/:minutes` | No | Path: `minutes` | Get public recipes with prep time <= minutes. |
| GET | `/api/recipes/user/:userId` | No | Path: `userId` | Get recipes by user ID. |
| GET | `/api/recipes/:id` | No | Path: `id` | Get a recipe by ID (access depends on visibility). |
| POST | `/api/recipes` | Yes | Body: `name`, `description`, `category`, `userId`, `timeToPrepare`, `levelOfDifficulty`, `layers[]`, `preparationInstructions[]`, `image`, `privacy` | Create a new recipe. |
| PUT | `/api/recipes/:id` | Yes | Path: `id`, Body: one or more updatable fields | Update an existing recipe. |
| DELETE | `/api/recipes/:id` | Yes | Path: `id` | Delete a recipe by ID. |
| GET | `/api/categories` | No | None | Get all categories. |
| GET | `/api/categories/:id` | No | Path: `id` | Get category details by ID. |
| POST | `/api/categories` | Yes (`admin`) | Body: `name`, `description` | Create a new category. |

## Common Response Codes

- `200` OK
- `201` Created
- `400` Validation/Bad request
- `401` Unauthorized
- `403` Forbidden
- `404` Not found
- `409` Conflict (email already exists)
- `500` Server error
