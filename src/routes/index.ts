import { Router } from "express";

import { systemRouter } from "../modules/system/system.routes";
import { tandasRouter } from "../modules/tandas/tandas.routes";
import { usersRouter } from "../modules/users/users.routes";

export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use(tandasRouter);
apiRouter.use(usersRouter);