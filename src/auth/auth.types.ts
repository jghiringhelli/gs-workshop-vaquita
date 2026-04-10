export interface AuthTokenPayload {
  sub: number;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  token: AuthTokenPayload;
}
