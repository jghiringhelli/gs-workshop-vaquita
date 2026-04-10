import { Router, type Router as ExpressRouter } from "express";

import type { TandasService } from "./tandas.service";

/**
 * Creates the tanda router.
 * @param _tandasService Service dependency for tanda use cases.
 * @returns Express router ready for endpoint implementation.
 */
export function createTandasRouter(_tandasService: TandasService): ExpressRouter {
  return Router();
}