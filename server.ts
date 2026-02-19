import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";
import { logger } from "https://deno.land/x/hono@v4.0.0/middleware.ts";

const app = new Hono();
const kv = await Deno.openKv();

app.use("*", logger());

// API to submit art
app.post("/api/art", async (c) => {
  try {
    const body = await c.req.json();
    const { name, author, mapping } = body;

    if (!name || !author || !mapping) {
      return c.json({ message: "Missing required fields: name, author, or mapping" }, 400);
    }

    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Store in Deno KV using a composite key for better indexing later if needed
    await kv.set(["art", id], {
      id,
      name,
      author,
      mapping,
      createdAt: timestamp
    });

    console.log(`Stored art: ${name} by ${author} (${id})`);
    return c.json({ message: "Art submitted successfully!", id }, 201);
  } catch (error) {
    console.error("Failed to store art:", error);
    return c.json({ message: "Internal Server Error", error: error.message }, 500);
  }
});

// GET all art with pagination
app.get("/api/art", async (c) => {
  const limit = parseInt(c.req.query("limit") || "20");
  const cursor = c.req.query("cursor");

  const entries = kv.list({ prefix: ["art"] }, { limit, cursor, reverse: true });
  const arts = [];
  
  for await (const entry of entries) {
    arts.push(entry.value);
  }

  return c.json({
    data: arts,
    next_cursor: entries.cursor || null
  });
});

// Serve index.html
app.get("/", async (c) => {
  try {
    const html = await Deno.readTextFile("./index.html");
    return c.html(html);
  } catch (e) {
    return c.text("index.html not found", 404);
  }
});

// Serve parse.html
app.get("/parse", async (c) => {
  try {
    const html = await Deno.readTextFile("./parse.html");
    return c.html(html);
  } catch (e) {
    return c.text("parse.html not found", 404);
  }
});

Deno.serve(app.fetch);
