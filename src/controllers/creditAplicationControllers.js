const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// GET ALL (ADMIN / PUBLIC)
exports.getAll = async (req, res) => {
  try {
    const data = await prisma.creditApplication.findMany({
      include: {
        statuses: {
          orderBy: { created_at: 'desc' },
        },
        profile: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    res.json({ code: 200, data })
  } catch (err) {
    res.status(500).json({
      code: 500,
      message: err.message,
    })
  }
}

// GET BY USER LOGIN
exports.getByUserId = async (req, res) => {
  try {
    const data = await prisma.creditApplication.findMany({
      where: {
        profile_id: req.user.id,
      },
      include: {
        statuses: {
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    res.json({ code: 200, data })
  } catch (err) {
    res.status(500).json({
      code: 500,
      message: err.message,
    })
  }
}

// GET BY ID
exports.getById = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const data = await prisma.creditApplication.findUnique({
      where: { id },
      include: {
        statuses: {
          orderBy: { created_at: 'desc' },
        },
      },
    })

    if (!data) {
      return res.status(404).json({
        message: 'Data tidak ditemukan',
      })
    }

    res.json({ data })
  } catch (err) {
    res.status(500).json({
      message: err.message,
    })
  }
}

// CREATE
exports.create = async (req, res) => {
  try {
    const userId = req.user.id
    const email = req.user.email

    // pastikan profile ada
    let profile = await prisma.profile.findUnique({
      where: { id: userId },
    })

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: userId,
          email,
          name: req.body.nama_lengkap,
          role_id: 1,
        },
      })
    }

    const data = await prisma.creditApplication.create({
      data: {
        nik: req.body.nik,
        nama_lengkap: req.body.nama_lengkap,
        alamat: req.body.alamat,
        tempat_lahir: req.body.tempat_lahir,
        tanggal_lahir: new Date(req.body.tanggal_lahir),
        email,
        jenis_kredit: req.body.jenis_kredit,
        plafond: req.body.plafond,
        jaminan: req.body.jaminan,
        profile_id: userId,
        kode_pengajuan: `L-${Date.now()}`,
        statuses: {
          create: {
            status: 'DIAJUKAN',
            changed_by: userId,
            catatan: 'Pengajuan dibuat',
          },
        },
      },
    })

    res.status(201).json({ data })
  } catch (err) {
    res.status(400).json({
      message: err.message,
    })
  }
}

// UPDATE
exports.update = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const existing = await prisma.creditApplication.findFirst({
      where: {
        id,
        profile_id: req.user.id,
      },
    })

    if (!existing) {
      return res.status(403).json({
        message: 'Tidak punya akses',
      })
    }

    const data = await prisma.creditApplication.update({
      where: { id },
      data: req.body,
    })

    res.json({ data })
  } catch (err) {
    res.status(500).json({
      message: err.message,
    })
  }
}

// DELETE
exports.remove = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const existing = await prisma.creditApplication.findFirst({
      where: {
        id,
        profile_id: req.user.id,
      },
    })

    if (!existing) {
      return res.status(403).json({
        message: 'Tidak punya akses',
      })
    }

    await prisma.creditApplication.delete({
      where: { id },
    })

    res.json({
      message: 'Berhasil dihapus',
    })
  } catch (err) {
    res.status(500).json({
      message: err.message,
    })
  }
}
