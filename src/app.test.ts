import request from "supertest";

import { createApp, createApplicationContext, disposeApplicationContext } from "./app";
import { loadConfig } from "./config/env";

describe("createApp", () => {
  it("returns a healthy response", async () => {
    const context = createApplicationContext(
      loadConfig({
        ...process.env,
        DATABASE_PATH: ":memory:",
        NODE_ENV: "test",
      }),
    );

    const app = createApp(context);
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok" });

    disposeApplicationContext(context);
  });
});