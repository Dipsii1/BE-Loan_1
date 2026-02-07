const jwt = require('jsonwebtoken');

// Middleware untuk autentikasi token
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan. Silakan login terlebih dahulu"
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: "Token sudah expired. Silakan login kembali"
          });
        }
        
        return res.status(403).json({
          success: false,
          message: "Token tidak valid"
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Error in authenticate token:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message
    });
  }
};

// Middleware untuk autorisasi berdasarkan role
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Silakan login terlebih dahulu"
      });
    }

    const hasRole = allowedRoles.includes(req.user.role_name);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role yang diizinkan: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};