import { prisma } from '../lib/prisma'
import { hashPassword, comparePassword, generateToken } from '../lib/auth'
import { RegisterInput, LoginInput } from '../schemas/user'

export class UserService {
  async register(input: RegisterInput): Promise<{ id: string; email: string; name: string; token: string }> {
    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
      },
    })

    // Generate token
    const token = generateToken(user.id)

    // Return user data without password hash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    }
  }

  async login(input: LoginInput): Promise<{ id: string; email: string; name: string; token: string }> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const isPasswordValid = await comparePassword(input.password, user.password)

    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Generate token
    const token = generateToken(user.id)

    // Return user data without password hash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    }
  }

  async getUserById(id: string): Promise<{ id: string; email: string; name: string } | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    return user
  }
}

export const userService = new UserService()
