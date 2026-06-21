const supabase = require('./supabase')

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

async function requireUser(req, res, next) {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Missing auth token' })

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid auth token' })
    }

    req.user = {
      id: data.user.id,
      email: data.user.email || data.user.user_metadata?.email || 'unknown'
    }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { requireUser }

