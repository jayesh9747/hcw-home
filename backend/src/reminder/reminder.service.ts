import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderType, ReminderStatus, REMINDER_TIMING, DEFAULT_REMINDER_TYPES } from './reminder.constants';
import { DatabaseService } from 'src/database/database.service';
import { ConfigService } from 'src/config/config.service';
import { SmsProviderService } from 'src/sms_provider/sms_provider.service';
import { WhatsappTemplateService } from 'src/whatsapp-template/whatsapp-template.service';
import { WhatsappTemplateSeederService } from 'src/whatsapp-template/whatsapp-template-seeder.service';
import { TwilioWhatsappService } from 'src/whatsapp-template/twilio-template.service';
import { ConsultationStatus, Prisma, ReminderStatus as PrismaReminderStatus, User } from '@prisma/client';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly smsProviderService: SmsProviderService,
  private readonly whatsappTemplateService: WhatsappTemplateService,
  private readonly whatsappTemplateSeederService: WhatsappTemplateSeederService,
  private readonly twilioWhatsappService: TwilioWhatsappService,
  ) {}

  /**
   * Schedule reminders for a consultation
   * @param consultationId The ID of the consultation
   * @param scheduledDate The scheduled date of the consultation
   * @param reminderTypes Types of reminders to schedule (default: 24h and 1h before)
   */
  async scheduleReminders(
    consultationId: number,
    scheduledDate: Date,
    reminderTypes: ReminderType[] = DEFAULT_REMINDER_TYPES,
  ): Promise<void> {
    this.logger.log(`Scheduling reminders for consultation ${consultationId}`);

    // First, cancel any existing reminders for this consultation
    await this.cancelReminders(consultationId);

    // Only schedule reminders if the consultation date is in the future
    if (scheduledDate <= new Date()) {
      this.logger.log(`Consultation date is in the past, not scheduling reminders`);
      return;
    }

    try {
      for (const reminderType of reminderTypes) {
        const reminderTime = new Date(scheduledDate.getTime() - REMINDER_TIMING[reminderType]);
        
        if (reminderTime <= new Date()) {
          this.logger.log(`Reminder time for ${reminderType} is in the past, skipping`);
          continue;
        }

        await this.db.consultationReminder.create({
          data: {
            consultationId,
            type: reminderType,
            scheduledFor: reminderTime,
            status: PrismaReminderStatus.PENDING,
          },
        });

        this.logger.log(`Scheduled ${reminderType} reminder for consultation ${consultationId} at ${reminderTime.toISOString()}`);
      }
    } catch (error) {
      this.logger.error(`Error scheduling reminders for consultation ${consultationId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all pending reminders for a consultation
   * @param consultationId The ID of the consultation
   */
  async cancelReminders(consultationId: number): Promise<void> {
    this.logger.log(`Cancelling reminders for consultation ${consultationId}`);

    try {
      await this.db.consultationReminder.updateMany({
        where: {
          consultationId,
          status: PrismaReminderStatus.PENDING,
        },
        data: {
          status: PrismaReminderStatus.CANCELLED,
        },
      });
    } catch (error) {
      this.logger.error(`Error cancelling reminders for consultation ${consultationId}:`, error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueReminders(): Promise<void> {
    this.logger.debug('Processing due reminders');

    try {

      const dueReminders = await this.db.consultationReminder.findMany({
        where: {
          status: PrismaReminderStatus.PENDING,
          scheduledFor: {
            lte: new Date(),
          },
        },
        include: {
          consultation: {
            include: {
              owner: true,
              participants: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${dueReminders.length} due reminders`);

      for (const reminder of dueReminders) {
        await this.processReminder(reminder);
      }
    } catch (error) {
      this.logger.error('Error processing due reminders:', error);
    }
  }

  /**
   * Process a single reminder
   * @param reminder The reminder to process
   */
  private async processReminder(reminder: any): Promise<void> {
    this.logger.log(`Processing reminder ${reminder.id} of type ${reminder.type} for consultation ${reminder.consultationId}`);

    try {
      // Verify that the consultation is still scheduled
      if (reminder.consultation.status !== ConsultationStatus.SCHEDULED) {
        this.logger.log(`Consultation ${reminder.consultationId} is no longer scheduled, cancelling reminder`);
        await this.markReminderAs(reminder.id, PrismaReminderStatus.CANCELLED);
        return;
      }

      // Verify that the scheduled date hasn't changed
      const scheduledDate = reminder.consultation.scheduledDate;
      if (!scheduledDate) {
        this.logger.log(`Consultation ${reminder.consultationId} has no scheduled date, cancelling reminder`);
        await this.markReminderAs(reminder.id, PrismaReminderStatus.CANCELLED);
        return;
      }

      // Send the reminder
      await this.sendReminder(reminder);

      // Mark the reminder as sent
      await this.markReminderAs(reminder.id, PrismaReminderStatus.SENT, new Date());

      // Update the consultation's remindersSent field
      await this.updateConsultationRemindersSent(reminder.consultationId, reminder.type);
    } catch (error) {
      this.logger.error(`Error processing reminder ${reminder.id}:`, error);
      await this.markReminderAs(reminder.id, PrismaReminderStatus.FAILED);
    }
  }

  /**
   * Send a reminder message
   * @param reminder The reminder to send
   */
  private async sendReminder(reminder: any): Promise<void> {
    const { consultation } = reminder;
    const practitioner = consultation.owner;
    
    // Find the patient in the participants
    const patientParticipant = consultation.participants.find(
      p => p.user.role === 'PATIENT'
    );

    if (!patientParticipant) {
      throw new Error(`No patient found for consultation ${consultation.id}`);
    }

    const patient = patientParticipant.user;

    // Format the consultation date for display
    const consultationDate = new Date(consultation.scheduledDate);
    const formattedDate = consultationDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const formattedTime = consultationDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send message to patient
    if (patient.phoneNumber) {
      await this.sendReminderMessage(
        patient,
        `Reminder: Your consultation with Dr. ${practitioner.lastName} is scheduled for ${formattedDate} at ${formattedTime}.`,
        consultation.messageService
      );
    }

    // Send message to practitioner
    if (practitioner.phoneNumber) {
      await this.sendReminderMessage(
        practitioner,
        `Reminder: Your consultation with ${patient.firstName} ${patient.lastName} is scheduled for ${formattedDate} at ${formattedTime}.`,
        consultation.messageService
      );
    }
  }

  /**
   * Send a reminder message to a user
   * @param user The user to send the message to
   * @param message The message text
   * @param messageService The message service to use
   */
  private async sendReminderMessage(
    user: User,
    message: string,
    messageService: any,
    reminderId?: number,
    reminderType?: string
  ): Promise<void> {
    if (!user.phoneNumber) {
      this.logger.warn(`User ${user.id} has no phone number, cannot send reminder`);
      return;
    }

    // Choose template key based on reminderType
    let templateKey = '';
    if (reminderType === 'UPCOMING_APPOINTMENT_24H') {
      templateKey = 'consultation_reminder_24h';
    } else if (reminderType === 'UPCOMING_APPOINTMENT_1H') {
      templateKey = 'consultation_reminder_1h';
    } else {
      templateKey = 'consultation_reminder_generic';
    }

    let sendStatus = 'FAILED';
    let templateSid = null;
    try {
      // Fetch template from SeederService (not WhatsappTemplateService)
      const template = await this.whatsappTemplateSeederService.getProcessedTemplate(templateKey);
      if (!template) {
        this.logger.error(`WhatsApp template not found for key: ${templateKey}`);
        throw new Error('WhatsApp template not found');
      }
      templateSid = template.sid;

      // Prepare variables for template (customize as needed)
      const variables = {
        patient_name: user.firstName,
        consultation_time: message, // fallback, ideally pass formatted time
      };

      // Send WhatsApp message using TwilioWhatsappService
      const result = await this.twilioWhatsappService.sendTemplateMessage({
        to: user.phoneNumber,
  templateSid: templateSid ?? '',
        variables,
      });
      sendStatus = result.status || 'SENT';
      this.logger.log(`WhatsApp reminder sent to ${user.phoneNumber} using template ${templateKey}`);
    } catch (error) {
      this.logger.error(`Error sending WhatsApp reminder to ${user.phoneNumber}:`, error);
      sendStatus = 'FAILED';
    }

    // Log template info and send status in DB
    if (reminderId) {
      await this.db.consultationReminder.update({
        where: { id: reminderId },
        data: {
          templateKey: templateKey ?? undefined,
          templateSid,
          sendStatus,
        },
      });
    }
  }

  /**
   * Mark a reminder with a specific status
   * @param reminderId The ID of the reminder
   * @param status The new status
   * @param sentAt Optional sent timestamp
   */
  private async markReminderAs(
    reminderId: number,
    status: PrismaReminderStatus,
    sentAt?: Date
  ): Promise<void> {
    try {
      await this.db.consultationReminder.update({
        where: { id: reminderId },
        data: {
          status,
          sentAt: status === PrismaReminderStatus.SENT ? sentAt : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Error updating reminder ${reminderId} status:`, error);
      throw error;
    }
  }

  /**
   * Update the consultation's remindersSent field
   * @param consultationId The ID of the consultation
   * @param reminderType The type of reminder that was sent
   */
  private async updateConsultationRemindersSent(
    consultationId: number,
    reminderType: string
  ): Promise<void> {
    try {
      const consultation = await this.db.consultation.findUnique({
        where: { id: consultationId },
        select: { remindersSent: true },
      });

      if (!consultation) {
        throw new Error(`Consultation ${consultationId} not found`);
      }

      const remindersSent = consultation.remindersSent as any || {};

      remindersSent[reminderType] = new Date().toISOString();

      await this.db.consultation.update({
        where: { id: consultationId },
        data: { remindersSent: remindersSent as Prisma.InputJsonValue },
      });
    } catch (error) {
      this.logger.error(`Error updating consultation ${consultationId} remindersSent:`, error);
      throw error;
    }
  }
}
