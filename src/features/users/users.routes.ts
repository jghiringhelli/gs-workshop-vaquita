import { Router, type Router as ExpressRouter } from "express";

import type { UsersService } from "./users.service";

/**
 * Creates the users router.
 * @param _usersService Service dependency for user use cases.
 * @returns Express router ready for endpoint implementation.
 */
export function createUsersRouter(_usersService: UsersService): ExpressRouter {
  return Router();
}