import type { Express } from "express";
import request from "supertest";

export interface AuthenticatedTestUser {
  user: {
    id: number;
    email: string;
    name: string;
  };
  token: string;
}

export async function createAuthenticatedUser(
  app: Express,
  input: { email: string; name: string },
): Promise<AuthenticatedTestUser> {
  const userResponse = await request(app).post("/api/users").send(input);
  const tokenResponse = await request(app).post("/api/auth/token").send({
    userId: userResponse.body.id,
  });

  return {
    user: userResponse.body,
    token: tokenResponse.body.token,
  };
}
