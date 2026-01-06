const prisma = require('../config/prisma');
const supabase = require('../config/supabase');

// get all users
exports.getAll = async function (req, res) {
  try {
    const data = await prisma.profile.findMany({
      include: {
        role: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return res.status(200).json({
      code: 200,
      message: 'Data user berhasil ditemukan',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data user',
    });
  }
};

// get user by id
exports.getById = async function (req, res) {
  try {
    const { id } = req.params;

    const data = await prisma.profile.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'User tidak ditemukan',
      });
    }

    return res.status(200).json({
      code: 200,
      message: 'Data user berhasil ditemukan',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: error.message || 'Terjadi kesalahan saat mengambil data user',
    });
  }
};

// create user profile (auth dibuat di frontend)
exports.create = async function (req, res) {
  const { id, name, email, no_phone, role_id } = req.body;

  if (!id || !name || !email || !role_id) {
    return res.status(400).json({
      code: 400,
      message: 'Field wajib diisi',
    });
  }

  try {
    const existing = await prisma.profile.findUnique({
      where: { id },
    });

    if (existing) {
      return res.status(409).json({
        code: 409,
        message: 'User sudah ada',
        data: existing,
      });
    }

    let agent_code = null;

    if (role_id === 2) {
      let isUnique = false;

      while (!isUnique) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
        let randomPart = '';

        for (let i = 0; i < 6; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const randomCode = 'AG -'+ ' ' + randomPart;

        const existingAgent = await prisma.profile.findUnique({
          where: { agent_code: randomCode },
        });

        if (!existingAgent) {
          agent_code = randomCode;
          isUnique = true;
        }
      }
    }


    const data = await prisma.profile.create({
      data: {
        id,
        name,
        email,
        no_phone: no_phone || null,
        agent_code,
        role_id,
      },
      include: {
        role: true,
      },
    });

    return res.status(201).json({
      code: 201,
      message: 'User berhasil ditambahkan',
      data,
    });
  } catch (error) {
    try {
      await supabase.auth.admin.deleteUser(id);
    } catch (e) {
      console.error('Rollback gagal hapus user supabase:', e.message);
    }

    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal membuat user',
    });
  }
};

// update user (email lewat supabase auth)
exports.update = async function (req, res) {
  try {
    const { id } = req.params;
    const { name, email, no_phone, role_id } = req.body;

    // validasi dulu profile ada
    const existing = await prisma.profile.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'User tidak ditemukan',
      });
    }

    // lalu update auth
    if (email !== undefined) {
      await supabase.auth.admin.updateUserById(id, { email });
    }


    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (no_phone !== undefined) updateData.no_phone = no_phone;
    if (email !== undefined) updateData.email = email;

    const data = await prisma.profile.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    return res.status(200).json({
      code: 200,
      message: 'User berhasil diperbarui',
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        code: 404,
        message: 'User tidak ditemukan',
      });
    }

    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal memperbarui user',
    });
  }
};

// delete user (hapus dari supabase auth)
exports.remove = async function (req, res) {
  try {
    const { id } = req.params;

    await supabase.auth.admin.deleteUser(id);

    return res.status(200).json({
      code: 200,
      message: 'User berhasil dihapus',
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      message: error.message || 'Gagal menghapus user',
    });
  }
};
