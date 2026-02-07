const prisma = require('../config/prisma');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil seluruh data users",
      data: users
    });
  } catch (error) {
    console.error("Error in get all users:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};

// Get user by id
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id
      },
      include: {
        role: true,
        credits: {
          include: {
            statuses: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan data user",
      data: user
    });
  } catch (error) {
    console.error("Error in get user by id:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message
    });
  }
};



// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, no_phone, agent_code, nasabah_code, role_id, password } = req.body;

    // Cek apakah user ada
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    // Prepare update data
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (no_phone !== undefined) updateData.no_phone = no_phone;
    if (agent_code !== undefined) updateData.agent_code = agent_code;
    if (nasabah_code !== undefined) updateData.nasabah_code = nasabah_code;
    if (role_id) {
      // Validasi role_id
      const roleExists = await prisma.role.findUnique({
        where: { id: role_id }
      });
      
      if (!roleExists) {
        return res.status(404).json({
          success: false,
          message: "Role tidak ditemukan"
        });
      }
      updateData.role_id = role_id;
    }
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true
      }
    });

    // Remove password dari response
    const { password: _, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      message: "Berhasil mengupdate user",
      data: userWithoutPassword
    });
  } catch (error) {
    console.error("Error in update user:", error);
    
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

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah user ada
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        credits: true,
        statuses: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    // Cek apakah user memiliki credit applications
    if (existingUser.credits.length > 0 || existingUser.statuses.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User tidak dapat dihapus karena memiliki data terkait (credit applications atau status changes)"
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil menghapus user"
    });
  } catch (error) {
    console.error("Error in delete user:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message
    });
  }
};

// Get users by role
const getUsersByRole = async (req, res) => {
  try {
    const { role_id } = req.params;

    const users = await prisma.user.findMany({
      where: {
        role_id: parseInt(role_id)
      },
      include: {
        role: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil data users berdasarkan role",
      data: users
    });
  } catch (error) {
    console.error("Error in get users by role:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message
    });
  }
};


module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByRole
};