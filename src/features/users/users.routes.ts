import { Router, type RequestHandler, type Router as ExpressRouter } from "express";

import type { UsersService } from "./users.service";
import {
  createUserBodySchema,
  listUsersQuerySchema,
  userIdParamsSchema,
} from "./users.schemas";

/**
 * Creates the users router.
 * @param usersService Service dependency for user use cases.
 * @returns Express router ready for endpoint implementation.
 */
export function createUsersRouter(usersService: UsersService): ExpressRouter {
  const router = Router();

  router.post("/", createUserHandler(usersService));
  router.get("/", listUsersHandler(usersService));
  router.get("/:id", getUserByIdHandler(usersService));

  return router;
}

function createUserHandler(usersService: UsersService): RequestHandler {
  return (request, response, next): void => {
    try {
      const input = createUserBodySchema.parse(request.body);
      const user = usersService.createUser(input);
      response.status(201).json(user);
    } catch (error) {
      next(error);
    }
  };
}

function listUsersHandler(usersService: UsersService): RequestHandler {
  return (request, response, next): void => {
    try {
      listUsersQuerySchema.parse(request.query);
      const users = usersService.listUsers();
      response.status(200).json(users);
    } catch (error) {
      next(error);
    }
  };
}

function getUserByIdHandler(usersService: UsersService): RequestHandler {
  return (request, response, next): void => {
    try {
      const params = userIdParamsSchema.parse(request.params);
      const user = usersService.getUserById(params.id);
      response.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };
}