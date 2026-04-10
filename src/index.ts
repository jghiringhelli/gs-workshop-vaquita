// Tanda API — Entry point
import express from 'express';
import 'dotenv/config';

// Import infrastructure
import '../src/db.js'; // Initialize database

// Import repositories
import {
  UserRepository,
  TandaRepository,
  ParticipantRepository,
  ContributionRepository
} from './repositories/index.js';

// Import services
import {
  UserService,
  TandaService,
  ContributionService
} from './services/index.js';

// Import routes
import {
  createUserRoutes,
  createTandaRoutes,
  createContributionRoutes
} from './routes/index.js';

// Create repositories
const userRepository = new UserRepository();
const tandaRepository = new TandaRepository();
const participantRepository = new ParticipantRepository();
const contributionRepository = new ContributionRepository();

// Create services
const userService = new UserService(userRepository);
const tandaService = new TandaService(tandaRepository, participantRepository, userRepository);
const contributionService = new ContributionService(contributionRepository, participantRepository, tandaRepository);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/users', createUserRoutes(userService));
app.use('/api/tandas', createTandaRoutes(tandaService));
app.use('/api', createContributionRoutes(contributionService));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
