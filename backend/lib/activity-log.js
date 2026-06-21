const supabase = require('./supabase')

async function logActivity(user, action, entityType, details = {}) {
  const payload = {
    user_id: user?.id || null,
    user_email: user?.email || null,
    action,
    entity_type: entityType,
    entity_id: details.entityId ? String(details.entityId) : null,
    entity_date: details.entityDate || null,
    details: details.details || {}
  }

  const { error } = await supabase.from('activity_logs').insert(payload)
  if (error) {
    console.error('activity log failed:', error.message)
  }
}

module.exports = { logActivity }

