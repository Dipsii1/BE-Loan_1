const db = require("../config/db");


// ================= GET ALL APPLICATIONS =================
const getAllApplications = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT ca.*, p.name, p.email, r.nama_role
      FROM credit_application ca
      LEFT JOIN users p ON ca.users_id = p.id
      LEFT JOIN roles r ON p.role_id = r.id
      ORDER BY ca.created_at DESC
    `);

    res.json({
      success: true,
      message: "Data pengajuan kredit berhasil ditemukan",
      data
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



// ================= GET APPLICATION BY USER =================
const getApplicationsByUser = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT *
      FROM credit_application
      WHERE users_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      message: "Data pengajuan kredit berhasil ditemukan",
      data
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



// ================= GET APPLICATION BY ID =================
const getApplicationById = async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.query(`
      SELECT ca.*, p.name, p.email
      FROM credit_application ca
      LEFT JOIN users p ON ca.users_id = p.id
      WHERE ca.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan"
      });
    }

    const data = rows[0];

    if (req.user.role_name !== "Admin" && data.users_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Tidak punya akses"
      });
    }

    res.json({
      success: true,
      message: "Data ditemukan",
      data
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



// ================= CREATE APPLICATION =================
const createApplication = async (req, res) => {
  try {
    const {
      nik,
      nama_lengkap,
      alamat,
      tempat_lahir,
      tanggal_lahir,
      jenis_kredit,
      plafond,
      jaminan
    } = req.body;

    const userId = req.user.id;
    const email = req.user.email;

    // Generate kode_pengajuan
    const [last] = await db.query(`
      SELECT kode_pengajuan
      FROM credit_application
      WHERE kode_pengajuan LIKE 'L-%'
      ORDER BY id DESC
      LIMIT 1
    `);

    let nextNumber = 1;
    if (last.length) {
      const num = parseInt(last[0].kode_pengajuan.replace("L-", ""));
      if (!isNaN(num)) nextNumber = num + 1;
    }

    const kode_pengajuan = `L-${String(nextNumber).padStart(4, "0")}`;

    // Insert application
    const [result] = await db.query(`
      INSERT INTO credit_application
      (kode_pengajuan, nik, nama_lengkap, alamat,
      tempat_lahir, tanggal_lahir, email,
      jenis_kredit, plafond, jaminan, users_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      kode_pengajuan,
      nik,
      nama_lengkap,
      alamat,
      tempat_lahir,
      tanggal_lahir,
      email,
      jenis_kredit,
      plafond,
      jaminan,
      userId
    ]);

    // Insert initial status
    await db.query(`
      INSERT INTO application_status
      (application_id, status, changed_by, catatan)
      VALUES (?, 'DIAJUKAN', ?, 'Pengajuan kredit dibuat')
    `, [result.insertId, userId]);

    res.status(201).json({
      success: true,
      message: "Pengajuan berhasil dibuat",
      id: result.insertId
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



// ================= UPDATE APPLICATION =================
const updateApplication = async (req, res) => {
  try {
    const id = req.params.id;

    const [existing] = await db.query(
      "SELECT * FROM credit_application WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan"
      });
    }

    if (existing[0].users_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Tidak punya akses"
      });
    }

    const [status] = await db.query(`
      SELECT status
      FROM application_status
      WHERE application_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [id]);

    if (status.length && status[0].status !== "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Pengajuan sudah diproses"
      });
    }

    await db.query(`
      UPDATE credit_application SET
      nik = ?, nama_lengkap = ?, alamat = ?,
      tempat_lahir = ?, tanggal_lahir = ?,
      jenis_kredit = ?, plafond = ?, jaminan = ?
      WHERE id = ?
    `, [
      req.body.nik,
      req.body.nama_lengkap,
      req.body.alamat,
      req.body.tempat_lahir,
      req.body.tanggal_lahir,
      req.body.jenis_kredit,
      req.body.plafond,
      req.body.jaminan,
      id
    ]);

    res.json({
      success: true,
      message: "Pengajuan berhasil diupdate"
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



// ================= DELETE APPLICATION =================
const deleteApplication = async (req, res) => {
  try {
    const id = req.params.id;

    const [existing] = await db.query(
      "SELECT * FROM credit_application WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan"
      });
    }

    if (existing[0].users_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Tidak punya akses"
      });
    }

    await db.query(
      "DELETE FROM credit_application WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Pengajuan berhasil dihapus"
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
  getAllApplications,
  getApplicationsByUser,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication
};
