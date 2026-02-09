const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// ================= REGISTER USER =================
const registerUser = async (req, res) => {
  try {
    const { name, email, no_phone, role_id, password } = req.body;

    if (!name || !email || !role_id || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, role_id, password wajib diisi"
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

    // UUID manual (simple)
    const id = crypto.randomUUID();

    await db.query(`
      INSERT INTO users
      (id, name, email, no_phone, agent_code, role_id, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name,
      email,
      no_phone || null,
      agent_code,
      role_id,
      hashedPassword
    ]);

    const [user] = await db.query(`
      SELECT p.*, r.nama_role
      FROM users p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = ?
    `, [id]);

    delete user[0].password;

    res.status(201).json({
      success: true,
      message: "Register berhasil",
      data: user[0]
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



// ================= LOGIN USER =================
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
        email: user.email,
        role_id: user.role_id,
        role_name: user.nama_role
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "24h" }
    );

    delete user.password;

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
  loginUser,
  logoutUser,
  getCurrentUser
};
