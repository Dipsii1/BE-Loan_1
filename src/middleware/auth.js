const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Token tidak ditemukan',
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data || !data.user) {
      return res.status(401).json({
        message: 'Token tidak valid atau kadaluarsa',
      })
    }

    // simpan user untuk dipakai di controller / prisma
    req.user = {
      id: data.user.id,
      email: data.user.email,
    }

    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(500).json({
      message: 'Autentikasi gagal',
    })
  }
}

module.exports = { authenticate }
