const prisma = require('../config/prisma');

// Helper function untuk menghitung durasi SLA
const calculateSLA = async (applicationId, newStatus, prismaClient = null) => {
  try {
    const client = prismaClient || prisma;

    // Ambil status terakhir sebelum perubahan
    const lastStatus = await client.applicationStatus.findFirst({
      where: { application_id: applicationId },
      orderBy: { created_at: 'desc' },
    });

    if (!lastStatus) {
      // status pertama (DIAJUKAN)
      console.log('Status pertama, tidak perlu tracking SLA');
      return null;
    }

    // Cek apakah status benar-benar berubah
    if (lastStatus.status === newStatus) {
      console.log('Status tidak berubah, skip SLA tracking');
      return null;
    }

    // Hitung durasi dari status sebelumnya ke status baru
    const startTime = new Date(lastStatus.created_at);
    const endTime = new Date();
    const durationMs = endTime - startTime;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    // Validasi durasi tidak negatif
    if (durationMinutes < 0) {
      console.error('ERROR: Duration negatif!', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });
      return null;
    }

    // Simpan ke tabel ApplicationSLA
    const slaRecord = await client.applicationSLA.create({
      data: {
        application_id: applicationId,
        from_status: lastStatus.status,
        to_status: newStatus,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        catatan: `Transisi dari ${lastStatus.status} ke ${newStatus}`,
      },
    });

    console.log('SLA tracked successfully:', {
      application_id: applicationId,
      from: lastStatus.status,
      to: newStatus,
      duration: durationMinutes,
    });

    return {
      from: lastStatus.status,
      to: newStatus,
      duration: durationMinutes,
      sla_id: slaRecord.id,
    };
  } catch (error) {
    console.error('ERROR CALCULATE SLA:', {
      applicationId,
      newStatus,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Get all application status
const getAllStatus = async (req, res) => {
  try {
    const data = await prisma.applicationStatus.findMany({
      include: {
        application: {
          select: {
            kode_pengajuan: true,
            nama_lengkap: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({
      success: true,
      message: 'Data status pengajuan berhasil ditemukan',
      data,
    });
  } catch (error) {
    console.error('Error in get all status:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// Get status by application ID
const getStatusByApplication = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    // Jika bukan ADMIN, cek kepemilikan
    if (req.user.role_name !== 'Admin') {
      const owned = await prisma.creditApplication.findFirst({
        where: {
          id: applicationId,
          user_id: req.user.id,
        },
      });

      if (!owned) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke pengajuan ini',
        });
      }
    }

    const data = await prisma.applicationStatus.findMany({
      where: { application_id: applicationId },
      include: {
        user: {
          select: { 
            name: true, 
            email: true 
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Status pengajuan tidak ditemukan',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Data status pengajuan berhasil ditemukan',
      data,
    });
  } catch (error) {
    console.error('Error in get status by application:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// Create new status (ADMIN) - Dengan SLA Tracking
const createStatus = async (req, res) => {
  try {
    const { application_id, status, catatan } = req.body;

    // Validasi input
    if (!application_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'application_id dan status wajib diisi',
      });
    }

    // Validasi status enum
    const validStatuses = ['DIAJUKAN', 'DIPROSES', 'DITERIMA', 'DITOLAK'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Status harus salah satu dari: ${validStatuses.join(', ')}`,
      });
    }

    // Cek application exists
    const application = await prisma.creditApplication.findUnique({
      where: { id: Number(application_id) },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Pengajuan tidak ditemukan',
      });
    }

    // Cek user exists
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    // Transaction untuk create status dan hitung SLA
    const result = await prisma.$transaction(async (tx) => {
      // Hitung SLA SEBELUM membuat status baru
      const slaInfo = await calculateSLA(
        Number(application_id),
        status.toUpperCase(),
        tx
      );

      // Buat status baru
      const newStatus = await tx.applicationStatus.create({
        data: {
          application_id: Number(application_id),
          status: status.toUpperCase(),
          catatan: catatan || `Status diubah menjadi ${status}`,
          changed_by: req.user.id,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return { newStatus, slaInfo };
    });

    return res.status(201).json({
      success: true,
      message: 'Status pengajuan berhasil ditambahkan',
      data: result.newStatus,
      sla: result.slaInfo,
    });
  } catch (error) {
    console.error('Error in create status:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// Update status
const updateStatus = async (req, res) => {
  try {
    const { status, catatan } = req.body;
    const statusId = Number(req.params.id);

    // Validasi input
    if (!status || !catatan) {
      return res.status(400).json({
        success: false,
        message: 'Status dan catatan wajib diisi',
      });
    }

    // Validasi status enum
    const validStatuses = ['DIAJUKAN', 'DIPROSES', 'DITERIMA', 'DITOLAK'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Status harus salah satu dari: ${validStatuses.join(', ')}`,
      });
    }

    // Mengambil status yang akan diupdate
    const existingStatus = await prisma.applicationStatus.findUnique({
      where: { id: statusId },
    });

    if (!existingStatus) {
      return res.status(404).json({
        success: false,
        message: 'Status tidak ditemukan',
      });
    }

    // Transaction untuk update status dan hitung SLA
    const result = await prisma.$transaction(async (tx) => {
      let slaInfo = null;

      // Hitung SLA HANYA jika status berubah
      if (existingStatus.status !== status.toUpperCase()) {
        slaInfo = await calculateSLA(
          existingStatus.application_id,
          status.toUpperCase(),
          tx
        );
      }

      // Update status
      const updatedStatus = await tx.applicationStatus.update({
        where: { id: statusId },
        data: {
          status: status.toUpperCase(),
          catatan,
          changed_by: req.user.id,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return { updatedStatus, slaInfo };
    });

    return res.status(200).json({
      success: true,
      message: 'Status pengajuan berhasil diperbarui',
      data: result.updatedStatus,
      sla: result.slaInfo,
    });
  } catch (error) {
    console.error('Error in update status:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// Delete status
const deleteStatus = async (req, res) => {
  try {
    const statusId = Number(req.params.id);

    // Cek apakah status ada
    const existingStatus = await prisma.applicationStatus.findUnique({
      where: { id: statusId },
    });

    if (!existingStatus) {
      return res.status(404).json({
        success: false,
        message: 'Status tidak ditemukan',
      });
    }

    await prisma.applicationStatus.delete({
      where: { id: statusId },
    });

    return res.status(200).json({
      success: true,
      message: 'Status pengajuan berhasil dihapus',
    });
  } catch (error) {
    console.error('Error in delete status:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// Get SLA by application ID
const getSLAByApplication = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    const slaData = await prisma.applicationSLA.findMany({
      where: { application_id: applicationId },
      orderBy: { created_at: 'asc' },
    });

    // Hitung total durasi
    const totalDuration = slaData.reduce((sum, sla) => sum + sla.duration_minutes, 0);

    return res.status(200).json({
      success: true,
      message: 'Data SLA berhasil ditemukan',
      data: {
        transitions: slaData,
        total_duration_minutes: totalDuration,
        total_duration_hours: (totalDuration / 60).toFixed(2),
        total_duration_days: (totalDuration / (60 * 24)).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Error in get SLA by application:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// Get all SLA - untuk monitoring
const getAllSLA = async (req, res) => {
  try {
    const slaData = await prisma.applicationSLA.findMany({
      include: {
        application: {
          select: {
            kode_pengajuan: true,
            nama_lengkap: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({
      success: true,
      message: 'Data SLA berhasil ditemukan',
      data: slaData,
    });
  } catch (error) {
    console.error('Error in get all SLA:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

module.exports = {
  getAllStatus,
  getStatusByApplication,
  createStatus,
  updateStatus,
  deleteStatus,
  getSLAByApplication,
  getAllSLA
};