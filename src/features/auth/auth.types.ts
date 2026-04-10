import type { User } from "../users";

export interface AuthenticatedUser {
  readonly id: number;
  readonly email: string;
}

export interface IssueTokenInput {
  readonly email: string;
}

export interface AuthTokenResponse {
  readonly accessToken: string;
  readonly tokenType: "Bearer";
  readonly expiresIn: string;
  readonly user: User;
}

export interface AuthTokenPayload {
  readonly sub: string;
  readonly email: string;
}