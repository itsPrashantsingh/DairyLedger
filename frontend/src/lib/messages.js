import { getSettings } from './constants'
import { formatAmountPdf, formatPeriod } from './utils'

export const MESSAGE_KEYS = [
  'billMessage',
  'billPaySection',
  'reminderMessage',
  'paymentDueMessage',
  'paymentDuePaySuffix',
  'cashReceivedMessage'
]

export const MESSAGE_LABELS = {
  billMessage: 'Bill WhatsApp message (with PDF)',
  billPaySection: 'Bill message — payment link block (when Razorpay link exists)',
  reminderMessage: 'Payment reminder (Reminders page)',
  paymentDueMessage: 'Quick payment due (Dashboard / Bills)',
  paymentDuePaySuffix: 'Payment due — Razorpay suffix',
  cashReceivedMessage: 'Cash payment received'
}

export const MESSAGE_PLACEHOLDERS = {
  billMessage: '{name} {period} {billId} {amount} {paySection} {dairyName}',
  billPaySection: '{razorpayUrl}',
  reminderMessage: '{name} {month} {amount} {razorpayUrl} {dairyName}',
  paymentDueMessage: '{name} {amount} {paySuffix} {dairyName}',
  paymentDuePaySuffix: '{razorpayUrl}',
  cashReceivedMessage: '{name} {amount} {dairyName}'
}

export const MESSAGE_DEFAULTS = {
  billMessage: `Hi {name},

*Milk Bill — {period}*
Bill No: {billId}
Amount: *{amount}*
{paySection}
— {dairyName}`,
  billPaySection: `
*Pay online here:*
{razorpayUrl}
`,
  reminderMessage: `Hi {name} bhai, aapka {month} ka milk bill ₹{amount} abhi pending hai.
Please pay karo: {razorpayUrl}
— {dairyName} 🥛`,
  paymentDueMessage: `Hi {name} bhai, aapka milk bill {amount} pending hai.{paySuffix} — {dairyName} 🥛`,
  paymentDuePaySuffix: ` Pay: {razorpayUrl}`,
  cashReceivedMessage: `Hi {name} bhai, {amount} cash payment received ✓ — {dairyName}`
}

export function fillMessage(template, vars) {
  let msg = template
  for (const [key, val] of Object.entries(vars)) {
    msg = msg.split(`{${key}}`).join(val ?? '')
  }
  return msg.replace(/\n{3,}/g, '\n\n').trim()
}

export function getMessageTemplates() {
  const s = getSettings()
  const out = {}
  for (const key of MESSAGE_KEYS) {
    out[key] = s[key] || MESSAGE_DEFAULTS[key]
  }
  return out
}

export function buildBillWhatsAppMessage(customer, bill, razorpayUrl) {
  const dairy = getSettings()
  const templates = getMessageTemplates()
  const paySection = razorpayUrl
    ? fillMessage(templates.billPaySection, { razorpayUrl })
    : ''

  return fillMessage(templates.billMessage, {
    name: customer.name,
    period: formatPeriod(bill.period_start, bill.period_end),
    billId: bill.id,
    amount: formatAmountPdf(bill.total_amount),
    paySection,
    dairyName: dairy.dairyName
  })
}

export function buildReminderMessage(customer, totalDue, razorpayUrl) {
  const dairy = getSettings()
  const month = new Date().toLocaleDateString('en-IN', { month: 'long' })
  return fillMessage(getMessageTemplates().reminderMessage, {
    name: customer.name,
    month,
    amount: Number(totalDue).toLocaleString('en-IN'),
    razorpayUrl: razorpayUrl || 'cash/UPI',
    dairyName: dairy.dairyName
  })
}

export function buildPaymentDueMessage(customer, balance, razorpayUrl) {
  const dairy = getSettings()
  const templates = getMessageTemplates()
  const paySuffix = razorpayUrl
    ? fillMessage(templates.paymentDuePaySuffix, { razorpayUrl })
    : ''

  return fillMessage(templates.paymentDueMessage, {
    name: customer.name,
    amount: balance,
    paySuffix,
    dairyName: dairy.dairyName
  })
}

export function buildCashReceivedMessage(customer, amount) {
  const dairy = getSettings()
  return fillMessage(getMessageTemplates().cashReceivedMessage, {
    name: customer.name,
    amount,
    dairyName: dairy.dairyName
  })
}
