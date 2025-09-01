import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ConfigService } from 'src/config/config.service';
import {
  ConsultationInvitation,
  UserRole,
  InvitationStatus,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from 'src/common/email/email.service';
import { addMinutes, isAfter } from 'date-fns';

const ALLOWED_INVITE_ROLES: UserRole[] = [
  UserRole.PATIENT,
  UserRole.EXPERT,
  UserRole.GUEST,
];

@Injectable()
export class ConsultationInvitationService {
  private readonly logger = new Logger(ConsultationInvitationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async createInvitationEmail(
    consultationId: number,
    inviterUserId: number,
    inviteEmail: string,
    role: UserRole,
    name?: string,
    notes?: string,
    expiresInMinutes = 60,
  ): Promise<ConsultationInvitation> {
    if (!ALLOWED_INVITE_ROLES.includes(role)) {
      throw new Error(`Invalid invitation role: ${role}`);
    }

    if (!inviteEmail || !inviteEmail.trim()) {
      throw new Error('Invite email is required');
    }

    const inviterUser = await this.db.user.findUnique({
      where: { id: inviterUserId },
      select: { role: true },
    });

    if (
      !inviterUser ||
      !([UserRole.PRACTITIONER, UserRole.ADMIN] as UserRole[]).includes(
        inviterUser.role,
      )
    ) {
      throw new Error('Only practitioners or admins can send invitations');
    }

    const consultation = await this.db.consultation.findUnique({
      where: { id: consultationId },
      select: { ownerId: true },
    });
    if (!consultation) throw new Error('Consultation not found');
    if (
      inviterUser.role === UserRole.PRACTITIONER &&
      consultation.ownerId !== inviterUserId
    ) {
      throw new Error('Not authorized to invite for this consultation');
    }

    const existing = await this.db.consultationInvitation.findFirst({
      where: {
        consultationId,
        inviteEmail: { equals: inviteEmail.trim(), mode: 'insensitive' },
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (existing) {
      throw new Error('A pending invitation already exists for this email');
    }

    const expireTime = addMinutes(new Date(), expiresInMinutes);
    const token = uuidv4();

    const invitation = await this.db.consultationInvitation.create({
      data: {
        consultationId,
        inviteEmail: inviteEmail.trim(),
        name: name || null,
        notes: notes || null,
        role,
        token,
        expiresAt: expireTime,
        status: InvitationStatus.PENDING,
        createdById: inviterUserId,
      },
    });

    const inviter = await this.db.user.findUnique({
      where: { id: inviterUserId },
      select: { firstName: true, lastName: true },
    });
    const inviterName = inviter
      ? `${inviter.firstName ?? ''} ${inviter.lastName ?? ''}`.trim()
      : 'A practitioner';

    const magicLinkUrl = `${this.configService.corsOrigin}/consultation/join/${token}`;

    try {
      await this.emailService.sendConsultationInvitationEmail(
        inviteEmail.trim(),
        inviterName,
        consultationId,
        magicLinkUrl,
        role,
        name,
        notes,
      );
      this.logger.log(
        `Sent ${role} invitation email to ${inviteEmail} for consultation ${consultationId} by ${inviterUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email to ${inviteEmail}: ${error.message}`,
        error,
      );
    }

    return invitation;
  }

  async validateToken(token: string): Promise<ConsultationInvitation> {
    const invite = await this.db.consultationInvitation.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new Error('Invalid invitation token');
    }
    if (invite.status !== InvitationStatus.PENDING) {
      throw new Error(`Invitation is ${invite.status.toLowerCase()}`);
    }
    if (isAfter(new Date(), invite.expiresAt)) {
      await this.db.consultationInvitation.update({
        where: { token },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new Error('Invitation link has expired');
    }
    return invite;
  }

  async markUsed(token: string, userId: number): Promise<void> {
    await this.db.consultationInvitation.update({
      where: { token },
      data: {
        status: InvitationStatus.USED,
        usedAt: new Date(),
        invitedUserId: userId,
      },
    });
  }

  async expireOldInvitations(): Promise<void> {
    const now = new Date();
    const expiredInvites = await this.db.consultationInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: now },
      },
    });

    for (const invite of expiredInvites) {
      try {
        await this.db.consultationInvitation.update({
          where: { id: invite.id },
          data: { status: InvitationStatus.EXPIRED },
        });
      } catch (error) {
        this.logger.error(
          `Failed to expire invitation ${invite.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Expired ${expiredInvites.length} invitations`);
  }

  /**
   * Gets all invitations for a consultation
   * @param consultationId - ID of the consultation
   * @returns Array of invitations with basic details
   */
  async getConsultationInvitations(consultationId: number): Promise<any[]> {
    return await this.db.consultationInvitation.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gets invitation statistics for a consultation
   * @param consultationId - ID of the consultation
   * @returns Statistics object
   */
  async getInvitationStats(consultationId: number): Promise<{
    total: number;
    pending: number;
    used: number;
    expired: number;
    revoked: number;
  }> {
    const invitations = await this.db.consultationInvitation.findMany({
      where: { consultationId },
      select: { status: true },
    });

    const stats = {
      total: invitations.length,
      pending: 0,
      used: 0,
      expired: 0,
      revoked: 0,
    };

    invitations.forEach((inv) => {
      switch (inv.status) {
        case InvitationStatus.PENDING:
          stats.pending++;
          break;
        case InvitationStatus.USED:
          stats.used++;
          break;
        case InvitationStatus.EXPIRED:
          stats.expired++;
          break;
        case InvitationStatus.REVOKED:
          stats.revoked++;
          break;
      }
    });

    return stats;
  }

  /**
   * Validates bulk invitation email formats
   * @param emails - Array of email addresses
   * @returns Object with valid and invalid emails
   */
  validateBulkEmails(emails: string[]): {
    valid: string[];
    invalid: Array<{ email: string; error: string }>;
  } {
    const valid: string[] = [];
    const invalid: Array<{ email: string; error: string }> = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    emails.forEach((email) => {
      if (!email || !email.trim()) {
        invalid.push({ email: email || '', error: 'Email is required' });
      } else if (!emailRegex.test(email.trim())) {
        invalid.push({ email, error: 'Invalid email format' });
      } else {
        valid.push(email.trim().toLowerCase());
      }
    });

    return { valid, invalid };
  }

  /**
   * Checks if email already has pending invitation for consultation
   * @param consultationId - ID of the consultation
   * @param email - Email address to check
   * @returns Promise<boolean> indicating if pending invitation exists
   */
  async hasPendingInvitation(
    consultationId: number,
    email: string,
  ): Promise<boolean> {
    const invitation = await this.db.consultationInvitation.findFirst({
      where: {
        consultationId,
        inviteEmail: email.toLowerCase().trim(),
        status: InvitationStatus.PENDING,
      },
    });

    return !!invitation;
  }
}
