/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PushNotificationData {
  title: string;
  body: string;
  topic?: string;
  icon?: string;
}

class BrowserNotificationService {
  async requestPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !(window as any).Notification) {
      return false;
    }
    
    if ((window as any).Notification.permission === "granted") {
      return true;
    }
    
    const permission = await (window as any).Notification.requestPermission();
    return permission === "granted";
  }

  async show(data: PushNotificationData): Promise<boolean> {
    if ((window as any).Notification.permission !== "granted") {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    try {
      new (window as any).Notification(data.title, {
        body: data.body,
        icon: data.icon || "/foodfactory.svg",
        badge: "/foodfactory.svg",
        tag: "food-factory-order",
      });
      return true;
    } catch {
      return false;
    }
  }

  playSound(): void {
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }

  async notifyOrderConfirmed(orderNumber: string, grandTotal: number): Promise<boolean> {
    this.playSound();
    return this.show({
      title: "Order Confirmed! ✅",
      body: `Order #${orderNumber} - Total: ₹${grandTotal.toFixed(2)}`,
    });
  }

  async notifyOrderReady(orderNumber: string): Promise<boolean> {
    this.playSound();
    return this.show({
      title: "Order Ready! 🎉",
      body: `Order #${orderNumber} is ready for pickup!`,
    });
  }

  async notifyPaymentReceived(orderNumber: string, amount: number): Promise<boolean> {
    this.playSound();
    return this.show({
      title: "Payment Received! 💰",
      body: `Payment of ₹${amount} received for Order #${orderNumber}`,
    });
  }
}

export const browserNotification = new BrowserNotificationService();
