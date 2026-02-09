const db = require("../config/db");
const bcrypt = require("bcrypt");


// ================= GET ALL USERS =================
const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.*, r.nama_role 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      message: "Berhasil mengambil seluruh data users",
      data: users
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};



// ================= GET USER BY ID =================
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [user] = await db.query(`
      SELECT u.*, r.nama_role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [id]);

    if (!user.length) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Berhasil mendapatkan data user",
      data: user[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};



// ================= UPDATE USER =================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, no_phone, agent_code, nasabah_code, role_id, password } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM users WHERE id = ?", [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await db.query(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        no_phone = COALESCE(?, no_phone),
        agent_code = COALESCE(?, agent_code),
        nasabah_code = COALESCE(?, nasabah_code),
        role_id = COALESCE(?, role_id),
        password = COALESCE(?, password),
        updated_at = NOW()
      WHERE id = ?
    `, [
      name,
      email,
      no_phone,
      agent_code,
      nasabah_code,
      role_id,
      hashedPassword,
      id
    ]);

    res.json({
      success: true,
      message: "Berhasil mengupdate user"
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



// ================= DELETE USER =================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [credits] = await db.query(
      "SELECT id FROM credit_application WHERE users_id = ?", [id]
    );

    const [statuses] = await db.query(
      "SELECT id FROM application_status WHERE changed_by = ?", [id]
    );

    if (credits.length || statuses.length) {
      return res.status(400).json({
        success: false,
        message: "User memiliki data terkait"
      });
    }

    await db.query("DELETE FROM users WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "User berhasil dihapus"
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



// ================= GET USER BY ROLE =================
const getUsersByRole = async (req, res) => {
  try {
    const { role_id } = req.params;

    const [users] = await db.query(`
      SELECT u.*, r.nama_role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.role_id = ?
      ORDER BY u.created_at DESC
    `, [role_id]);

    res.json({
      success: true,
      message: "Berhasil mengambil users berdasarkan role",
      data: users
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
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByRole
};
