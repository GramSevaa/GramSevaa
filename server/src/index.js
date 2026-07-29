import "dotenv/config";
import { connectDb } from "./db.js";
import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "5000", 10) || 5000;

await connectDb();
const app = createApp();

app.listen(port, () => {
  process.stdout.write(`Server running on http://localhost:${port}\n`);
});

