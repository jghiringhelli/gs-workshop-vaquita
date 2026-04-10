import { prisma } from '../lib/prisma'
import { CreateWithdrawalInput, VoteOnWithdrawalInput } from '../schemas/withdrawal'

export class WithdrawalService {
  /**
   * Request a withdrawal from a tanda (organizer only)
   */
  async requestWithdrawal(
    tandaId: string,
    organizerId: string,
    input: CreateWithdrawalInput
  ): Promise<{
    id: string
    tandaId: string
    amountCents: number
    status: string
  }> {
    // Verify organizer
    const tanda = await prisma.tanda.findUnique({
      where: { id: tandaId },
      include: { participants: true },
    })

    if (!tanda) {
      throw new Error('Tanda not found')
    }

    const organizer = tanda.participants.find((p) => p.role === 'ORGANIZER')
    if (!organizer || organizer.userId !== organizerId) {
      throw new Error('Only organizer can request withdrawals')
    }

    // Create withdrawal
    const withdrawal = await prisma.withdrawal.create({
      data: {
        tandaId,
        organizerId,
        amountCents: input.amountCents,
        reason: input.reason,
        receiptUrl: input.receiptUrl || null,
        status: 'PENDING',
      },
    })

    return {
      id: withdrawal.id,
      tandaId: withdrawal.tandaId,
      amountCents: withdrawal.amountCents,
      status: withdrawal.status,
    }
  }

  /**
   * Get all withdrawals for a tanda with vote counts
   */
  async getWithdrawals(tandaId: string) {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { tandaId },
      include: {
        votes: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return withdrawals.map((w) => ({
      id: w.id,
      tandaId: w.tandaId,
      amountCents: w.amountCents,
      reason: w.reason,
      receiptUrl: w.receiptUrl,
      status: w.status,
      approveVotes: w.approveVotes,
      rejectVotes: w.rejectVotes,
      totalVotes: w.votes.length,
      resolvedAt: w.resolvedAt,
      createdAt: w.createdAt,
    }))
  }

  /**
   * Vote on a withdrawal
   */
  async voteOnWithdrawal(
    withdrawalId: string,
    participantId: string,
    userId: string,
    input: VoteOnWithdrawalInput
  ): Promise<{
    id: string
    vote: string
  }> {
    // Get withdrawal with related data
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        tanda: {
          include: { participants: true },
        },
        votes: true,
      },
    })

    if (!withdrawal) {
      throw new Error('Withdrawal not found')
    }

    // Rule: receiptUrl must be present before voting
    if (!withdrawal.receiptUrl) {
      throw new Error('Receipt URL is required before voting can begin')
    }

    // Rule: member cannot vote on their own withdrawal
    const participant = withdrawal.tanda.participants.find((p) => p.id === participantId)
    if (!participant || participant.userId !== userId) {
      throw new Error('Participant not found or unauthorized')
    }

    if (withdrawal.organizerId === userId) {
      throw new Error('Organizer cannot vote on their own withdrawal')
    }

    // Check withdrawal is still pending
    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal is no longer open for voting')
    }

    // Check if vote already exists
    const existingVote = withdrawal.votes.find((v) => v.participantId === participantId)
    if (existingVote) {
      throw new Error('You have already voted on this withdrawal')
    }

    const totalMembers = withdrawal.tanda.participants.length
    const approvalThreshold = Math.ceil(totalMembers / 2)
    const rejectionThreshold = Math.floor(totalMembers / 2) + 1

    // Create vote in transaction with potential status update
    const vote = await prisma.withdrawalVote.create({
      data: {
        withdrawalId,
        participantId,
        participantUserId: userId,
        vote: input.vote,
      },
    })

    // Update vote counts
    const newApproveVotes = input.vote === 'approve' ? withdrawal.approveVotes + 1 : withdrawal.approveVotes
    const newRejectVotes = input.vote === 'reject' ? withdrawal.rejectVotes + 1 : withdrawal.rejectVotes

    let newStatus = withdrawal.status
    let resolvedAt = withdrawal.resolvedAt

    // Check if approval threshold reached
    if (newApproveVotes >= approvalThreshold && newStatus === 'PENDING') {
      newStatus = 'APPROVED'
      resolvedAt = new Date()
    }

    // Check if rejection threshold reached
    if (newRejectVotes >= rejectionThreshold && newStatus === 'PENDING') {
      newStatus = 'REJECTED'
      resolvedAt = new Date()
    }

    // Update withdrawal with new vote counts and status
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        approveVotes: newApproveVotes,
        rejectVotes: newRejectVotes,
        status: newStatus,
        resolvedAt,
      },
    })

    return {
      id: vote.id,
      vote: vote.vote,
    }
  }

  /**
   * Dissolve a tanda (cancel it)
   */
  async dissolveTanda(tandaId: string, organizerId: string): Promise<{
    id: string
    status: string
  }> {
    // Verify organizer
    const tanda = await prisma.tanda.findUnique({
      where: { id: tandaId },
      include: { participants: true },
    })

    if (!tanda) {
      throw new Error('Tanda not found')
    }

    const organizer = tanda.participants.find((p) => p.role === 'ORGANIZER')
    if (!organizer || organizer.userId !== organizerId) {
      throw new Error('Only organizer can dissolve a tanda')
    }

    // Update tanda status to CANCELLED
    const updated = await prisma.tanda.update({
      where: { id: tandaId },
      data: { status: 'CANCELLED' },
    })

    return {
      id: updated.id,
      status: updated.status,
    }
  }

  /**
   * Get combined ledger of contributions and withdrawals
   */
  async getLedger(tandaId: string) {
    const contributions = await prisma.contribution.findMany({
      where: { tandaId },
      orderBy: { createdAt: 'asc' },
    })

    const withdrawals = await prisma.withdrawal.findMany({
      where: { tandaId },
      orderBy: { createdAt: 'asc' },
    })

    // Combine entries
    const entries = [
      ...contributions.map((c) => ({
        type: 'contribution' as const,
        id: c.id,
        participantId: c.participantId,
        round: c.round,
        amount: c.status === 'PAID' || c.status === 'LATE' ? (c as any).tandaAmount || 0 : 0,
        status: c.status,
        createdAt: c.createdAt,
      })),
      ...withdrawals.map((w) => ({
        type: 'withdrawal' as const,
        id: w.id,
        participantId: w.organizerId,
        round: undefined,
        amount: w.amountCents,
        status: w.status,
        createdAt: w.createdAt,
      })),
    ]

    // Sort by createdAt
    return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }
}

export const withdrawalService = new WithdrawalService()
