import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Sample } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    func(...args);
  };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateSampleInvoice(sample: Sample): void {
  const total = sample.kitPrice;
  const subtotal = Math.round(total / 1.05);
  const tax = total - subtotal;

  const itemRows = `
      <tr style="background:#f9fafb">
        <td style="padding:6px 10px;font-size:11px;color:#374151">Sample Request — Vegnar Green Eco Products (Sugarcane Bagasse Tableware)</td>
        <td style="padding:6px 10px;font-size:11px;color:#374151;text-align:center">1</td>
        <td style="padding:6px 10px;font-size:11px;color:#374151;text-align:right">₹${subtotal.toLocaleString('en-IN')}</td>
        <td style="padding:6px 10px;font-size:11px;color:#374151;text-align:right">₹${subtotal.toLocaleString('en-IN')}</td>
      </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${sample.sampleNo} - Vegnar Green</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:A4 portrait;margin:6mm 8mm}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#e5e7eb;color:#111827}
    .print-btn{text-align:center;padding:10px;background:#e5e7eb}
    .page{width:100%;max-width:720px;background:#fff;margin:12px auto;display:flex;flex-direction:column;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
    .header{background:linear-gradient(135deg,#166534 0%,#15803d 60%,#16a34a 100%);padding:14px 22px;display:flex;justify-content:space-between;align-items:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .logo-area{display:flex;align-items:center;gap:10px}
    .logo-img{width:34px;height:34px;object-fit:contain;background:#fff;border-radius:5px;padding:2px}
    .brand-name{color:#fff;font-size:16px;font-weight:700;letter-spacing:.5px}
    .brand-tagline{color:#bbf7d0;font-size:9px;margin-top:1px}
    .invoice-label{text-align:right}
    .invoice-label h2{font-size:19px;font-weight:800;letter-spacing:1px;color:#fff}
    .invoice-label p{font-size:10px;color:#bbf7d0;margin-top:2px}
    .green-bar{height:3px;background:linear-gradient(90deg,#4ade80,#166534);-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .body{padding:10px 22px;display:flex;flex-direction:column;gap:8px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .meta-box h4{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;margin-bottom:4px}
    .meta-box p{font-size:10px;color:#111827;line-height:1.5}
    .meta-box .highlight{font-size:11px;font-weight:600;color:#166534}
    .status-badge{display:inline-block;background:#dcfce7;color:#166534;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid #86efac;margin-top:3px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#166534;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    thead th{padding:5px 9px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#fff;text-align:left}
    thead th:last-child,thead th:nth-child(3){text-align:right}
    thead th:nth-child(2){text-align:center}
    tbody tr:nth-child(even){background:#f9fafb;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    tbody td{padding:5px 9px;font-size:10px;color:#374151}
    .totals{display:flex;justify-content:flex-end}
    .totals-box{width:200px}
    .totals-row{display:flex;justify-content:space-between;padding:3px 0;font-size:10px;color:#374151;border-bottom:1px solid #f3f4f6}
    .totals-row.total{font-size:12px;font-weight:700;color:#166534;border-bottom:none;padding-top:4px}
    .payment-info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:8px 11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .payment-info h4{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#166534;margin-bottom:4px;font-weight:700}
    .payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px}
    .payment-grid p{font-size:10px;color:#374151}
    .payment-grid span{font-weight:600;color:#111827}
    .note{background:#fffbeb;border:1px solid #fde68a;border-radius:5px;padding:8px 12px;font-size:10px;color:#92400e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:6px 22px;display:flex;justify-content:space-between;align-items:center;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid;page-break-before:avoid}
    .footer p{font-size:8px;color:#9ca3af;white-space:nowrap}
    .footer .eco{font-size:8px;color:#166534;font-weight:600;white-space:nowrap}
    @media print{
      body{background:#fff;margin:0}
      .print-btn{display:none!important}
      .page{margin:0;max-width:100%;border-radius:0;box-shadow:none;page-break-inside:avoid}
      *{page-break-inside:avoid}
    }
  </style>
</head>
<body>
  <div class="print-btn">
    <button onclick="window.print()" style="background:#166534;color:#fff;border:none;padding:8px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px">🖨️ Print / Save PDF</button>
    <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;padding:8px 18px;border-radius:6px;font-size:13px;cursor:pointer">Close</button>
  </div>
  <div class="page">
    <div class="header">
      <div class="logo-area">
        <img src="/assets/img/vegnar-green.png" alt="Vegnar Green" class="logo-img" onerror="this.style.display='none'"/>
        <div>
          <div class="brand-name">Vegnar Green</div>
          <div class="brand-tagline">Sustainable Tableware Solutions</div>
        </div>
      </div>
      <div class="invoice-label">
        <h2>INVOICE</h2>
        <p>#${sample.sampleNo}</p>
      </div>
    </div>
    <div class="green-bar"></div>
    <div class="body">
      <div class="meta-grid">
        <div class="meta-box">
          <h4>Bill To</h4>
          <p class="highlight">${sample.customerName}</p>
          ${sample.customerEmail ? `<p>${sample.customerEmail}</p>` : ''}
          ${sample.customerPhone ? `<p>${sample.customerPhone}</p>` : ''}
          ${sample.customerAddress ? `<p>${sample.customerAddress}</p>` : ''}
          ${sample.userType === 'company' && sample.gstNumber ? `<p style="margin-top:6px;font-size:11px"><strong>GST:</strong> ${sample.gstNumber}</p>` : ''}
          ${sample.userType === 'customer' && sample.panNumber ? `<p style="margin-top:6px;font-size:11px"><strong>PAN:</strong> ${sample.panNumber}</p>` : ''}
          ${sample.userType === 'customer' && !sample.panNumber ? `<p style="margin-top:6px;font-size:11px;color:#6b7280"><strong>Type:</strong> Individual</p>` : ''}
          ${sample.userType === 'company' ? `<p style="margin-top:6px;font-size:11px;color:#6b7280"><strong>Type:</strong> Business</p>` : ''}
        </div>
        <div class="meta-box" style="text-align:right">
          <h4>Invoice Details</h4>
          <p><strong>Date:</strong> ${new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(sample.sentDate))}</p>
          <p><strong>Invoice No:</strong> ${sample.sampleNo}</p>
          ${sample.orderId ? `<p><strong>Order ID:</strong> ${sample.orderId}</p>` : ''}
          <div class="status-badge">✓ PAID</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Unit Price</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
          <div class="totals-row"><span>GST (5%)</span><span>₹${tax.toLocaleString('en-IN')}</span></div>
          <div class="totals-row total"><span>Total Paid</span><span>₹${total.toLocaleString('en-IN')}</span></div>
        </div>
      </div>

      <div class="payment-info">
        <h4>Payment Information</h4>
        <div class="payment-grid">
          ${sample.paymentId ? `<p>Payment ID: <span>${sample.paymentId}</span></p>` : ''}
          ${sample.orderId ? `<p>Order ID: <span>${sample.orderId}</span></p>` : ''}
          <p>Method: <span>Razorpay</span></p>
          <p>Status: <span style="color:#166534">✓ Successful</span></p>
        </div>
      </div>

      <div class="note">
        <strong>Note:</strong> Computer-generated invoice. Contact <strong>connect@vegnar.com</strong> or <strong>+91 90333 31031</strong>.
      </div>
    </div>
    <div class="footer">
      <div>
        <p>Vegnar Green | connect@vegnar.com | +91 90333 31031</p>
        <p>www.vegnar.com</p>
      </div>
      <div class="eco">🌿 100% Eco-Friendly Products</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${sample.sampleNo}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function generateInvoiceNumber(prefix: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');
  return `${prefix}${timestamp}${random}`;
}
