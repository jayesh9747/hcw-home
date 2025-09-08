import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateMessageDto, MessageType } from './dto/create-message.dto';
import { ReadMessageDto } from './dto/read-message.dto';
import { StorageService } from 'src/storage/storage.service';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) { }

  async createMessage(data: CreateMessageDto, file?: Express.Multer.File) {
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let messageType = data.messageType || MessageType.TEXT;

      if (file) {
        this.validateFile(file);

        mediaUrl = await this.storageService.uploadFile(file);
        mediaType = file.mimetype;
        fileName = file.originalname;
        fileSize = file.size;

        if (file.mimetype.startsWith('image/')) {
          messageType = MessageType.IMAGE;
        } else {
          messageType = MessageType.FILE;
        }

        this.logger.log(`File uploaded for message: ${mediaUrl}`);
      }

      await this.verifyConsultationAccess(data.userId, data.consultationId);

      const message = await this.prisma.message.create({
        data: {
          userId: data.userId,
          consultationId: data.consultationId,
          content: data.content,
          clientUuid: data.clientUuid,
          mediaUrl: mediaUrl || data.mediaUrl,
          mediaType: mediaType || data.mediaType,
          messageType,
          fileName: fileName || data.fileName,
          fileSize: fileSize || data.fileSize,
          readReceipts: {
            create: {
              userId: data.userId,
              readAt: new Date(),
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          readReceipts: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(
        `Message created: ID ${message.id}, User ${data.userId}, Consultation ${data.consultationId}, Type: ${messageType}`,
      );

      return message;
    } catch (error) {
      this.logger.error('Failed to create message:', error);
      throw error;
    }
  }

  async getMessages(
    consultationId: number,
    limit: number = this.configService.chatMessageHistoryLimit,
    offset: number = 0,
  ) {
    try {
      const messages = await this.prisma.message.findMany({
        where: { consultationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          readReceipts: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { readAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return messages.reverse();
    } catch (error) {
      this.logger.error('Failed to get messages:', error);
      throw error;
    }
  }

  async markMessageAsRead(data: ReadMessageDto) {
    try {
      // Check if message exists and user has access
      const message = await this.prisma.message.findFirst({
        where: {
          id: data.messageId,
          consultationId: data.consultationId,
        },
      });

      if (!message) {
        throw new NotFoundException('Message not found or access denied');
      }

      await this.verifyConsultationAccess(data.userId, data.consultationId);

      // Create or update read receipt
      const readReceipt = await this.prisma.messageReadReceipt.upsert({
        where: {
          messageId_userId: {
            messageId: data.messageId,
            userId: data.userId,
          },
        },
        create: {
          messageId: data.messageId,
          userId: data.userId,
          readAt: new Date(),
        },
        update: {
          readAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      this.logger.log(
        `Message marked as read: Message ${data.messageId}, User ${data.userId}`,
      );

      return readReceipt;
    } catch (error) {
      this.logger.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  async bulkMarkMessagesAsRead(
    messageIds: number[],
    userId: number,
    consultationId: number,
  ) {
    try {
      await this.verifyConsultationAccess(userId, consultationId);

      const messageCount = await this.prisma.message.count({
        where: {
          id: { in: messageIds },
          consultationId,
        },
      });

      if (messageCount !== messageIds.length) {
        throw new BadRequestException(
          'Some messages do not belong to this consultation',
        );
      }

      // Create read receipts for all messages that don't have them yet
      const readReceipts = await Promise.all(
        messageIds.map((messageId) =>
          this.prisma.messageReadReceipt.upsert({
            where: {
              messageId_userId: { messageId, userId },
            },
            create: {
              messageId,
              userId,
              readAt: new Date(),
            },
            update: {
              readAt: new Date(),
            },
          }),
        ),
      );

      this.logger.log(
        `Bulk marked messages as read: ${messageIds.length} messages, User ${userId}`,
      );

      return readReceipts;
    } catch (error) {
      this.logger.error('Failed to bulk mark messages as read:', error);
      throw error;
    }
  }

  async getUnreadMessageCount(
    userId: number,
    consultationId: number,
  ): Promise<number> {
    try {
      await this.verifyConsultationAccess(userId, consultationId);

      const unreadCount = await this.prisma.message.count({
        where: {
          consultationId,
          userId: { not: userId },
          readReceipts: {
            none: {
              userId,
            },
          },
        },
      });

      return unreadCount;
    } catch (error) {
      this.logger.error('Failed to get unread message count:', error);
      throw error;
    }
  }

  async getMessageReadStatus(messageId: number, consultationId: number) {
    try {
      const readReceipts = await this.prisma.messageReadReceipt.findMany({
        where: {
          messageId,
          message: {
            consultationId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { readAt: 'asc' },
      });

      return readReceipts;
    } catch (error) {
      this.logger.error('Failed to get message read status:', error);
      throw error;
    }
  }

  async createSystemMessage(consultationId: number, content: string) {
    const message = await this.prisma.message.create({
      data: {
        consultationId,
        content,
        isSystem: true,
        messageType: MessageType.SYSTEM,
        userId: 0, // A user ID of 0 can represent the system
        clientUuid: 'system-message',
      },
    });
    return message;
  }

  /**
   * Get consultation participants for read receipts
   */
  async getConsultationParticipants(consultationId: number) {
    try {
      const participants = await this.prisma.participant.findMany({
        where: { consultationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return participants.map(p => p.user);
    } catch (error) {
      this.logger.error('Failed to get consultation participants:', error);
      throw error;
    }
  }

  /**
   * Mark all messages as read for a user in a consultation
   */
  async markAllMessagesAsReadForUser(
    userId: number,
    consultationId: number,
  ) {
    try {
      await this.verifyConsultationAccess(userId, consultationId);

      // Get all unread messages for this user in the consultation
      const unreadMessages = await this.prisma.message.findMany({
        where: {
          consultationId,
          userId: { not: userId }, // Don't mark own messages
          readReceipts: {
            none: {
              userId,
            },
          },
        },
        select: { id: true },
      });

      if (unreadMessages.length === 0) {
        return [];
      }

      // Create read receipts for all unread messages
      const readReceiptsData = unreadMessages.map(msg => ({
        messageId: msg.id,
        userId,
        readAt: new Date(),
      }));

      const readReceipts = await this.prisma.messageReadReceipt.createMany({
        data: readReceiptsData,
        skipDuplicates: true,
      });

      this.logger.log(
        `Marked ${unreadMessages.length} messages as read for user ${userId} in consultation ${consultationId}`,
      );

      return readReceipts;
    } catch (error) {
      this.logger.error('Failed to mark all messages as read:', error);
      throw error;
    }
  }

  /**
   * Get typing users for a consultation
   */
  private typingUsers = new Map<string, {
    userId: number;
    consultationId: number;
    userName: string;
    timeout: NodeJS.Timeout;
  }>();

  setUserTyping(userId: number, consultationId: number, userName: string): void {
    const key = `${userId}-${consultationId}`;

    // Clear existing timeout
    const existing = this.typingUsers.get(key);
    if (existing?.timeout) {
      clearTimeout(existing.timeout);
    }

    // Set new timeout (user stops typing after configured inactivity period)
    const timeout = setTimeout(() => {
      this.typingUsers.delete(key);
    }, this.configService.chatTypingInactivityMs);

    this.typingUsers.set(key, {
      userId,
      consultationId,
      userName,
      timeout,
    });
  }

  setUserStoppedTyping(userId: number, consultationId: number): void {
    const key = `${userId}-${consultationId}`;
    const existing = this.typingUsers.get(key);

    if (existing?.timeout) {
      clearTimeout(existing.timeout);
    }

    this.typingUsers.delete(key);
  }

  getTypingUsers(consultationId: number): Array<{ userId: number; userName: string }> {
    return Array.from(this.typingUsers.values())
      .filter(user => user.consultationId === consultationId)
      .map(user => ({ userId: user.userId, userName: user.userName }));
  }

  async deleteMessage(
    messageId: number,
    userId: number,
    consultationId: number,
  ) {
    try {
      const message = await this.prisma.message.findFirst({
        where: {
          id: messageId,
          userId,
          consultationId,
        },
      });

      if (!message) {
        throw new NotFoundException('Message not found or access denied');
      }

      // Soft delete by updating content
      const updatedMessage = await this.prisma.message.update({
        where: { id: messageId },
        data: {
          content: '[Message deleted]',
          editedAt: new Date(),
          mediaUrl: null,
          mediaType: null,
        },
      });

      this.logger.log(`Message deleted: ID ${messageId}, User ${userId}`);

      return updatedMessage;
    } catch (error) {
      this.logger.error('Failed to delete message:', error);
      throw error;
    }
  }

  async editMessage(
    messageId: number,
    userId: number,
    newContent: string,
    consultationId: number,
  ) {
    try {
      const message = await this.prisma.message.findFirst({
        where: {
          id: messageId,
          userId,
          consultationId,
        },
      });

      if (!message) {
        throw new NotFoundException('Message not found or access denied');
      }

      // Check if message is too old to edit (configurable timeout)
      const editTimeoutMs = this.configService.chatMessageEditTimeoutMinutes * 60 * 1000;
      const editDeadline = new Date(Date.now() - editTimeoutMs);
      if (message.createdAt < editDeadline) {
        throw new BadRequestException(`Message is too old to edit (limit: ${this.configService.chatMessageEditTimeoutMinutes} minutes)`);
      }

      const updatedMessage = await this.prisma.message.update({
        where: { id: messageId },
        data: {
          content: newContent,
          editedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          readReceipts: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Message edited: ID ${messageId}, User ${userId}`);

      return updatedMessage;
    } catch (error) {
      this.logger.error('Failed to edit message:', error);
      throw error;
    }
  }

  private async verifyConsultationAccess(
    userId: number,
    consultationId: number,
  ) {
    const participant = await this.prisma.participant.findUnique({
      where: {
        consultationId_userId: { consultationId, userId },
      },
    });

    if (!participant) {
      throw new BadRequestException(
        'User does not have access to this consultation',
      );
    }

    return participant;
  }

  private validateFile(file: Express.Multer.File) {
    const maxSize = this.configService.chatMaxFileSize;
    const allowedTypes = this.configService.chatAllowedFileTypes;

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestException(
        `File size too large. Maximum size is ${maxSizeMB}MB.`,
      );
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed.');
    }
  }
}
