export interface PushNotificationData {
  title: string;
  body: string;
  topic?: string;
  icon?: string;
}

class AppwritePushService {
  private projectId: string;
  private endpoint: string;

  constructor() {
    this.projectId = "69a4a8c0000576de77cf";
    this.endpoint = "https://nyc.cloud.appwrite.io/v1";
  }

  async sendPushNotification(data: PushNotificationData): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/channels/push/providers/fcm/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': this.projectId,
        },
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          topics: [data.topic || 'orders'],
          icon: data.icon || '/foodfactory.svg',
          color: '#ea580c',
          sound: 'default',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Push notification failed:', response.status, errorText);
        return false;
      }

      console.log('Push notification sent:', data.title);
      return true;
    } catch (error) {
      console.warn('Push notification error:', error);
      return false;
    }
  }

  async notifyNewOrder(orderNumber: string, items: string[]): Promise<boolean> {
    const itemList = items.slice(0, 3).join(", ");
    const moreText = items.length > 3 ? ` +${items.length - 3} more` : "";
    
    return this.sendPushNotification({
      title: "New Order Received! 🍔",
      body: `Order #${orderNumber}: ${itemList}${moreText}`,
      topic: "orders",
    });
  }

  async notifyOrderReady(orderNumber: string): Promise<boolean> {
    return this.sendPushNotification({
      title: "Order Ready! 🎉",
      body: `Order #${orderNumber} is ready for pickup/delivery`,
      topic: "orders",
    });
  }

  async notifyOrderConfirmed(orderNumber: string, grandTotal: number): Promise<boolean> {
    return this.sendPushNotification({
      title: "Order Confirmed! ✅",
      body: `Order #${orderNumber} confirmed. Total: ₹${grandTotal.toFixed(2)}`,
      topic: "orders",
    });
  }

  async notifyPaymentReceived(orderNumber: string, amount: number): Promise<boolean> {
    return this.sendPushNotification({
      title: "Payment Received! 💰",
      body: `Payment of ₹${amount.toFixed(2)} received for Order #${orderNumber}`,
      topic: "orders",
    });
  }

  async notifyDelivery(orderNumber: string, message: string): Promise<boolean> {
    return this.sendPushNotification({
      title: "Delivery Update 🚗",
      body: `Order #${orderNumber}: ${message}`,
      topic: "delivery",
    });
  }

  async notifyKitchen(orderNumber: string, items: string[]): Promise<boolean> {
    return this.sendPushNotification({
      title: "New Kitchen Order 👨‍🍳",
      body: `Order #${orderNumber}: ${items.join(", ")}`,
      topic: "kitchen",
    });
  }

  async notifyPromo(title: string, body: string): Promise<boolean> {
    return this.sendPushNotification({
      title,
      body,
      topic: "all_users",
    });
  }
}

export const appwritePush = new AppwritePushService();
