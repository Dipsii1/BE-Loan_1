const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Test koneksi
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email connection error:", error.message);
    } else {
        console.log("✅ Email server ready (Hostinger SMTP)");
    }
});

// ================= FUNGSI KIRIM EMAIL UMUM =================
const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"Admin Satufin" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully to:", to);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending email:", error.message);
        return { success: false, error: error.message };
    }
};

// ================= FUNGSI KIRIM EMAIL VERIFIKASI =================
const sendVerificationEmail = async (email, name, verificationToken) => {
    // ✅ GANTI: Gunakan FRONTEND_URL, bukan BACKEND_URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .content { padding: 40px 30px; }
        .button { 
          display: inline-block; 
          padding: 15px 40px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          font-weight: bold;
          margin: 20px 0;
        }
        .button:hover { opacity: 0.9; }
        .info-box { 
          background: #f8f9fa; 
          padding: 20px; 
          border-left: 4px solid #667eea; 
          margin: 20px 0;
          border-radius: 5px;
        }
        .footer { 
          text-align: center; 
          padding: 20px; 
          color: #666; 
          font-size: 14px; 
          background: #f8f9fa;
        }
        .warning {
          background: #fff3cd;
          padding: 15px;
          border-left: 4px solid #ffc107;
          margin: 20px 0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">✉️ Verifikasi Email Anda</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Selamat datang di Satufin!</p>
        </div>
        
        <div class="content">
          <p>Halo <strong>${name}</strong>,</p>
          
          <p>Terima kasih telah mendaftar di <strong>Satufin</strong>. 
          Untuk melanjutkan, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" class="button">
              Verifikasi Email
            </a>
          </div>
          
          <div class="info-box">
            <p style="margin: 0;"><strong>💡 Kenapa perlu verifikasi?</strong></p>
            <p style="margin: 10px 0 0 0;">Verifikasi email memastikan keamanan akun Anda dan 
            memungkinkan kami mengirim notifikasi penting terkait pengajuan kredit Anda.</p>
          </div>
          
          <p>Atau copy dan paste link berikut ke browser Anda:</p>
          <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 14px;">
            ${verificationUrl}
          </p>
          
          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Penting:</strong></p>
            <p style="margin: 10px 0 0 0;">Link verifikasi ini akan kadaluarsa dalam <strong>24 jam</strong>. 
            Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
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

    return await sendEmail(
        email,
        "Verifikasi Email - Satufin",
        html
    );
};

// ================= FUNGSI KIRIM EMAIL UPDATE STATUS =================
const sendStatusUpdateEmail = async (userEmail, userName, kodePengajuan, statusBaru, catatan) => {
    const statusConfig = {
        'DIAJUKAN': {
            color: '#FF9800',
            icon: '📝',
            message: 'Pengajuan Anda telah diterima dan menunggu verifikasi'
        },
        'DIPROSES': {
            color: '#2196F3',
            icon: '⏳',
            message: 'Pengajuan Anda sedang dalam proses verifikasi oleh tim kami'
        },
        'DITERIMA': {
            color: '#4CAF50',
            icon: '✅',
            message: 'Selamat! Pengajuan kredit Anda telah disetujui'
        },
        'DITOLAK': {
            color: '#F44336',
            icon: '❌',
            message: 'Mohon maaf, pengajuan kredit Anda tidak dapat disetujui'
        }
    };

    const config = statusConfig[statusBaru] || statusConfig['DIAJUKAN'];

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .status-badge { 
          display: inline-block; 
          padding: 10px 20px; 
          background: ${config.color}; 
          color: white; 
          border-radius: 20px; 
          font-weight: bold; 
          font-size: 16px;
          margin: 20px 0;
        }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 40%; color: #666; }
        .message-box { 
          background: white; 
          padding: 20px; 
          border-left: 4px solid ${config.color}; 
          margin: 20px 0;
          border-radius: 5px;
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">${config.icon} Update Status Pengajuan</h1>
        </div>
        
        <div class="content">
          <p>Halo <strong>${userName}</strong>,</p>
          
          <p>Status pengajuan kredit Anda telah diperbarui:</p>
          
          <div style="text-align: center;">
            <div class="status-badge">${statusBaru}</div>
          </div>
          
          <div class="message-box">
            <p style="margin: 0; font-size: 16px;">${config.message}</p>
          </div>
          
          <table class="info-table">
            <tr>
              <td>Kode Pengajuan</td>
              <td><strong>${kodePengajuan}</strong></td>
            </tr>
            <tr>
              <td>Status Terbaru</td>
              <td><strong style="color: ${config.color};">${statusBaru}</strong></td>
            </tr>
            <tr>
              <td>Waktu Update</td>
              <td>${new Date().toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta'
    })}</td>
            </tr>
            ${catatan ? `
            <tr>
              <td>Catatan</td>
              <td>${catatan}</td>
            </tr>
            ` : ''}
          </table>
          
          ${statusBaru === 'DITERIMA' ? `
            <p style="margin-top: 30px;">
              <strong>Langkah Selanjutnya:</strong><br>
              Tim kami akan segera menghubungi Anda untuk proses selanjutnya. 
              Silakan siapkan dokumen-dokumen yang diperlukan.
            </p>
          ` : ''}
          
          ${statusBaru === 'DITOLAK' ? `
            <p style="margin-top: 30px;">
              <strong>Informasi:</strong><br>
              Anda dapat mengajukan kembali setelah melengkapi persyaratan yang dibutuhkan. 
              Silakan hubungi customer service kami untuk informasi lebih lanjut.
            </p>
          ` : ''}
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

    return await sendEmail(
        userEmail,
        `Update Status Pengajuan ${kodePengajuan} - ${statusBaru}`,
        html
    );
};

// EXPORT SEMUA FUNGSI
module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendStatusUpdateEmail
};