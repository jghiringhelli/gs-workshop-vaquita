import { Router } from "express"
import { z } from "zod"
import { getAuthenticatedUserId, sendData } from "../../shared/http/http"
import { validateRequest } from "../../shared/validation/validate-request"
import type { TandaService } from "./service"

const tandaIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const roundParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
})

const participantHistoryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
})

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

const listTandasQuerySchema = paginationQuerySchema.extend({
  userId: z.coerce.number().int().positive().optional(),
})

const createTandaBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  organizerId: z.coerce.number().int().positive(),
  contributionAmount: z.coerce.number().positive(),
  currencyCode: z.string().trim().length(3).optional(),
})

const joinTandaBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
})

const organizerBodySchema = z.object({
  organizerId: z.coerce.number().int().positive(),
})

const recordContributionBodySchema = z.object({
  participantId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
})

/**
 * Create the tanda router.
 *
 * @param tandaService - Tanda application service.
 * @returns Configured Express router.
 */
export function createTandasRouter(tandaService: TandaService): Router {
  const router = Router()

  router.post(
    "/",
    validateRequest({ body: createTandaBodySchema }),
    (request, response) => {
      const body = request.body as z.infer<typeof createTandaBodySchema>
      const result = tandaService.createTanda({
        ...body,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 201, result)
    },
  )

  router.get(
    "/",
    validateRequest({ query: listTandasQuerySchema }),
    (request, response) => {
      const query = request.query as unknown as z.infer<typeof listTandasQuerySchema>
      const result = tandaService.listTandas({
        ...query,
        userId: query.userId ?? getAuthenticatedUserId(request) ?? undefined,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 200, result.items, {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      })
    },
  )

  router.get(
    "/:id",
    validateRequest({ params: tandaIdParamsSchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof tandaIdParamsSchema>
      const result = tandaService.getTanda(params.id)
      sendData(response, 200, result)
    },
  )

  router.post(
    "/:id/join",
    validateRequest({ params: tandaIdParamsSchema, body: joinTandaBodySchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof tandaIdParamsSchema>
      const body = request.body as z.infer<typeof joinTandaBodySchema>
      const result = tandaService.joinTanda({
        tandaId: params.id,
        userId: body.userId,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 200, result)
    },
  )

  router.post(
    "/:id/start",
    validateRequest({ params: tandaIdParamsSchema, body: organizerBodySchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof tandaIdParamsSchema>
      const body = request.body as z.infer<typeof organizerBodySchema>
      const result = tandaService.startTanda({
        tandaId: params.id,
        organizerId: body.organizerId,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 200, result)
    },
  )

  router.post(
    "/:id/cancel",
    validateRequest({ params: tandaIdParamsSchema, body: organizerBodySchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof tandaIdParamsSchema>
      const body = request.body as z.infer<typeof organizerBodySchema>
      const result = tandaService.cancelTanda({
        tandaId: params.id,
        organizerId: body.organizerId,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 200, result)
    },
  )

  router.get(
    "/:id/participants",
    validateRequest({ params: tandaIdParamsSchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof tandaIdParamsSchema>
      const result = tandaService.listParticipants(params.id)
      sendData(response, 200, result)
    },
  )

  router.post(
    "/:id/contributions",
    validateRequest({
      params: tandaIdParamsSchema,
      body: recordContributionBodySchema,
    }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof tandaIdParamsSchema>
      const body = request.body as z.infer<typeof recordContributionBodySchema>
      const result = tandaService.recordContribution({
        tandaId: params.id,
        participantId: body.participantId,
        amount: body.amount,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 201, result)
    },
  )

  router.get(
    "/:id/rounds/:round",
    validateRequest({ params: roundParamsSchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof roundParamsSchema>
      const result = tandaService.getRoundSummary(params.id, params.round)

      sendData(response, 200, result)
    },
  )

  router.post(
    "/:id/advance",
    validateRequest({ params: tandaIdParamsSchema, body: organizerBodySchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof tandaIdParamsSchema>
      const body = request.body as z.infer<typeof organizerBodySchema>
      const result = tandaService.advanceRound({
        tandaId: params.id,
        organizerId: body.organizerId,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 200, result)
    },
  )

  router.get(
    "/:id/participants/:pid/history",
    validateRequest({ params: participantHistoryParamsSchema }),
    (request, response) => {
      const params = request.params as unknown as z.infer<typeof participantHistoryParamsSchema>
      const result = tandaService.getParticipantHistory({
        tandaId: params.id,
        participantId: params.pid,
        requestedByUserId: getAuthenticatedUserId(request),
      })

      sendData(response, 200, result)
    },
  )

  return router
}
