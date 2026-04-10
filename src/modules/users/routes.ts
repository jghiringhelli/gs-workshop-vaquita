import { Router } from "express"
import { z } from "zod"
import { sendData } from "../../shared/http/http"
import { validateRequest } from "../../shared/validation/validate-request"
import type { UserService } from "./service"

const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const createUserBodySchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
})

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

/**
 * Create the users router.
 *
 * @param userService - User application service.
 * @returns Configured Express router.
 */
export function createUsersRouter(userService: UserService): Router {
  const router = Router()

  router.post(
    "/",
    validateRequest({ body: createUserBodySchema }),
    (request, response) => {
      const body = request.body as z.infer<typeof createUserBodySchema>
      const result = userService.createUser(body)
      sendData(response, 201, result)
    },
  )

  router.get(
    "/",
    validateRequest({ query: listUsersQuerySchema }),
    (request, response) => {
      const query = request.query as unknown as z.infer<typeof listUsersQuerySchema>
      const result = userService.listUsers(query)
      sendData(response, 200, result.items, {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      })
    },
  )

  router.get(
    "/:id",
    validateRequest({ params: userIdParamsSchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof userIdParamsSchema>
      const result = userService.getUser(params.id)
      sendData(response, 200, result)
    },
  )

  return router
}
