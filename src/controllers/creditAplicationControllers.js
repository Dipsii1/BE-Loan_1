const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// GET ALL
exports.getAll = async function (req, res) {
  try {
    const data = await prisma.creditApplication.findMany({
      include: {
        statuses: true,
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Data pengajuan kredit berhasil ditemukan',
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data',
    });
  }
};

// GET BY KODE
exports.getByKode = async function (req, res) {
  try {
    const data = await prisma.creditApplication.findUnique({
      where: {
        kode_pengajuan: req.params.kode_pengajuan,
      },
      include: {
        statuses: true,
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
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data',
    });
  }
};

// CREATE
exports.create = async function (req, res) {
  try {
    const data = await prisma.creditApplication.create({
      data: {
        kode_pengajuan: req.body.kode_pengajuan,
        nik: req.body.nik,
        nama_lengkap: req.body.nama_lengkap,
        alamat: req.body.alamat,
        tanggal_lahir: new Date(req.body.tanggal_lahir),
        email: req.body.email,
        jenis_kredit: req.body.jenis_kredit,
        plafond: req.body.plafond,
        jaminan: req.body.jaminan,
      },
    });

    return res.status(201).json({
      code: 201,
      message: 'Pengajuan kredit berhasil ditambahkan',
      data: data,
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal menambahkan data',
    });
  }
};

// UPDATE
exports.update = async function (req, res) {
  try {
    const data = await prisma.creditApplication.update({
      where: {
        kode_pengajuan: req.params.kode_pengajuan,
      },
      data: {
        nik: req.body.nik,
        nama_lengkap: req.body.nama_lengkap,
        alamat: req.body.alamat,
        tanggal_lahir: new Date(req.body.tanggal_lahir),
        email: req.body.email,
        jenis_kredit: req.body.jenis_kredit,
        plafond: req.body.plafond,
        jaminan: req.body.jaminan,
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Pengajuan kredit berhasil diperbarui',
      data: data,
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal memperbarui data',
    });
  }
};

// DELETE
exports.remove = async function (req, res) {
  try {
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
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal menghapus data',
    });
  }
};

