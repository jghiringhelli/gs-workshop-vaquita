/**
 * Seed script — creates sample data for manual testing
 * Usage: npx tsx scripts/seed.ts
 */
import { createDatabase } from '../src/db/database';
import { createUsersRepository } from '../src/repositories/users.repository';
import { createTandasRepository } from '../src/repositories/tandas.repository';
import { createParticipantsRepository } from '../src/repositories/participants.repository';
import { createContributionsRepository } from '../src/repositories/contributions.repository';
import { createUsersService } from '../src/services/users.service';
import { createTandasService } from '../src/services/tandas.service';
import { createContributionsService } from '../src/services/contributions.service';

const db = createDatabase();

const usersRepo = createUsersRepository(db);
const tandasRepo = createTandasRepository(db);
const participantsRepo = createParticipantsRepository(db);
const contributionsRepo = createContributionsRepository(db);

const usersService = createUsersService(usersRepo);
const tandasService = createTandasService(tandasRepo, participantsRepo, usersRepo);
const contributionsService = createContributionsService(tandasRepo, participantsRepo, contributionsRepo);

console.log('🌱 Seeding database...\n');

// --- Users ---
const alice  = usersService.createUser({ email: 'alice@example.com',  name: 'Alice'  });
const bob    = usersService.createUser({ email: 'bob@example.com',    name: 'Bob'    });
const carlos = usersService.createUser({ email: 'carlos@example.com', name: 'Carlos' });
const diana  = usersService.createUser({ email: 'diana@example.com',  name: 'Diana'  });

console.log('Users created:', [alice, bob, carlos, diana].map(u => `${u.id}:${u.name}`).join(', '));

// --- Tanda 1: Forming (only organizer) ---
const tanda1 = tandasService.createTanda({
  name: 'Tanda Enero',
  organizerId: alice.id,
  contributionAmount: 1000,
});
console.log(`\nTanda "${tanda1.name}" created (status: ${tanda1.status}, id: ${tanda1.id})`);

// --- Tanda 2: Active (3 members, started) ---
const tanda2 = tandasService.createTanda({
  name: 'Tanda Febrero',
  organizerId: alice.id,
  contributionAmount: 500,
});
tandasService.joinTanda(tanda2.id, { userId: bob.id });
tandasService.joinTanda(tanda2.id, { userId: carlos.id });
tandasService.joinTanda(tanda2.id, { userId: diana.id });
const activeTanda = tandasService.startTanda(tanda2.id, { organizerId: alice.id });
console.log(`\nTanda "${activeTanda.name}" started (status: ${activeTanda.status}, rounds: ${activeTanda.total_rounds})`);

// Record contributions for round 1
const participants = tandasService.listParticipants(tanda2.id);
console.log('\nParticipants (with rotation positions):');
for (const p of participants) {
  console.log(`  id:${p.id} userId:${p.user_id} role:${p.role} rotation:${p.rotation_position}`);
}

const [p1, p2] = participants;
const c1 = contributionsService.recordContribution(tanda2.id, { participantId: p1.id });
const c2 = contributionsService.recordContribution(tanda2.id, { participantId: p2.id, isLate: true });
console.log(`\nContributions recorded: #${c1.id} (${c1.status}), #${c2.id} (${c2.status} — includes 5% penalty)`);

const roundSummary = contributionsService.getRoundSummary(tanda2.id, 1);
console.log(`\nRound 1 summary — collected: $${roundSummary.totalCollected}, receiver position: ${roundSummary.receiver?.rotation_position ?? 'n/a'}`);

console.log('\n✅ Done. Run `npm run dev` and try these requests:');
console.log(`  GET  http://localhost:3000/api/users`);
console.log(`  GET  http://localhost:3000/api/tandas?userId=${alice.id}`);
console.log(`  GET  http://localhost:3000/api/tandas/${tanda2.id}/participants`);
console.log(`  GET  http://localhost:3000/api/tandas/${tanda2.id}/rounds/1`);
