const db = require("../config/db");
const { sendEmail } = require("../config/nodemailer")

// ================= GET ALL APPLICATIONS =================
const getAllApplications = async (req, res) => {
  try {
    if (req.user.role_name !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Tidak punya akses"
      });
    }

    const [data] = await db.query(`
      SELECT ca.*, p.name, p.email, r.nama_role
      FROM credit_application ca
      LEFT JOIN users p ON ca.user_id = p.id
      LEFT JOIN roles r ON p.role_id = r.id
      ORDER BY ca.created_at DESC
    `);

    res.json({
      success: true,
      message: "Data pengajuan kredit berhasil ditemukan",
      data
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= GET APPLICATION BY USER =================
const getApplicationsByUser = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT *
      FROM credit_application
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= GET APPLICATION BY ID =================
const getApplicationById = async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.query(`
      SELECT ca.*, p.name, p.email
      FROM credit_application ca
      LEFT JOIN users p ON ca.user_id = p.id
      WHERE ca.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan"
      });
    }

    const data = rows[0];

    if (req.user.role_name !== "Admin" && data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Tidak punya akses"
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= CREATE APPLICATION =================

const createApplication = async (req, res) => {
  try {
    const {
      nik, nama_lengkap, alamat,
      tempat_lahir, tanggal_lahir,
      jenis_kredit, plafond, jaminan
    } = req.body;

    const userId = req.user.id;
    const userEmail = req.user.email; //  Email dari user yang login (register)
    const userName = req.user.name;   //  Nama dari user yang login

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

    const [result] = await db.query(`
      INSERT INTO credit_application
      (kode_pengajuan, nik, nama_lengkap, alamat,
       tempat_lahir, tanggal_lahir, email,
       jenis_kredit, plafond, jaminan, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      kode_pengajuan, nik, nama_lengkap, alamat,
      tempat_lahir, tanggal_lahir, userEmail, // Simpan email user ke table
      jenis_kredit, plafond, jaminan, userId
    ]);

    //  STATUS AWAL
    await db.query(`
      INSERT INTO application_status
      (application_id, status_kredit, changed_by, catatan)
      VALUES (?, 'DIAJUKAN', ?, 'Pengajuan kredit dibuat')
    `, [result.insertId, userId]);

    //  KIRIM EMAIL KE USER (menggunakan email dari akun login)
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
          }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 40%; color: #666; }
          .status-badge { 
            display: inline-block; 
            padding: 10px 20px; 
            background: #FF9800; 
            color: white; 
            border-radius: 20px; 
            font-weight: bold; 
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">✅ Pengajuan Kredit Berhasil</h1>
          </div>
          
          <div class="content">
            <p>Halo <strong>${userName}</strong>,</p>
            
            <p>Terima kasih telah mengajukan kredit. Pengajuan Anda telah berhasil diterima dengan detail berikut:</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="status-badge">DIAJUKAN</span>
            </div>
            
            <table class="info-table">
              <tr>
                <td>Kode Pengajuan</td>
                <td><strong>${kode_pengajuan}</strong></td>
              </tr>
              <tr>
                <td>Nama Lengkap</td>
                <td>${nama_lengkap}</td>
              </tr>
              <tr>
                <td>NIK</td>
                <td>${nik}</td>
              </tr>
              <tr>
                <td>Jenis Kredit</td>
                <td>${jenis_kredit}</td>
              </tr>
              <tr>
                <td>Plafond</td>
                <td><strong>Rp ${parseInt(plafond).toLocaleString('id-ID')}</strong></td>
              </tr>
              <tr>
                <td>Jaminan</td>
                <td>${jaminan}</td>
              </tr>
              <tr>
                <td>Tanggal Pengajuan</td>
                <td>${new Date().toLocaleString('id-ID', { 
                  dateStyle: 'full', 
                  timeStyle: 'short',
                  timeZone: 'Asia/Jakarta'
                })}</td>
              </tr>
            </table>
            
            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #FF9800; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📝 Status Saat Ini: DIAJUKAN</strong></p>
              <p style="margin: 10px 0 0 0;">Pengajuan Anda akan segera diverifikasi oleh tim kami. 
              Kami akan mengirimkan email notifikasi setiap ada update status.</p>
            </div>
            
            <p style="margin-top: 30px;">
              <strong>Langkah Selanjutnya:</strong><br>
              • Pastikan dokumen-dokumen pendukung Anda lengkap<br>
              • Tunggu verifikasi dari tim kami (1-3 hari kerja)<br>
              • Anda akan menerima email notifikasi untuk setiap perubahan status
            </p>
          </div>
          
          <div class="footer">
            <p>Email ini dikirim secara otomatis oleh sistem.<br>
            Jangan balas email ini.</p>
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Satufin. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Kirim email ke user (async, tidak menghalangi response)
    sendEmail(
      userEmail,
      `Pengajuan Kredit ${kode_pengajuan} - Berhasil Dibuat`,
      userEmailHtml
    ).catch(err => {
      console.error('⚠️ Email notification to user failed:', err.message);
    });

    //  KIRIM EMAIL KE ADMIN
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
          }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 40%; color: #666; }
          .badge-new { 
            display: inline-block; 
            padding: 8px 15px; 
            background: #f5576c; 
            color: white; 
            border-radius: 15px; 
            font-weight: bold; 
            font-size: 14px;
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🔔 Pengajuan Kredit Baru</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Memerlukan Verifikasi</p>
          </div>
          
          <div class="content">
            <div style="text-align: center; margin-bottom: 20px;">
              <span class="badge-new">PENGAJUAN BARU</span>
            </div>
            
            <p>Halo Admin,</p>
            <p>Ada pengajuan kredit baru yang memerlukan verifikasi:</p>
            
            <table class="info-table">
              <tr>
                <td>Kode Pengajuan</td>
                <td><strong style="color: #f5576c;">${kode_pengajuan}</strong></td>
              </tr>
              <tr>
                <td>Nama Pemohon</td>
                <td><strong>${nama_lengkap}</strong></td>
              </tr>
              <tr>
                <td>Email User</td>
                <td>${userEmail}</td>
              </tr>
              <tr>
                <td>NIK</td>
                <td>${nik}</td>
              </tr>
              <tr>
                <td>Alamat</td>
                <td>${alamat}</td>
              </tr>
              <tr>
                <td>Tempat, Tanggal Lahir</td>
                <td>${tempat_lahir}, ${tanggal_lahir}</td>
              </tr>
              <tr>
                <td>Jenis Kredit</td>
                <td><strong>${jenis_kredit}</strong></td>
              </tr>
              <tr>
                <td>Plafond</td>
                <td><strong style="color: #f5576c;">Rp ${parseInt(plafond).toLocaleString('id-ID')}</strong></td>
              </tr>
              <tr>
                <td>Jaminan</td>
                <td>${jaminan}</td>
              </tr>
              <tr>
                <td>Waktu Pengajuan</td>
                <td>${new Date().toLocaleString('id-ID', { 
                  dateStyle: 'full', 
                  timeStyle: 'short',
                  timeZone: 'Asia/Jakarta'
                })}</td>
              </tr>
            </table>
            
            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #FF9800; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚠️ Action Required:</strong></p>
              <p style="margin: 10px 0 0 0;">Silakan login ke sistem untuk memverifikasi dan memproses pengajuan ini.</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Email ini dikirim secara otomatis oleh sistem.<br>
            Jangan balas email ini.</p>
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Satufin. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Kirim email ke admin (async, tidak menghalangi response)
    sendEmail(
      process.env.ADMIN_EMAIL,
      `🔔 Pengajuan Kredit Baru - ${kode_pengajuan}`,
      adminEmailHtml
    ).catch(err => {
      console.error('⚠️ Email notification to admin failed:', err.message);
    });

    res.status(201).json({
      success: true,
      message: "Pengajuan berhasil dibuat dan notifikasi email telah dikirim",
      data: {
        id: result.insertId,
        kode_pengajuan: kode_pengajuan,
        email_sent_to: [userEmail, process.env.ADMIN_EMAIL]
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

    if (existing[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Tidak punya akses"
      });
    }

    // ✅ CEK STATUS TERAKHIR (FIX)
    const [status] = await db.query(`
      SELECT status_kredit
      FROM application_status
      WHERE application_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [id]);

    if (status.length && status[0].status_kredit !== "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Pengajuan sudah diproses"
      });
    }

    await db.query(`
      UPDATE credit_application SET
        nik=?, nama_lengkap=?, alamat=?,
        tempat_lahir=?, tanggal_lahir=?,
        jenis_kredit=?, plafond=?, jaminan=?
      WHERE id=?
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

    res.json({ success: true, message: "Pengajuan berhasil diupdate" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

    if (existing[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Tidak punya akses"
      });
    }

    await db.query("DELETE FROM credit_application WHERE id = ?", [id]);

    res.json({ success: true, message: "Pengajuan berhasil dihapus" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
