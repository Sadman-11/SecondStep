// Vercel serverless entry: serves the existing Express API from functions/index.js.
// vercel.json rewrites every /api/* request here; Express routes on the original path.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { app } = require("../functions/index.js");

export default app;
