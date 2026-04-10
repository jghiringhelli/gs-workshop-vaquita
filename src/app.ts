import express, { Request, Response, NextFunction } from 'express';
import { AppError } from './errors/AppError';
import { UserService } from './modules/users/UserService';
import { TandaService } from './modules/tandas/TandaService';
import { userRoutes } from './modules/users/userRoutes';
import { tandaRoutes } from './modules/tandas/tandaRoutes';

export interface AppDependencies {
  userService: UserService;
  tandaService: TandaService;
}

export function createApp(deps: AppDependencies): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', version: '1.0.0' }));

  app.use('/api/users', userRoutes(deps.userService));
  app.use('/api/tandas', tandaRoutes(deps.tandaService));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
    }
    console.error(err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  });

  return app;
}
