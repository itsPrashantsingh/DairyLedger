import { generateBill, generateProductSaleBill } from './pdf'
import { whatsappLink, cleanPhone } from './utils'
import { buildBillWhatsAppMessage, buildProductSaleWhatsAppMessage } from './messages'

function validatePhone(customer) {
  const phone = cleanPhone(customer?.whatsapp_no)
  if (phone.length < 10) throw new Error(`Invalid phone for ${customer?.name}`)
  return phone
}

/**
 * Share bill on WhatsApp.
 * Mobile: native share sheet attaches PDF automatically.
 * Desktop: downloads PDF + opens WhatsApp (user attaches manually).
 */
export async function shareBillOnWhatsApp(customer, entries, bill, razorpayUrl) {
  validatePhone(customer)
  const message = buildBillWhatsAppMessage(customer, bill, razorpayUrl)
  const doc = generateBill(customer, entries, bill)
  const filename = `${bill.id}-${customer.name.replace(/\s+/g, '_')}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: `Bill ${bill.id}`,
        text: message,
        files: [file]
      })
      return { method: 'share', success: true, attached: true }
    } catch (err) {
      if (err.name === 'AbortError') return { method: 'share', success: false, cancelled: true }
    }
  }

  doc.save(filename)
  window.open(whatsappLink(customer.whatsapp_no, message), '_blank')
  return { method: 'download', success: true, attached: false }
}

export function sendReminderWhatsApp(customer, message) {
  validatePhone(customer)
  window.open(whatsappLink(customer.whatsapp_no, message), '_blank')
}

export async function shareProductSaleOnWhatsApp(sale) {
  const phone = cleanPhone(sale?.buyer_phone)
  if (phone.length < 10) throw new Error(`Invalid phone for ${sale?.buyer_name}`)

  const message = buildProductSaleWhatsAppMessage(sale)
  const doc = generateProductSaleBill(sale)
  const filename = `${sale.invoice_no}-${sale.buyer_name.replace(/\s+/g, '_')}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: `Bill ${sale.invoice_no}`,
        text: message,
        files: [file]
      })
      return { method: 'share', success: true, attached: true }
    } catch (err) {
      if (err.name === 'AbortError') return { method: 'share', success: false, cancelled: true }
    }
  }

  doc.save(filename)
  window.open(whatsappLink(phone, message), '_blank')
  return { method: 'download', success: true, attached: false }
}

export { buildBillWhatsAppMessage } from './messages'
