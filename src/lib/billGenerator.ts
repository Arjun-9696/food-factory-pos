/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";

interface BillItem {
  name: string;
  price: number;
  quantity: number;
}

interface BillData {
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  address?: string;
}

export function generateBillHTML(data: BillData): string {
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto; padding: 20px;">
      <div style="background: #ea580c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <div style="font-size: 32px; font-weight: bold;">FF</div>
        <div style="font-size: 20px; font-weight: bold;">Food Factory</div>
        <div style="font-size: 10px; opacity: 0.8;">THE QUALITY TASTE</div>
      </div>
      
      <div style="background: #f9fafb; padding: 15px; border-radius: 0 0 8px 8px;">
        <div style="font-size: 14px; font-weight: bold;">Order #${data.orderNumber}</div>
        <div style="font-size: 10px; color: #6b7280;">${dateStr} at ${timeStr}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left; font-size: 10px; color: #6b7280;">ITEM</th>
            <th style="padding: 8px; font-size: 10px; color: #6b7280;">QTY</th>
            <th style="padding: 8px; font-size: 10px; color: #6b7280; text-align: right;">RATE</th>
            <th style="padding: 8px; font-size: 10px; color: #6b7280; text-align: right;">AMT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px;">
        <div style="display: flex; justify-content: space-between; padding: 3px 0;">
          <span style="color: #6b7280;">Subtotal</span>
          <span>₹${data.subtotal.toFixed(2)}</span>
        </div>
        ${data.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #16a34a;">
          <span>Discount</span>
          <span>-₹${data.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding: 3px 0;">
          <span style="color: #6b7280;">GST (5%)</span>
          <span>₹${data.gst.toFixed(2)}</span>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 8px 0;"></div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 18px; font-weight: bold; color: #ea580c;">
          <span>TOTAL</span>
          <span>₹${data.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #ea580c;">
        <div style="font-size: 16px; font-weight: bold;">Thank You!</div>
        <div style="font-size: 10px; color: #6b7280;">For choosing Food Factory</div>
        <div style="font-size: 9px; color: #9ca3af; margin-top: 10px;">Visit us: foodfactoryonline.com</div>
      </div>

      <div style="background: #ea580c; color: white; padding: 10px; text-align: center; margin-top: 15px; border-radius: 8px;">
        <div style="font-size: 9px;">Food Factory - The Quality Taste</div>
      </div>
    </div>
  `;
}

export function downloadBillPDF(data: BillData): void {
  try {
    const html = generateBillHTML(data);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.print();
          }
        }
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 250);
    }
  } catch (error) {
    console.error("PDF download error:", error);
    throw error;
  }
}
