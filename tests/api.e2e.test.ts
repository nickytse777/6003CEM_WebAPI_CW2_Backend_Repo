import request from "supertest";
import app from "../src/server";
import { dataStore } from "../src/config/datastore";

describe("CineVault API", () => {
  let adminToken = "";
  let memberToken = "";
  let movieId = "";

  beforeAll(async () => {
    dataStore.clearMemory();
  });

  it("registers admin and member", async () => {
    const adminRes = await request(app.callback()).post("/auth/register").send({
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });
    const memberRes = await request(app.callback()).post("/auth/register").send({
      email: "member@example.com",
      password: "password123",
      role: "member",
    });
    expect(adminRes.status).toBe(201);
    expect(memberRes.status).toBe(201);
  });

  it("logs in and creates a movie as admin", async () => {
    const adminLogin = await request(app.callback()).post("/auth/login").send({
      email: "admin@example.com",
      password: "password123",
    });
    adminToken = adminLogin.body.data.accessToken;

    const memberLogin = await request(app.callback()).post("/auth/login").send({
      email: "member@example.com",
      password: "password123",
    });
    memberToken = memberLogin.body.data.accessToken;

    const createMovie = await request(app.callback())
      .post("/movies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Inception",
        genre: "Sci-Fi",
        year: 2010,
        rating: 8.8,
        description: "Dream layers",
        isLive: true,
      });
    expect(createMovie.status).toBe(201);
    movieId = createMovie.body.data.id;
  });

  it("allows public GET and blocks member from admin action", async () => {
    const listRes = await request(app.callback()).get("/movies");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);

    const memberCreate = await request(app.callback())
      .post("/movies")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ title: "Nope" });
    expect(memberCreate.status).toBe(403);
  });

  it("supports favourites and watchlist", async () => {
    const favRes = await request(app.callback())
      .post(`/favourites/${movieId}`)
      .set("Authorization", `Bearer ${memberToken}`);
    expect(favRes.status).toBe(201);

    const watchRes = await request(app.callback())
      .post(`/watchlist/${movieId}`)
      .set("Authorization", `Bearer ${memberToken}`);
    expect(watchRes.status).toBe(201);

    const watchedRes = await request(app.callback())
      .patch(`/watchlist/${movieId}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ status: "watched" });
    expect(watchedRes.status).toBe(200);
  });
});
