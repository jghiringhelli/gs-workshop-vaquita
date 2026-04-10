import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ConflictError, UnauthorizedError } from "../errors/AppError";
import { userRepository, type SafeUser } from "./user.repository";

const BCRYPT_ROUNDS = 12;

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResult = {
  token: string;
  user: SafeUser;
};

export const userService = {
  async register(input: RegisterInput): Promise<SafeUser> {
    const { email, username, password } = input;

    const [existingEmail, existingUsername] = await Promise.all([
      userRepository.findByEmail(email),
      userRepository.findByUsername(username),
    ]);

    if (existingEmail) throw new ConflictError("Email is already registered");
    if (existingUsername) throw new ConflictError("Username is already taken");

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return userRepository.create({ email, username, passwordHash });
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    const user = await userRepository.findByEmailWithHash(email);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      env.jwtSecret,
      { expiresIn: "7d" },
    );

    const { passwordHash: _ph, ...safeUser } = user;
    return { token, user: safeUser };
  },
};
