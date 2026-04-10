import jwt from "jsonwebtoken";

import type { AppConfig } from "../config/env";
import {
  ConfigurationError,
  UnauthorizedError,
  ValidationError,
} from "../errors/app-error";
import { UserRepository } from "../repositories/user-repository";

interface AuthTokenPayload {
  sub: string;
  userId: number;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly config: AppConfig
  ) {}

  issueToken(userId: number): string {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new ValidationError("Cannot issue token for unknown user");
    }

    const secret = this.config.jwtSecret;

    if (!secret) {
      throw new ConfigurationError("JWT_SECRET must be configured");
    }

    return jwt.sign({ sub: String(user.id), userId: user.id }, secret, {
      expiresIn: "1h",
    });
  }

  verifyToken(token: string): number {
    const secret = this.config.jwtSecret;

    if (!secret) {
      throw new ConfigurationError("JWT_SECRET must be configured");
    }

    try {
      const payload = jwt.verify(token, secret) as AuthTokenPayload;

      if (!payload.userId || payload.userId <= 0) {
        throw new UnauthorizedError("Invalid token payload");
      }

      return payload.userId;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }
}
