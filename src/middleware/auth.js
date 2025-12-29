const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: 'Token tidak ditemukan'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token dengan Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({
        code: 401,
        message: 'Token tidak valid atau telah kadaluarsa'
      });
    }

    // Simpan user di req untuk digunakan di controller
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      code: 500,
      message: 'Autentikasi gagal'
    });
  }
};

module.exports = { authenticate };