import { prisma } from '../lib/prisma'
import { CreateTandaInput, InviteParticipantInput, RecordContributionInput } from '../schemas/tanda'

export class TandaService {
  /**
   * Create a new tanda. The creator becomes the organizer and first participant.
   */
  async createTanda(
    input: CreateTandaInput,
    organizerId: string
  ): Promise<{
    id: string
    name: string
    status: string
    totalRounds: number
    contributionAmount: number
    targetAmount: number | null
  }> {
    const tanda = await prisma.tanda.create({
      data: {
        name: input.name,
        purpose: input.purpose,
        organizerId,
        contributionAmount: input.contributionAmount,
        totalRounds: input.totalRounds,
        targetAmount: input.targetAmount,
        status: 'FORMING',
      },
    })

    // Auto-add organizer as first participant
    await prisma.participant.create({
      data: {
        userId: organizerId,
        tandaId: tanda.id,
        role: 'ORGANIZER',
        rotationPosition: 0,
      },
    })

    return {
      id: tanda.id,
      name: tanda.name,
      status: tanda.status,
      totalRounds: tanda.totalRounds,
      contributionAmount: tanda.contributionAmount,
      targetAmount: tanda.targetAmount,
    }
  }

  /**
   * Get tanda details with participants and contributions summary
   */
  async getTandaDetail(tandaId: string) {
    const tanda = await prisma.tanda.findUnique({
      where: { id: tandaId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        contributions: true,
      },
    })

    if (!tanda) {
      throw new Error('Tanda not found')
    }

    // Calculate total contributions for current round
    const currentRoundContributions = tanda.contributions
      .filter((c) => c.round === tanda.currentRound)
      .reduce((sum, c) => sum + 1, 0) // Count contributions submitted

    const totalContributedThisRound = tanda.contributions
      .filter((c) => c.round === tanda.currentRound && c.status !== 'MISSED')
      .length * tanda.contributionAmount

    return {
      id: tanda.id,
      name: tanda.name,
      status: tanda.status,
      totalRounds: tanda.totalRounds,
      currentRound: tanda.currentRound,
      contributionAmount: tanda.contributionAmount,
      targetAmount: tanda.targetAmount,
      totalContributions: tanda.totalContributions,
      participantCount: tanda.participants.length,
      participants: tanda.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        rotationPosition: p.rotationPosition,
        user: p.user,
      })),
      currentRoundContributions,
      totalContributedThisRound,
    }
  }

  /**
   * Invite a user to join a tanda as a member
   */
  async inviteParticipant(tandaId: string, inviterId: string, input: InviteParticipantInput) {
    // Verify tanda exists and inviter is organizer
    const tanda = await prisma.tanda.findUnique({
      where: { id: tandaId },
      include: { participants: true },
    })

    if (!tanda) {
      throw new Error('Tanda not found')
    }

    const inviterParticipant = tanda.participants.find((p) => p.userId === inviterId)
    if (!inviterParticipant || inviterParticipant.role !== 'ORGANIZER') {
      throw new Error('Only organizer can invite participants')
    }

    // Check tanda is still in FORMING status
    if (tanda.status !== 'FORMING') {
      throw new Error('Cannot invite participants to a tanda that has started')
    }

    // Check max participants (20)
    if (tanda.participants.length >= 20) {
      throw new Error('Maximum 20 participants reached')
    }

    // Check user already a participant
    const existingParticipant = tanda.participants.find((p) => p.userId === input.userId)
    if (existingParticipant) {
      throw new Error('User is already a participant in this tanda')
    }

    // Add user as member
    const participant = await prisma.participant.create({
      data: {
        userId: input.userId,
        tandaId,
        role: 'MEMBER',
        rotationPosition: tanda.participants.length, // Next position
      },
    })

    return {
      id: participant.id,
      userId: participant.userId,
      role: participant.role,
      rotationPosition: participant.rotationPosition,
    }
  }

  /**
   * Record a contribution from a participant
   */
  async recordContribution(
    tandaId: string,
    participantId: string,
    userId: string,
    input: RecordContributionInput
  ) {
    // Get tanda with participants
    const tanda = await prisma.tanda.findUnique({
      where: { id: tandaId },
      include: { participants: true, contributions: true },
    })

    if (!tanda) {
      throw new Error('Tanda not found')
    }

    // Check tanda is open (FORMING or ACTIVE)
    if (tanda.status !== 'FORMING' && tanda.status !== 'ACTIVE') {
      throw new Error('Tanda is not accepting contributions')
    }

    // Verify participant exists and user owns it
    const participant = tanda.participants.find((p) => p.id === participantId)
    if (!participant || participant.userId !== userId) {
      throw new Error('Participant not found or unauthorized')
    }

    // Check if contribution already exists for this round
    const existingContribution = tanda.contributions.find(
      (c) => c.participantId === participantId && c.round === tanda.currentRound
    )

    if (existingContribution) {
      throw new Error('Contribution already recorded for this round')
    }

    // Record contribution
    const contribution = await prisma.contribution.create({
      data: {
        tandaId,
        participantId,
        round: tanda.currentRound,
        status: input.amountCents === tanda.contributionAmount ? 'PAID' : 'LATE',
        isLate: input.amountCents !== tanda.contributionAmount,
        latePenaltyPercent: input.amountCents !== tanda.contributionAmount ? 5 : 0,
        recordedByUserId: userId,
      },
    })

    // Update tanda total contributions
    const newTotal = tanda.totalContributions + input.amountCents
    await prisma.tanda.update({
      where: { id: tandaId },
      data: { totalContributions: newTotal },
    })

    // Check if target reached and update status to "FUNDED"
    if (tanda.targetAmount && newTotal >= tanda.targetAmount && tanda.status === 'FORMING') {
      await prisma.tanda.update({
        where: { id: tandaId },
        data: { status: 'FUNDED' },
      })
    }

    return {
      id: contribution.id,
      participantId: contribution.participantId,
      round: contribution.round,
      status: contribution.status,
      amountCents: input.amountCents,
    }
  }

  /**
   * Get tanda balance: total contributions minus withdrawn amounts
   */
  async getTandaBalance(tandaId: string) {
    const tanda = await prisma.tanda.findUnique({
      where: { id: tandaId },
      include: { contributions: true, payouts: true },
    })

    if (!tanda) {
      throw new Error('Tanda not found')
    }

    const totalPaidOut = tanda.payouts.reduce((sum, p) => sum + p.netPayout, 0)
    const balance = tanda.totalContributions - totalPaidOut

    return {
      totalContributions: tanda.totalContributions,
      totalPaidOut,
      balance,
      targetAmount: tanda.targetAmount,
      currentRound: tanda.currentRound,
      status: tanda.status,
    }
  }

  /**
   * Get public preview (no auth required)
   */
  async getTandaPreview(tandaId: string) {
    const tanda = await prisma.tanda.findUnique({
      where: { id: tandaId },
      include: {
        participants: {
          select: { id: true, role: true, rotationPosition: true },
        },
      },
    })

    if (!tanda) {
      throw new Error('Tanda not found')
    }

    return {
      id: tanda.id,
      name: tanda.name,
      status: tanda.status,
      totalRounds: tanda.totalRounds,
      currentRound: tanda.currentRound,
      contributionAmount: tanda.contributionAmount,
      targetAmount: tanda.targetAmount,
      totalContributions: tanda.totalContributions,
      participantCount: tanda.participants.length,
    }
  }
}

export const tandaService = new TandaService()
