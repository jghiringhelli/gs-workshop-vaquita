import { requireJwtSecret, type AppConfig } from "../config/env";
import { NotFoundError } from "../errors/app-error";
import { UsersRepository } from "../repositories/users.repository";
import type { AuthenticatedUser, AuthTokenPayload } from "./auth.types";
import { signJwt, verifyJwt } from "./jwt";

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: AppConfig,
  ) {}

  issueTokenForUser(userId: number): { token: string } {
    const user = this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundError(`User ${userId} was not found`);
    }

    const now = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: now,
      exp: now + this.config.auth.jwtExpiresInHours * 60 * 60,
    };

    return {
      token: signJwt(payload, requireJwtSecret(this.config)),
    };
  }

  authenticateToken(token: string): AuthenticatedUser {
    const payload = verifyJwt(token, requireJwtSecret(this.config));
    const user = this.usersRepository.findById(payload.sub);

    if (!user) {
      throw new NotFoundError(`User ${payload.sub} was not found`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      token: payload,
    };
  }
}
