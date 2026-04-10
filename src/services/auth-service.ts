import jwt from "jsonwebtoken";
import { ConfigurationError, UnauthorizedError, ValidationError } from "../errors/app-error";
import type { AppConfig } from "../config/env";
import type { UserRepository } from "../repositories/user-repository";

interface TokenPayload {
  sub: string;
  userId: number;
}

/**
 * Service for issuing and verifying JWT tokens.
 * Secret comes from environment config — never hardcoded.
 */
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly config: AppConfig,
  ) {}

  /**
   * Issues a signed JWT for an existing user.
   * @param userId - must correspond to an existing user
   * @returns signed JWT string
   */
  issueToken(userId: number): string {
    const user = this.userRepository.findById(userId);
    if (!user) throw new ValidationError("Cannot issue token for unknown user");

    const secret = this.config.jwtSecret;
    if (!secret) throw new ConfigurationError("JWT_SECRET must be configured");

    return jwt.sign({ sub: String(user.id), userId: user.id }, secret, { expiresIn: "1h" });
  }

  /**
   * Verifies a JWT and returns the userId embedded in it.
   * @param token - raw JWT string
   * @returns userId
   */
  verifyToken(token: string): number {
    const secret = this.config.jwtSecret;
    if (!secret) throw new ConfigurationError("JWT_SECRET must be configured");

    try {
      const payload = jwt.verify(token, secret) as TokenPayload;
      if (!payload.userId || payload.userId <= 0) throw new UnauthorizedError("Invalid token payload");
      return payload.userId;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }
}
