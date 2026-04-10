import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/user.service';
import { TandaRepository } from '../repositories/tanda.repository';
import { TandaService } from '../services/tanda.service';
import { ParticipantRepository } from '../repositories/participant.repository';
import { ParticipantService } from '../services/participant.service';
import { createUserRoutes } from '../routes/user.routes';
import { createTandaRoutes } from '../routes/tanda.routes';
import { createParticipantRoutes } from '../routes/participant.routes';
import { v4 as uuidv4 } from 'uuid';

describe('Participant Endpoints', () => {
  let app: any;
  let db: Database.Database;
  let userRepository: UserRepository;
  let tandaRepository: TandaRepository;
  let participantRepository: ParticipantRepository;
  let userService: UserService;
  let tandaService: TandaService;
  let participantService: ParticipantService;
  let userId: string;
  let tandaId: string;

  beforeEach(() => {
    // Create in-memory database for tests
    db = new Database(':memory:');
    userRepository = new UserRepository(db);
    userRepository.init();
    tandaRepository = new TandaRepository(db);
    tandaRepository.init();
    participantRepository = new ParticipantRepository(db);
    participantRepository.init();

    userService = new UserService(userRepository);
    tandaService = new TandaService(tandaRepository);
    participantService = new ParticipantService(participantRepository, tandaRepository);

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/users', createUserRoutes(userService));
    app.use('/api/tandas', createTandaRoutes(tandaService));
    app.use('/api/tandas/:id', createParticipantRoutes(participantService));

    // Seed: create a user and a tanda
    const user = userService.createUser({ email: 'organizer@example.com', name: 'Organizer' });
    userId = user.id;
    const tanda = tandaService.createTanda({
      name: 'Test Tanda',
      organizerId: userId,
      contributionAmount: 1000,
      totalRounds: 5,
    });
    tandaId = tanda.id;
  });

  describe('POST /api/tandas/:id/join', () => {
    it('should allow a user to join a tanda', async () => {
      const joiningUser = userService.createUser({ email: 'member@example.com', name: 'Member' });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: joiningUser.id });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(joiningUser.id);
      expect(response.body.tandaId).toBe(tandaId);
      expect(response.body.role).toBe('member');
    });

    it('should return 400 for missing userId', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 when user already joined', async () => {
      const joiningUser = userService.createUser({ email: 'member2@example.com', name: 'Member 2' });

      // First join
      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: joiningUser.id });

      // Second join (should fail)
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: joiningUser.id });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already a participant');
    });

    it('should return 404 when tanda not found', async () => {
      const joiningUser = userService.createUser({ email: 'member3@example.com', name: 'Member 3' });
      const fakeId = uuidv4();

      const response = await request(app)
        .post(`/api/tandas/${fakeId}/join`)
        .send({ userId: joiningUser.id });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 when tanda is not in forming status', async () => {
      // Change tanda status to active
      const activeTanda = tandaService.getTandaById(tandaId);
      if (activeTanda) {
        const stmt = db.prepare('UPDATE tandas SET status = ? WHERE id = ?');
        stmt.run('active', tandaId);
      }

      const joiningUser = userService.createUser({ email: 'member4@example.com', name: 'Member 4' });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: joiningUser.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not in forming status');
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('should return empty participants list initially', async () => {
      const response = await request(app).get(`/api/tandas/${tandaId}/participants`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all participants after joins', async () => {
      const member1 = userService.createUser({ email: 'member5@example.com', name: 'Member 5' });
      const member2 = userService.createUser({ email: 'member6@example.com', name: 'Member 6' });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: member1.id });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: member2.id });

      const response = await request(app).get(`/api/tandas/${tandaId}/participants`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].userId).toBe(member1.id);
      expect(response.body[1].userId).toBe(member2.id);
    });
  });
});
