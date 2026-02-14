const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../config/nodemailer');


// ================= REGISTER USER (dengan Email Verification) =================
const registerUser = async (req, res) => {
  try {
    const { name, email, no_phone, role_id, password } = req.body;

    if (!name || !email || !role_id || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, role_id, password wajib diisi"
      });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid"
      });
    }

    // Cek email
    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar"
      });
    }

    // Cek role
    const [role] = await db.query(
      "SELECT id FROM roles WHERE id = ?",
      [role_id]
    );

    if (!role.length) {
      return res.status(404).json({
        success: false,
        message: "Role tidak ditemukan"
      });
    }

    // Generate agent code
    let agent_code = null;

    if (role_id === 2) {
      let unique = false;

      while (!unique) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
        let randomPart = "";

        for (let i = 0; i < 6; i++) {
          randomPart += chars[Math.floor(Math.random() * chars.length)];
        }

        const code = `AG-${randomPart}`;

        const [check] = await db.query(
          "SELECT id FROM users WHERE agent_code = ?",
          [code]
        );

        if (!check.length) {
          agent_code = code;
          unique = true;
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    //  Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam

    // UUID manual (simple)
    const id = crypto.randomUUID();

    await db.query(`
      INSERT INTO users
      (id, name, email, no_phone, agent_code, role_id, password, 
       email_verified, verification_token, verification_token_expires)
      VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)
    `, [
      id,
      name,
      email,
      no_phone || null,
      agent_code,
      role_id,
      hashedPassword,
      verificationToken,
      tokenExpires
    ]);

    //  Kirim email verifikasi
    const emailResult = await sendVerificationEmail(email, name, verificationToken);

    if (!emailResult.success) {
      console.error('⚠️ Failed to send verification email:', emailResult.error);
      // Tetap lanjut registrasi meski email gagal
    }

    res.status(201).json({
      success: true,
      message: "Register berhasil. Silakan cek email Anda untuk verifikasi.",
      data: {
        id: id,
        name: name,
        email: email,
        email_verified: false,
        message: "Email verifikasi telah dikirim"
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


//  VERIFY EMAIL
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token verifikasi tidak ditemukan"
      });
    }

    // Cari user dengan token yang valid
    const [users] = await db.query(`
      SELECT id, name, email, verification_token_expires
      FROM users
      WHERE verification_token = ? AND email_verified = FALSE
    `, [token]);

    if (!users.length) {
      return res.status(400).json({
        success: false,
        message: "Token tidak valid atau email sudah diverifikasi"
      });
    }

    const user = users[0];

    // Cek apakah token expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({
        success: false,
        message: "Token verifikasi sudah kadaluarsa. Silakan request token baru."
      });
    }

    // Update user sebagai verified
    await db.query(`
      UPDATE users
      SET email_verified = TRUE,
          verification_token = NULL,
          verification_token_expires = NULL
      WHERE id = ?
    `, [user.id]);

    res.json({
      success: true,
      message: "Email berhasil diverifikasi. Anda sekarang bisa login.",
      data: {
        email: user.email,
        verified: true
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


//  RESEND VERIFICATION EMAIL
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi"
      });
    }

    const [users] = await db.query(`
      SELECT id, name, email, email_verified, verification_token_expires
      FROM users
      WHERE email = ?
    `, [email]);

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "Email tidak ditemukan"
      });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: "Email sudah diverifikasi"
      });
    }

    //  Cek apakah user baru saja request (rate limiting sederhana)
    if (user.verification_token_expires) {
      const timeDiff = new Date(user.verification_token_expires) - new Date();
      const minutesLeft = Math.floor(timeDiff / 60000);
      
      // Jika token masih valid lebih dari 23 jam, berarti baru saja di-request
      if (minutesLeft > 1380) { // 23 jam = 1380 menit
        return res.status(429).json({
          success: false,
          message: "Tunggu beberapa saat sebelum request ulang. Cek folder spam Anda."
        });
      }
    }

    // Generate token baru
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam

    await db.query(`
      UPDATE users
      SET verification_token = ?,
          verification_token_expires = ?
      WHERE id = ?
    `, [verificationToken, tokenExpires, user.id]);

    // Kirim email
    await sendVerificationEmail(user.email, user.name, verificationToken);

    res.json({
      success: true,
      message: "Email verifikasi telah dikirim ulang. Silakan cek inbox Anda."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// ================= LOGIN USER (dengan cek verifikasi) =================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi"
      });
    }

    const [rows] = await db.query(`
      SELECT p.*, r.nama_role
      FROM users p
      JOIN roles r ON p.role_id = r.id
      WHERE p.email = ?
    `, [email]);

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah"
      });
    }

    const user = rows[0];

    // Cek apakah email sudah diverifikasi
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: "Email belum diverifikasi. Silakan cek inbox Anda atau request email verifikasi baru.",
        email_verified: false
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.nama_role
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "24h" }
    );

    delete user.password;
    delete user.verification_token;
    delete user.verification_token_expires;

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// ================= LOGOUT =================
const logoutUser = async (req, res) => {
  res.json({
    success: true,
    message: "Logout berhasil"
  });
};


// ================= GET CURRENT USER =================
const getCurrentUser = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, r.nama_role
      FROM users p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = ?
    `, [req.user.id]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    delete rows[0].password;
    delete rows[0].verification_token;
    delete rows[0].verification_token_expires;

    res.json({
      success: true,
      message: "Berhasil ambil user",
      data: rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


module.exports = {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  logoutUser,
  getCurrentUser
};