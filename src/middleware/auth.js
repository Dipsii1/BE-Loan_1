const jwt = require('jsonwebtoken');

// ===============================
// AUTHENTICATE TOKEN
// ===============================
const authenticateToken = (req, res, next) => {
  try {
    // 1️⃣ Validasi secret
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET belum diset');
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi server tidak lengkap',
      });
    }

    // 2️⃣ Ambil token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan. Silakan login terlebih dahulu',
      });
    }

    // 3️⃣ Verifikasi token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token sudah expired. Silakan login kembali',
          });
        }

        return res.status(403).json({
          success: false,
          message: 'Token tidak valid',
        });
      }

      // 4️⃣ Simpan payload
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Authenticate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
    });
  }
};

// ===============================
// AUTHORIZE ROLE
// ===============================
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Silakan login terlebih dahulu',
      });
    }

    // Normalisasi role biar aman
    const userRole = String(req.user.role_name || '').toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role yang diizinkan: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
};