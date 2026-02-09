const db = require('../config/db');

// ================= HELPER SLA =================
const calculateSLA = async (applicationId, newStatus, conn = null) => {
  const connection = conn || db;

  try {
    const [rows] = await connection.query(
      `SELECT status_kredit, created_at
       FROM application_status
       WHERE application_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [applicationId]
    );

    // Status pertama → belum ada SLA
    if (rows.length === 0) return null;

    const lastStatus = rows[0];

    if (lastStatus.status_kredit === newStatus) return null;

    const startTime = new Date(lastStatus.created_at);
    const endTime = new Date();
    const durationMinutes = Math.floor((endTime - startTime) / 60000);

    if (durationMinutes < 0) return null;

    const [result] = await connection.query(
      `INSERT INTO application_sla
       (application_id, from_status, to_status, start_time, end_time, duration_minutes, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationId,
        lastStatus.status_kredit,
        newStatus,
        startTime,
        endTime,
        durationMinutes,
        `Transisi dari ${lastStatus.status_kredit} ke ${newStatus}`,
      ]
    );

    return {
      from: lastStatus.status_kredit,
      to: newStatus,
      duration: durationMinutes,
      sla_id: result.insertId,
    };
  } catch (err) {
    console.error('ERROR SLA:', err);
    throw err;
  }
};

// ================= GET ALL STATUS =================
const getAllStatus = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT s.*,
             a.kode_pengajuan, a.nama_lengkap,
             u.id AS user_id, u.name, u.email
      FROM application_status s
      LEFT JOIN credit_application a ON s.application_id = a.id
      LEFT JOIN users u ON s.changed_by = u.id
      ORDER BY s.created_at DESC
    `);

    res.json({
      success: true,
      message: 'Data status pengajuan berhasil ditemukan',
      data,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ================= GET STATUS BY APPLICATION =================
const getStatusByApplication = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    if (req.user.role_name !== 'Admin') {
      const [owned] = await db.query(
        `SELECT id FROM credit_application
         WHERE id = ? AND user_id = ?`,
        [applicationId, req.user.id]
      );

      if (!owned.length) {
        return res.status(403).json({
          success: false,
          message: 'Tidak ada akses',
        });
      }
    }

    const [data] = await db.query(
      `SELECT s.*, u.name, u.email
       FROM application_status s
       LEFT JOIN users u ON s.changed_by = u.id
       WHERE s.application_id = ?
       ORDER BY s.created_at DESC`,
      [applicationId]
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ================= CREATE STATUS =================
const createStatus = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { application_id, status, catatan } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status wajib diisi',
      });
    }

    const validStatuses = ['DIAJUKAN', 'DIPROSES', 'DITERIMA', 'DITOLAK'];
    const statusUpper = status.toUpperCase();

    if (!validStatuses.includes(statusUpper)) {
      return res.status(400).json({
        success: false,
        message: 'Status invalid',
      });
    }

    await conn.beginTransaction();

    const slaInfo = await calculateSLA(
      application_id,
      statusUpper,
      conn
    );

    const [result] = await conn.query(
      `INSERT INTO application_status
       (application_id, status_kredit, catatan, changed_by)
       VALUES (?, ?, ?, ?)`,
      [
        application_id,
        statusUpper,
        catatan || `Status diubah menjadi ${statusUpper}`,
        req.user.id,
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Status berhasil ditambahkan',
      insertId: result.insertId,
      sla: slaInfo,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

// ================= UPDATE STATUS =================
const updateStatus = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { status, catatan } = req.body;
    const statusId = Number(req.params.id);

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status wajib diisi',
      });
    }

    const statusUpper = status.toUpperCase();

    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT * FROM application_status WHERE id = ?`,
      [statusId]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: 'Status tidak ada',
      });
    }

    let slaInfo = null;

    if (existing[0].status_kredit !== statusUpper) {
      slaInfo = await calculateSLA(
        existing[0].application_id,
        statusUpper,
        conn
      );
    }

    await conn.query(
      `UPDATE application_status
       SET status_kredit = ?, catatan = ?, changed_by = ?
       WHERE id = ?`,
      [statusUpper, catatan, req.user.id, statusId]
    );

    await conn.commit();

    res.json({
      success: true,
      sla: slaInfo,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

// ================= DELETE STATUS =================
const deleteStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);

    await db.query(
      `DELETE FROM application_status WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Status dihapus',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ================= GET SLA PER APPLICATION =================
const getSLAByApplication = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [slaData] = await db.query(
      `SELECT *
       FROM application_sla
       WHERE application_id = ?
       ORDER BY created_at ASC`,
      [id]
    );

    const total = slaData.reduce(
      (sum, x) => sum + x.duration_minutes,
      0
    );

    res.json({
      success: true,
      data: {
        transitions: slaData,
        total_duration_minutes: total,
        total_duration_hours: (total / 60).toFixed(2),
        total_duration_days: (total / 1440).toFixed(2),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ================= GET ALL SLA =================
const getAllSLA = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT s.*, a.kode_pengajuan, a.nama_lengkap
      FROM application_sla s
      LEFT JOIN credit_application a ON s.application_id = a.id
      ORDER BY s.created_at DESC
    `);

    res.json({ success: true, data });
  } catch ( crescendo ) {
    res.status(500).json({ success: false, error: crescendo.message });
  }
};

module.exports = {
  getAllStatus,
  getStatusByApplication,
  createStatus,
  updateStatus,
  deleteStatus,
  getSLAByApplication,
  getAllSLA,
};
