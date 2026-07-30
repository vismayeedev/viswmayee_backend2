import { Notification, NotificationRecipient, User } from '../models';
import { logger } from '../utils/logger';

export class NotificationService {
  async createNotification(data: {
    title: string;
    message: string;
    channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'ALL';
    senderId?: string;
    recipientIds: string[];
  }) {
    logger.info(`Creating notification: "${data.title}" via ${data.channel} for ${data.recipientIds.length} users`);

    // Create Notification record in database
    const notification = await Notification.create({
      title: data.title,
      message: data.message,
      channel: data.channel,
      senderId: data.senderId,
    });

    // Create recipients association
    const recipientRelations = data.recipientIds.map((id) => ({
      notificationId: notification.id,
      recipientId: id,
    }));

    await NotificationRecipient.insertMany(recipientRelations);

    // Dispatch asynchronous notification integrations
    for (const id of data.recipientIds) {
      const recipientUser = await User.findById(id);
      if (!recipientUser) continue;

      if (data.channel === 'EMAIL' || data.channel === 'ALL') {
        this.sendEmail(recipientUser.email, data.title, data.message);
      }
      if (data.channel === 'SMS' || data.channel === 'ALL') {
        if (recipientUser.phone) {
          this.sendSMS(recipientUser.phone, `${data.title}: ${data.message}`);
        }
      }
      if (data.channel === 'PUSH' || data.channel === 'ALL') {
        this.sendPushNotification(recipientUser.id, data.title, data.message);
      }
    }

    return notification;
  }

  async markAsRead(recipientId: string, recipientRelationId: string) {
    return NotificationRecipient.findOneAndUpdate(
      { _id: recipientRelationId, recipientId },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );
  }

  async getNotifications(recipientId: string) {
    const recipients = await NotificationRecipient.find({ recipientId })
      .populate({
        path: 'notification',
        populate: {
          path: 'sender',
          select: 'firstName lastName role',
        },
      });

    // Sort programmatically by notification's createdAt descending
    recipients.sort((a: any, b: any) => {
      const dateA = a.notification ? new Date(a.notification.createdAt).getTime() : 0;
      const dateB = b.notification ? new Date(b.notification.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return recipients;
  }

  private sendEmail(to: string, subject: string, text: string) {
    logger.info(`[SMTP EMAIL MOCK] To: ${to} | Subject: ${subject} | Body: ${text}`);
  }

  private sendSMS(phone: string, text: string) {
    logger.info(`[SMS GATEWAY MOCK] To: ${phone} | Body: ${text}`);
  }

  private sendPushNotification(userId: string, title: string, text: string) {
    logger.info(`[WEB PUSH MOCK] UserID: ${userId} | Title: ${title} | Body: ${text}`);
  }
}
