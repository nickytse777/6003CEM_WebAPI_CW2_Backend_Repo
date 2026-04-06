import Router from "@koa/router";
import { z } from "zod";
import { dataStore } from "../config/datastore";
import { authenticate, authorize } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import type { MovieModel } from "../types/models";

const movieBodySchema = z.object({
  title: z.string().min(1),
  genre: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  rating: z.number().min(0).max(10),
  description: z.string().min(1),
  isLive: z.boolean().default(true),
});

export const moviesRouter = new Router({ prefix: "/movies" });

moviesRouter.get("/", async (ctx) => {
  const all = await dataStore.getAll<MovieModel>("movies");
  const title = String(ctx.query.title ?? "").toLowerCase();
  const genre = String(ctx.query.genre ?? "").toLowerCase();
  const year = Number(ctx.query.year ?? 0);
  const minRating = Number(ctx.query.minRating ?? 0);

  let items = Object.values(all).filter((m) => m.isLive);
  if (title) items = items.filter((m) => m.title.toLowerCase().includes(title));
  if (genre) items = items.filter((m) => m.genre.toLowerCase() === genre);
  if (year) items = items.filter((m) => m.year === year);
  if (minRating) items = items.filter((m) => m.rating >= minRating);
  items = items.sort((a, b) => b.rating - a.rating);

  ctx.body = { success: true, data: items };
});

moviesRouter.get("/:id", async (ctx) => {
  const movie = await dataStore.getOne<MovieModel>("movies", ctx.params.id);
  if (!movie || !movie.isLive) {
    ctx.status = 404;
    ctx.body = { success: false, message: "Movie not found" };
    return;
  }
  ctx.body = { success: true, data: movie };
});

moviesRouter.post("/", authenticate, authorize("admin"), validateBody(movieBodySchema), async (ctx) => {
  const input = ctx.request.body as z.infer<typeof movieBodySchema>;
  const now = new Date().toISOString();
  const id = dataStore.newId();
  const movie: MovieModel = {
    id,
    ...input,
    createdBy: ctx.state.user!.id,
    createdAt: now,
    updatedAt: now,
  };
  await dataStore.setOne("movies", id, movie);
  ctx.status = 201;
  ctx.body = { success: true, data: movie };
});

moviesRouter.patch("/:id", authenticate, authorize("admin"), validateBody(movieBodySchema.partial()), async (ctx) => {
  const existing = await dataStore.getOne<MovieModel>("movies", ctx.params.id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { success: false, message: "Movie not found" };
    return;
  }
  const next = { ...(ctx.request.body as Record<string, unknown>), updatedAt: new Date().toISOString() };
  await dataStore.updateOne("movies", ctx.params.id, next);
  const updated = await dataStore.getOne<MovieModel>("movies", ctx.params.id);
  ctx.body = { success: true, data: updated };
});

moviesRouter.delete("/:id", authenticate, authorize("admin"), async (ctx) => {
  const existing = await dataStore.getOne<MovieModel>("movies", ctx.params.id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { success: false, message: "Movie not found" };
    return;
  }
  await dataStore.deleteOne("movies", ctx.params.id);
  ctx.body = { success: true, message: "Movie deleted" };
});
