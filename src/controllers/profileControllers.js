const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET ALL PROFILES
exports.getAll = async function (req, res) {
  try {
    const data = await prisma.profile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            no_phone: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Data profile berhasil ditemukan',
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data',
    });
  }
};

// GET PROFILE BY USER ID
exports.getByUserId = async function (req, res) {
  try {
    const userId = parseInt(req.params.user_id);

    const data = await prisma.profile.findUnique({
      where: {
        user_id: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            no_phone: true,
            role: true,
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'Data profile tidak ditemukan',
      });
    }

    return res.status(200).json({
      code: 200,
      message: 'Data profile berhasil ditemukan',
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data',
    });
  }
};

// CREATE PROFILE
exports.create = async function (req, res) {
  try {
    const data = await prisma.profile.create({
      data: {
        user_id: req.body.user_id,
        nik: req.body.nik || null,
        nama_lengkap: req.body.nama_lengkap,
        tempat_lahir: req.body.tempat_lahir || null,
        tanggal_lahir: req.body.tanggal_lahir
          ? new Date(req.body.tanggal_lahir)
          : null,
        jenis_kelamin: req.body.jenis_kelamin || null,
        alamat: req.body.alamat || null,
        kota: req.body.kota || null,
        provinsi: req.body.provinsi || null,
        kode_pos: req.body.kode_pos || null,
        foto_profil: req.body.foto_profil || null,
        status_akun: req.body.status_akun || 'AKTIF',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            no_phone: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      code: 201,
      message: 'Profile berhasil ditambahkan',
      data: data,
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal menambahkan data profile',
    });
  }
};

// UPDATE PROFILE BY USER ID
exports.update = async function (req, res) {
  try {
    const userId = parseInt(req.params.user_id);

    const updateData = {};
    if (req.body.nik !== undefined) updateData.nik = req.body.nik;
    if (req.body.nama_lengkap !== undefined)
      updateData.nama_lengkap = req.body.nama_lengkap;
    if (req.body.tempat_lahir !== undefined)
      updateData.tempat_lahir = req.body.tempat_lahir;
    if (req.body.tanggal_lahir !== undefined)
      updateData.tanggal_lahir = new Date(req.body.tanggal_lahir);
    if (req.body.jenis_kelamin !== undefined)
      updateData.jenis_kelamin = req.body.jenis_kelamin;
    if (req.body.alamat !== undefined) updateData.alamat = req.body.alamat;
    if (req.body.kota !== undefined) updateData.kota = req.body.kota;
    if (req.body.provinsi !== undefined)
      updateData.provinsi = req.body.provinsi;
    if (req.body.kode_pos !== undefined)
      updateData.kode_pos = req.body.kode_pos;
    if (req.body.foto_profil !== undefined)
      updateData.foto_profil = req.body.foto_profil;
    if (req.body.status_akun !== undefined)
      updateData.status_akun = req.body.status_akun;

    const data = await prisma.profile.update({
      where: {
        user_id: userId,
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            no_phone: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Profile berhasil diperbarui',
      data: data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        code: 404,
        message: 'Data profile tidak ditemukan',
      });
    }
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal memperbarui data profile',
    });
  }
};

// DELETE PROFILE BY USER ID
exports.remove = async function (req, res) {
  try {
    const userId = parseInt(req.params.user_id);

    await prisma.profile.delete({
      where: {
        user_id: userId,
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Profile berhasil dihapus',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        code: 404,
        message: 'Data profile tidak ditemukan',
      });
    }
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal menghapus data profile',
    });
  }
};

