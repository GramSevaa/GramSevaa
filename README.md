# GramSevaa

## Admin User Management Dashboard (MVP)

### Setup

1. Install dependencies

```bash
npm install
```

2. Configure server env

- Copy [server/.env.example](file:///c:/Users/gauta_wcehquk/OneDrive/Desktop/GramSeva/server/.env.example) to `server/.env`
- Set `JWT_SECRET`
- Ensure `MONGODB_URI` points to your MongoDB instance

3. Seed an admin user

```bash
npm run seed:admin
```

4. Start both client + server

```bash
npm run dev
```

### URLs

- Client: http://localhost:5173
- Server health: http://localhost:5000/api/health
- Admin dashboard: http://localhost:5173/admin/users
