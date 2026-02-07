const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Create new user (Register)
const registerUser = async (req, res) => {
  try {
    const { name, email, no_phone, role_id, password } = req.body;

    // Validasi input
    if (!name || !email || !role_id || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, role_id, dan password wajib diisi"
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar"
      });
    }

    // Cek apakah role_id valid
    const roleExists = await prisma.role.findUnique({
      where: { id: role_id }
    });

    if (!roleExists) {
      return res.status(404).json({
        success: false,
        message: "Role tidak ditemukan"
      });
    }

    let agent_code = null;

    // Generate agent code jika role_id = 2 (Agent)
    if (role_id === 2) {
      let isUnique = false;

      while (!isUnique) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
        let randomPart = '';

        for (let i = 0; i < 6; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const randomCode = `AG-${randomPart}`;

        const existingAgent = await prisma.user.findUnique({
          where: { agent_code: randomCode }
        });

        if (!existingAgent) {
          agent_code = randomCode;
          isUnique = true;
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        no_phone: no_phone || null,
        agent_code,
        role_id,
        password: hashedPassword
      },
      include: {
        role: true
      }
    });

    // Remove password dari response
    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      success: true,
      message: "Berhasil membuat user baru",
      data: userWithoutPassword
    });
  } catch (error) {
    console.error("Error in create user:", error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: `${error.meta.target[0]} sudah digunakan`
      });
    }

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi"
      });
    }

    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true
      }
    });

    // Cek apakah user ada
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah"
      });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role.nama_role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    // Remove password dari response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error("Error in login user:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message
    });
  }
};

// Logout user
const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout berhasil"
    });
  } catch (error) {
    console.error("Error in logout user:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message
    });
  }
};

// Get current user (dari token)
const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    // Remove password dari response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan data user",
      data: userWithoutPassword
    });
  } catch (error) {
    console.error("Error in get current user:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
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