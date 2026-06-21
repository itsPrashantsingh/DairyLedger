const express = require('express')
const supabase = require('../lib/supabase')
const { requireUser } = require('../lib/auth')

const router = express.Router()

router.use(requireUser)

const ENTITY_GROUPS = {
  deliveries: ['deliveries', 'daily_entry_session'],
  production: ['production'],
  customers: ['customers'],
  cattle: ['cattle'],
  bills: ['bills'],
  payments: ['payments'],
  expenses: ['expenses'],
  products: ['products'],
  sales: ['sales'],
  reminders: ['reminders']
}

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300)
    const action = req.query.action
    const entityType = req.query.entityType

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (action) query = query.eq('action', action)
    if (entityType && ENTITY_GROUPS[entityType]) {
      query = query.in('entity_type', ENTITY_GROUPS[entityType])
    } else if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({ logs: data || [] })
  } catch (err) {
    next(err)
  }
})

module.exports = router
