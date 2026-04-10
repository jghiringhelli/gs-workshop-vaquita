import express from 'express';
import Database from 'better-sqlite3';
import { config } from './config';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { TandaRepository } from './repositories/tanda.repository';
import { TandaService } from './services/tanda.service';
import { ParticipantRepository } from './repositories/participant.repository';
import { ParticipantService } from './services/participant.service';
import { createUserRoutes } from './routes/user.routes';
import { createTandaRoutes } from './routes/tanda.routes';
import { createParticipantRoutes } from './routes/participant.routes';

const app = express();

// Middleware
app.use(express.json());

// Initialize database
const db = new Database(config.DATABASE_PATH);
const userRepository = new UserRepository(db);
userRepository.init();
const tandaRepository = new TandaRepository(db);
tandaRepository.init();
const participantRepository = new ParticipantRepository(db);
participantRepository.init();

// Initialize services
const userService = new UserService(userRepository);
const tandaService = new TandaService(tandaRepository);
const participantService = new ParticipantService(participantRepository, tandaRepository);

// Register routes
app.use('/api/users', createUserRoutes(userService));
app.use('/api/tandas', createTandaRoutes(tandaService));
app.use('/api/tandas/:id', createParticipantRoutes(participantService));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`🫰 Tanda API running on http://localhost:${PORT}`);
});

export default app;
