# regretsBackend

Express + MongoDB backend for `frontend_regrets`.

## API coverage implemented

- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /sanctum/csrf-cookie`
- `POST /api/logout`
- `GET /api/categories`
- `GET /api/questions`
- `GET /api/questions/category/:categoryId`
- `GET /api/questions/:id`
- `POST /api/question`
- `POST /api/questions/:id/like`
- `GET /api/comments/:questionId`
- `POST /api/comment`
- `POST /api/savepost`
- `POST /api/myprofile`

## 1) Install and run

```bash
cd regretsBackend
npm install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Then start:

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

## 2) Database connection (your backend DB)

You have 3 options:

### Option A: MongoDB Atlas (recommended)

Set in `.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
USE_IN_MEMORY=false
```

Steps:
1. Create an Atlas cluster.
2. Create DB user (username/password).
3. In Network Access, allow your IP.
4. Copy connection string and put it in `MONGO_URI`.

### Option B: Local MongoDB

Run local MongoDB on default port and set:

```env
MONGO_URI=mongodb://127.0.0.1:27017/regretsdb
USE_IN_MEMORY=false
```

### Option C: In-memory MongoDB (quick dev only)

If `MONGO_URI` is empty or:

```env
USE_IN_MEMORY=true
```

the backend starts an ephemeral in-memory MongoDB. Data is lost on restart.

## 3) Required env vars

```env
PORT=3000
MONGO_URI=...
USE_IN_MEMORY=false
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

`FRONTEND_URL` is used by `/auth/google` callback redirect.  
`CORS_ORIGIN` controls allowed frontend origin(s), comma-separated if needed.
`GOOGLE_*` is required for real Google login.

## 3.1) Google OAuth setup (real login)

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
2. Add Authorized redirect URI:
`http://localhost:3000/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend `.env`.
4. Restart backend and use frontend login button (`/auth/google`).

## 4) Connect frontend to this backend

Your frontend currently calls `https://stagingcrm.goldensupplementstore.com`.
Switch those URLs to your local backend base:

`http://localhost:3000`

So API base becomes:

`http://localhost:3000/api`

And login URL becomes:

`http://localhost:3000/auth/google`
