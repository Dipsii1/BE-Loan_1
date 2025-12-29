const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// get all - hanya data milik user yang login
exports.getAll = async function (req, res) {
  try {
    const data = await prisma.creditApplication.findMany({
      where: {
        profile_id: req.user.id,
      },
      include: {
        statuses: {
          orderBy: {
            created_at: 'desc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Data pengajuan kredit berhasil ditemukan',
      data,
    });
  } catch (error) {
    console.error('Get all credit applications error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data',
    });
  }
};

// get by kode - hanya jika milik user yang login
exports.getByKode = async function (req, res) {
  try {
    const data = await prisma.creditApplication.findFirst({
      where: {
        kode_pengajuan: req.params.kode_pengajuan,
        profile_id: req.user.id, // Pastikan milik user yang login
      },
      include: {
        statuses: {
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'Data pengajuan kredit tidak ditemukan',
      });
    }

    return res.status(200).json({
      code: 200,
      message: 'Data pengajuan kredit berhasil ditemukan',
      data,
    });
  } catch (error) {
    console.error('Get credit application by kode error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data',
    });
  }
};

// create
exports.create = async function (req, res) {
  try {
    const userId = req.user.id; // Dari Supabase auth
    const userEmail = req.user.email;

    //  Cari atau buat profile
    let profile = await prisma.profile.findUnique({
      where: {
        id: userId,
      },
    });

    // Jika profile belum ada, buat otomatis
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: userId,
          email: userEmail,
          // Tambahkan field lain jika diperlukan
        },
      });
    }

    //  Generate kode pengajuan
    const lastData = await prisma.creditApplication.findFirst({
      where: {
        kode_pengajuan: {
          startsWith: 'L-',
        },
      },
      orderBy: {
        kode_pengajuan: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastData) {
      const lastNumber = parseInt(lastData.kode_pengajuan.split('-')[1]);
      nextNumber = lastNumber + 1;
    }

    const kodePengajuan = `L-${String(nextNumber).padStart(3, '0')}`;

    //  Create credit application
    const data = await prisma.creditApplication.create({
      data: {
        kode_pengajuan: kodePengajuan,
        nik: req.body.nik,
        nama_lengkap: req.body.nama_lengkap,
        tempat_lahir: req.body.tempat_lahir,
        tanggal_lahir: new Date(req.body.tanggal_lahir),
        alamat: req.body.alamat,
        email: userEmail,
        jenis_kredit: req.body.jenis_kredit,
        plafond: req.body.plafond,
        jaminan: req.body.jaminan,
        profile_id: userId,

        statuses: {
          create: {
            status: 'DIAJUKAN',
            changed_by: userId,
            catatan: 'Pengajuan dibuat oleh nasabah',
          },
        },
      },
      include: {
        statuses: true,
      },
    });

    return res.status(201).json({
      code: 201,
      message: 'Pengajuan kredit berhasil ditambahkan',
      data,
    });
  } catch (error) {
    console.error('Create credit application error:', error);
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal menambahkan data',
    });
  }
};

// update - hanya jika milik user yang login
exports.update = async function (req, res) {
  try {
    // Cek apakah data milik user yang login
    const existing = await prisma.creditApplication.findFirst({
      where: {
        kode_pengajuan: req.params.kode_pengajuan,
        profile_id: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Data tidak ditemukan atau Anda tidak memiliki akses',
      });
    }

    const data = await prisma.creditApplication.update({
      where: {
        kode_pengajuan: req.params.kode_pengajuan,
      },
      data: {
        nik: req.body.nik,
        nama_lengkap: req.body.nama_lengkap,
        tempat_lahir: req.body.tempat_lahir,
        tanggal_lahir: new Date(req.body.tanggal_lahir),
        alamat: req.body.alamat,
        jenis_kredit: req.body.jenis_kredit,
        plafond: req.body.plafond,
        jaminan: req.body.jaminan,
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Pengajuan kredit berhasil diperbarui',
      data,
    });
  } catch (error) {
    console.error('Update credit application error:', error);
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal memperbarui data',
    });
  }
};

// delete - hanya jika milik user yang login
exports.remove = async function (req, res) {
  try {
    // Cek apakah data milik user yang login
    const existing = await prisma.creditApplication.findFirst({
      where: {
        kode_pengajuan: req.params.kode_pengajuan,
        profile_id: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Data tidak ditemukan atau Anda tidak memiliki akses',
      });
    }

    await prisma.creditApplication.delete({
      where: {
        kode_pengajuan: req.params.kode_pengajuan,
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Pengajuan kredit berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete credit application error:', error);
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal menghapus data',
    });
  }
};