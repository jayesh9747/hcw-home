import { Injectable, Logger, Inject } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { MediasoupSessionService } from 'src/mediasoup/mediasoup-session.service';
import { ConsultationUtilityService } from './consultation-utility.service';
import {
  IConsultationGateway,
  CONSULTATION_GATEWAY_TOKEN,
} from './interfaces/consultation-gateway.interface';
import { UserRole, ConsultationStatus } from '@prisma/client';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';

/**
 * Consultation MediaSoup Service
 *
 * This service handles MediaSoup-specific operations for consultations:
 * - Session initialization and management
 * - Participant media session handling
 * - State transitions with media coordination
 * - Health monitoring and status checking
 */
@Injectable()
export class ConsultationMediaSoupService {
  private readonly logger = new Logger(ConsultationMediaSoupService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mediasoupSessionService: MediasoupSessionService,
    @Inject(CONSULTATION_GATEWAY_TOKEN)
    private readonly consultationGateway: IConsultationGateway,
    private readonly consultationUtilityService: ConsultationUtilityService,
  ) { }

  /**
   * Enhanced MediaSoup session initialization with comprehensive participant tracking
   */
  async initializeMediaSoupSession(
    consultationId: number,
    initiatorUserId: number,
    initiatorRole: UserRole,
  ): Promise<{
    routerId: string;
    routerRtpCapabilities: any;
    sessionInitialized: boolean;
    participantCount: number;
  }> {
    try {
      this.logger.log(
        `Initializing MediaSoup session for consultation ${consultationId} by user ${initiatorUserId} (${initiatorRole})`,
      );

      // Use ensureRouterForConsultation for more robust router management
      const router = await this.mediasoupSessionService.ensureRouterForConsultation(consultationId);
      let sessionInitialized = false;

      // Check if this is a new router creation
      const existingRouterRecord = await this.db.mediasoupRouter.findUnique({
        where: { consultationId },
        include: { server: true },
      });

      if (!existingRouterRecord) {
        sessionInitialized = true;

        // Update consultation status if needed
        const consultation = await this.db.consultation.findUnique({
          where: { id: consultationId },
          select: { status: true, ownerId: true },
        });

        if (consultation?.status === ConsultationStatus.WAITING) {
          await this.db.consultation.update({
            where: { id: consultationId },
            data: { status: ConsultationStatus.ACTIVE },
          });
        }

        this.logger.log(
          `MediaSoup router created and session initialized for consultation ${consultationId}`,
        );
      }

      await this.consultationUtilityService.updateParticipantMediaStatus(
        consultationId,
        initiatorUserId,
        'session_initialized',
        { role: initiatorRole, routerId: router.id },
      );

      const participantCount = await this.db.participant.count({
        where: {
          consultationId,
          isActive: true,
        },
      });

      if (this.consultationGateway.server) {
        this.consultationGateway.server
          .to(`consultation:${consultationId}`)
          .emit('media_session_ready', {
            consultationId,
            routerId: router.id,
            rtpCapabilities: router.rtpCapabilities,
            sessionInitialized,
            participantCount,
            initiatedBy: {
              userId: initiatorUserId,
              role: initiatorRole,
            },
          });
      }

      return {
        routerId: router.id,
        routerRtpCapabilities: router.rtpCapabilities,
        sessionInitialized,
        participantCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialize MediaSoup session for consultation ${consultationId}: ${error.message}`,
        error.stack,
      );
      throw HttpExceptionHelper.internalServerError(
        'Failed to initialize media session',
        undefined,
        undefined,
        error,
      );
    }
  }

  /**
   * Enhanced participant joining with proper MediaSoup coordination
   */
  async handleParticipantJoinMedia(
    consultationId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<{
    canJoinMedia: boolean;
    mediaCapabilities: any;
    waitingRoomRequired: boolean;
    mediaSession?: any;
  }> {
    try {
      const consultation = await this.db.consultation.findUnique({
        where: { id: consultationId },
        include: {
          participants: {
            where: { userId },
          },
        },
      });

      if (!consultation) {
        throw HttpExceptionHelper.notFound('Consultation not found');
      }

      const participant = consultation.participants[0];
      if (!participant) {
        throw HttpExceptionHelper.notFound('Participant not found');
      }

      // Check if participant needs to wait in waiting room
      const waitingRoomRequired =
        userRole === UserRole.PATIENT &&
        participant.inWaitingRoom &&
        consultation.status !== ConsultationStatus.ACTIVE;

      if (waitingRoomRequired) {
        // Patient must wait for admission
        await this.consultationUtilityService.updateParticipantMediaStatus(
          consultationId,
          userId,
          'waiting_for_admission',
          { role: userRole, status: 'waiting_room' },
        );

        return {
          canJoinMedia: false,
          mediaCapabilities:
            this.consultationUtilityService.getConsultationCapabilities(
              userRole,
              true,
            ),
          waitingRoomRequired: true,
        };
      }

      // Initialize MediaSoup session if needed
      const mediaSession = await this.initializeMediaSoupSession(
        consultationId,
        userId,
        userRole,
      );

      // Update participant status to active
      await this.db.participant.updateMany({
        where: { consultationId, userId },
        data: {
          isActive: true,
          inWaitingRoom: false,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      // Record media join event
      await this.consultationUtilityService.updateParticipantMediaStatus(
        consultationId,
        userId,
        'joined_media_session',
        {
          role: userRole,
          routerId: mediaSession.routerId,
          capabilities:
            this.consultationUtilityService.getConsultationCapabilities(
              userRole,
            ),
        },
      );

      // Emit participant joined event
      if (this.consultationGateway.server) {
        this.consultationGateway.server
          .to(`consultation:${consultationId}`)
          .emit('participant_joined_media', {
            consultationId,
            participant: {
              userId,
              role: userRole,
              capabilities:
                this.consultationUtilityService.getConsultationCapabilities(
                  userRole,
                ),
              joinedAt: new Date(),
            },
            mediaSession: {
              routerId: mediaSession.routerId,
              rtpCapabilities: mediaSession.routerRtpCapabilities,
              participantCount: mediaSession.participantCount,
            },
          });
      }

      return {
        canJoinMedia: true,
        mediaCapabilities:
          this.consultationUtilityService.getConsultationCapabilities(userRole),
        waitingRoomRequired: false,
        mediaSession,
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle participant media join: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Enhanced participant leaving with proper cleanup
   */
  async handleParticipantLeaveMedia(
    consultationId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    try {
      this.logger.log(
        `Handling participant leave for user ${userId} (${userRole}) in consultation ${consultationId}`,
      );

      // Update participant status
      await this.db.participant.updateMany({
        where: { consultationId, userId },
        data: {
          isActive: false,
          lastSeenAt: new Date(),
        },
      });

      await this.consultationUtilityService.updateParticipantMediaStatus(
        consultationId,
        userId,
        'left_media_session',
        { role: userRole },
      );

      // Check remaining active participants
      const activeParticipants = await this.db.participant.count({
        where: {
          consultationId,
          isActive: true,
        },
      });

      this.logger.log(
        `Active participants remaining in consultation ${consultationId}: ${activeParticipants}`,
      );

      // Clean up MediaSoup session if no active participants
      if (activeParticipants === 0) {
        this.logger.log(
          `No active participants remaining, cleaning up MediaSoup session for consultation ${consultationId}`,
        );
        await this.consultationUtilityService.cleanupMediaSoupSession(
          consultationId,
        );

        // Update consultation status to terminated if it was active
        const consultation = await this.db.consultation.findUnique({
          where: { id: consultationId },
          select: { status: true },
        });

        if (consultation?.status === ConsultationStatus.ACTIVE) {
          await this.db.consultation.update({
            where: { id: consultationId },
            data: { status: ConsultationStatus.TERMINATED_OPEN },
          });
        }
      }

      // Emit participant left event
      if (this.consultationGateway.server) {
        this.consultationGateway.server
          .to(`consultation:${consultationId}`)
          .emit('participant_left_media', {
            consultationId,
            participant: {
              userId,
              role: userRole,
              leftAt: new Date(),
            },
            activeParticipantsCount: activeParticipants,
            sessionCleanedUp: activeParticipants === 0,
          });
      }

      this.logger.log(
        `Participant ${userId} (${userRole}) left media session for consultation ${consultationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle participant media leave: ${error.message}`,
        error.stack,
      );
      throw HttpExceptionHelper.internalServerError(
        'Failed to handle participant leave',
        undefined,
        undefined,
        error,
      );
    }
  }

  /**
   * Enhanced consultation state transition with proper MediaSoup handling
   */
  async transitionConsultationState(
    consultationId: number,
    newStatus: ConsultationStatus,
    initiatorUserId: number,
  ): Promise<void> {
    try {
      const consultation = await this.db.consultation.findUnique({
        where: { id: consultationId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  role: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!consultation) {
        throw HttpExceptionHelper.notFound('Consultation not found');
      }

      const previousStatus = consultation.status;

      // Update consultation status
      await this.db.consultation.update({
        where: { id: consultationId },
        data: { status: newStatus },
      });

      // Handle state-specific logic
      switch (newStatus) {
        case ConsultationStatus.ACTIVE:
          // Initialize MediaSoup session if moving to active
          if (previousStatus !== ConsultationStatus.ACTIVE) {
            const initiator = consultation.participants.find(
              (p) => p.userId === initiatorUserId,
            );
            if (initiator) {
              await this.initializeMediaSoupSession(
                consultationId,
                initiatorUserId,
                initiator.user.role,
              );
            }
          }
          break;

        case ConsultationStatus.COMPLETED:
        case ConsultationStatus.CANCELLED:
        case ConsultationStatus.TERMINATED_OPEN:
          // Clean up MediaSoup session when consultation ends
          await this.consultationUtilityService.cleanupMediaSoupSession(
            consultationId,
          );

          // Update all participants to inactive
          await this.db.participant.updateMany({
            where: { consultationId },
            data: {
              isActive: false,
              lastSeenAt: new Date(),
            },
          });
          break;
      }

      // Emit state transition event
      if (this.consultationGateway.server) {
        this.consultationGateway.server
          .to(`consultation:${consultationId}`)
          .emit('consultation_state_changed', {
            consultationId,
            previousStatus,
            newStatus,
            changedBy: initiatorUserId,
            changedAt: new Date(),
            participants: consultation.participants.map((p) => ({
              userId: p.userId,
              role: p.user.role,
              isActive:
                newStatus === ConsultationStatus.ACTIVE ? p.isActive : false,
            })),
          });
      }

      this.logger.log(
        `Consultation ${consultationId} transitioned from ${previousStatus} to ${newStatus} by user ${initiatorUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to transition consultation state: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get comprehensive participant information with media status
   */
  async getActiveParticipantsWithMediaStatus(consultationId: number): Promise<{
    participants: any[];
    totalCount: number;
    activeCount: number;
    mediaSessionActive: boolean;
    mediaSessionHealth: any;
  }> {
    try {
      const participants = await this.db.participant.findMany({
        where: { consultationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              email: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });

      const mediaSessionActive =
        this.mediasoupSessionService.getRouter(consultationId) !== null;

      // Get media session health if active
      let mediaSessionHealth: any = null;
      if (mediaSessionActive) {
        try {
          mediaSessionHealth =
            await this.mediasoupSessionService.checkConsultationMediaHealth(
              consultationId,
            );
        } catch (error) {
          this.logger.warn(
            `Failed to get media session health for consultation ${consultationId}: ${error.message}`,
          );
        }
      }

      const participantDetails = participants.map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        user: participant.user,
        isActive: participant.isActive,
        inWaitingRoom: participant.inWaitingRoom,
        joinedAt: participant.joinedAt,
        lastSeenAt: participant.lastSeenAt,
        lastActiveAt: participant.lastActiveAt,
        capabilities:
          this.consultationUtilityService.getConsultationCapabilities(
            participant.user.role,
            participant.inWaitingRoom,
          ),
      }));

      const activeCount = participants.filter((p) => p.isActive).length;

      return {
        participants: participantDetails,
        totalCount: participants.length,
        activeCount,
        mediaSessionActive,
        mediaSessionHealth,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get active participants: ${error.message}`,
        error.stack,
      );
      throw HttpExceptionHelper.internalServerError(
        'Failed to retrieve participants',
        undefined,
        undefined,
        error,
      );
    }
  }

  /**
   * Enhanced consultation health check including MediaSoup status
   */
  async getConsultationHealthStatus(consultationId: number): Promise<{
    consultationExists: boolean;
    consultationStatus: string;
    participantCount: number;
    activeParticipantCount: number;
    mediaSessionActive: boolean;
    mediaSessionHealth: any;
    issues: string[];
  }> {
    try {
      const consultation = await this.db.consultation.findUnique({
        where: { id: consultationId },
        include: {
          participants: true,
        },
      });

      if (!consultation) {
        return {
          consultationExists: false,
          consultationStatus: 'NOT_FOUND',
          participantCount: 0,
          activeParticipantCount: 0,
          mediaSessionActive: false,
          mediaSessionHealth: null,
          issues: ['Consultation not found'],
        };
      }

      const activeParticipantCount = consultation.participants.filter(
        (p) => p.isActive,
      ).length;
      const mediaSessionActive =
        this.mediasoupSessionService.getRouter(consultationId) !== null;

      let mediaSessionHealth: any = null;
      const issues: string[] = [];

      if (mediaSessionActive) {
        try {
          mediaSessionHealth =
            await this.mediasoupSessionService.checkConsultationMediaHealth(
              consultationId,
            );

          if (mediaSessionHealth && !mediaSessionHealth.routerActive) {
            issues.push('MediaSoup router is not active');
          }
        } catch (error) {
          issues.push(`Failed to check media session health: ${error.message}`);
        }
      } else if (
        consultation.status === ConsultationStatus.ACTIVE &&
        activeParticipantCount > 0
      ) {
        issues.push('Consultation is active but no media session found');
      }

      return {
        consultationExists: true,
        consultationStatus: consultation.status,
        participantCount: consultation.participants.length,
        activeParticipantCount,
        mediaSessionActive,
        mediaSessionHealth,
        issues,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get consultation health status: ${error.message}`,
        error.stack,
      );
      return {
        consultationExists: false,
        consultationStatus: 'ERROR',
        participantCount: 0,
        activeParticipantCount: 0,
        mediaSessionActive: false,
        mediaSessionHealth: null,
        issues: [`Health check failed: ${error.message}`],
      };
    }
  }

  /**
   * Clean up participant's MediaSoup resources (transports, producers, consumers)
   * this will be handled by the MediaSoup session service during cleanup
   */
  async cleanupParticipantMediaResources(
    consultationId: number,
    userId: number,
  ): Promise<void> {
    try {
      this.logger.log(
        `Initiating MediaSoup resource cleanup for user ${userId} in consultation ${consultationId}`,
      );

      // The MediaSoup session service will handle cleanup when participants disconnect their transports/producers

      // Update participant status to trigger proper cleanup
      await this.consultationUtilityService.updateParticipantMediaStatus(
        consultationId,
        userId,
        'resources_cleanup_initiated',
        { timestamp: new Date(), reason: 'participant_leave' },
      );

      this.logger.log(
        `MediaSoup resource cleanup initiated for user ${userId} in consultation ${consultationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup participant media resources: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle MediaSoup connection state changes for participants
   */
  async handleParticipantConnectionStateChange(
    consultationId: number,
    userId: number,
    connectionState: 'connected' | 'disconnected' | 'failed',
  ): Promise<void> {
    try {
      this.logger.log(
        `Handling connection state change for user ${userId} in consultation ${consultationId}: ${connectionState}`,
      );

      await this.consultationUtilityService.updateParticipantMediaStatus(
        consultationId,
        userId,
        'connection_state_changed',
        { connectionState, timestamp: new Date() },
      );

      // Update participant's last active timestamp
      await this.db.participant.updateMany({
        where: { consultationId, userId },
        data: { lastActiveAt: new Date() },
      });

      // Handle disconnection or failure
      if (connectionState === 'disconnected' || connectionState === 'failed') {
        // Clean up participant's media resources
        await this.cleanupParticipantMediaResources(consultationId, userId);

        // Check if participant should be marked as inactive
        const participant = await this.db.participant.findFirst({
          where: { consultationId, userId },
          include: { user: true },
        });

        if (participant && connectionState === 'failed') {
          // Mark participant as inactive if connection failed
          await this.db.participant.updateMany({
            where: { consultationId, userId },
            data: { isActive: false, lastSeenAt: new Date() },
          });

          // Emit connection failure event
          if (this.consultationGateway.server) {
            this.consultationGateway.server
              .to(`consultation:${consultationId}`)
              .emit('participant_connection_failed', {
                consultationId,
                participant: {
                  userId,
                  role: participant.user.role,
                  connectionState,
                  timestamp: new Date(),
                },
              });
          }
        }
      }

      // Emit connection state change event
      if (this.consultationGateway.server) {
        this.consultationGateway.server
          .to(`consultation:${consultationId}`)
          .emit('participant_connection_state_changed', {
            consultationId,
            userId,
            connectionState,
            timestamp: new Date(),
          });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle participant connection state change: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Validate MediaSoup integration status for a consultation
   */
  async validateMediaSoupIntegration(consultationId: number): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if consultation exists
      const consultation = await this.db.consultation.findUnique({
        where: { id: consultationId },
        include: { participants: true },
      });

      if (!consultation) {
        issues.push('Consultation not found');
        return { isValid: false, issues, recommendations };
      }

      // Check MediaSoup router status
      const router = this.mediasoupSessionService.getRouter(consultationId);
      const routerDbRecord = await this.db.mediasoupRouter.findUnique({
        where: { consultationId },
        include: { server: true },
      });

      if (consultation.status === ConsultationStatus.ACTIVE) {
        if (!router) {
          issues.push('Active consultation missing MediaSoup router');
          recommendations.push('Initialize MediaSoup session for active consultation');
        }

        if (!routerDbRecord) {
          issues.push('MediaSoup router not found in database');
          recommendations.push('Ensure router database record consistency');
        } else if (!routerDbRecord.server.active) {
          issues.push('MediaSoup server is not active');
          recommendations.push('Activate MediaSoup server or migrate to active server');
        }
      }

      // Check participant consistency
      const activeParticipants = consultation.participants.filter(p => p.isActive);
      if (consultation.status === ConsultationStatus.ACTIVE && activeParticipants.length === 0) {
        issues.push('Active consultation has no active participants');
        recommendations.push('Update consultation status or activate participants');
      }

      // Check MediaSoup health if router exists
      if (router) {
        try {
          const mediaHealth = await this.mediasoupSessionService.checkConsultationMediaHealth(consultationId);
          if (!mediaHealth.routerActive) {
            issues.push('MediaSoup router is not active');
            recommendations.push('Restart MediaSoup router or recreate session');
          }
        } catch (healthError) {
          issues.push(`Failed to check MediaSoup health: ${healthError.message}`);
          recommendations.push('Investigate MediaSoup service connectivity');
        }
      }

      const isValid = issues.length === 0;

      if (isValid) {
        recommendations.push('MediaSoup integration is functioning correctly');
      }

      return { isValid, issues, recommendations };
    } catch (error) {
      this.logger.error(
        `Failed to validate MediaSoup integration: ${error.message}`,
        error.stack,
      );
      return {
        isValid: false,
        issues: [`Validation failed: ${error.message}`],
        recommendations: ['Check system logs and MediaSoup service status'],
      };
    }
  }
}
