import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { UnauthorizedError } from "../../lib/errors";
import type { AuditLogger } from "../../lib/audit-log";
import type { UserRepository } from "../users";
import type {
  AuthenticatedUser,
  AuthTokenPayload,
  AuthTokenResponse,
  IssueTokenInput,
} from "./auth.types";

export interface AuthService {
  issueToken(input: IssueTokenInput): AuthTokenResponse;
  verifyAccessToken(token: string): AuthenticatedUser;
}

export interface AuthServiceConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
}

export class JwtAuthService implements AuthService {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: AuditLogger,
    private readonly config: AuthServiceConfig,
  ) {}

  /**
   * Issues a JWT for an existing user.
   * @param input Token request payload.
   * @returns Signed bearer token and user projection.
   */
  public issueToken(input: IssueTokenInput): AuthTokenResponse {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedError("Invalid authentication request.", {
        details: { email: normalizedEmail },
      });
    }

    const accessToken = jwt.sign(
      {
        email: user.email,
      },
      this.config.jwtSecret,
      {
        subject: String(user.id),
        expiresIn: this.config.jwtExpiresIn as SignOptions["expiresIn"],
      } satisfies SignOptions,
    );

    this.auditLogger.record({
      actorUserId: user.id,
      action: "auth.token_issued",
      resourceType: "user",
      resourceId: user.id,
      details: { email: user.email },
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: this.config.jwtExpiresIn,
      user,
    };
  }

  /**
   * Verifies a JWT and returns the authenticated user context.
   * @param token Encoded bearer token.
   * @returns Authenticated user identity.
   */
  public verifyAccessToken(token: string): AuthenticatedUser {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as AuthTokenPayload;
      const userId = Number(payload.sub);

      if (!Number.isInteger(userId) || userId <= 0) {
        throw new UnauthorizedError("Authentication token payload is invalid.");
      }

      const user = this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedError("Authenticated user no longer exists.", {
          details: { userId },
        });
      }

      return {
        id: user.id,
        email: user.email,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
        throw new UnauthorizedError("Authentication token is invalid or expired.");
      }

      throw error;
    }
  }
}