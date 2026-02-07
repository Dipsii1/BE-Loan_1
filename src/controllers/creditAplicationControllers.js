// const prisma = require('../config/prisma');

// // GET ALL (ADMIN / PUBLIC)
// exports.getAll = async (req, res) => {
//   try {
//     const data = await prisma.creditApplication.findMany({
//       include: {
//         statuses: {
//           orderBy: { created_at: 'desc' },
//         },
//         profile: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//       orderBy: { created_at: 'desc' },
//     })

//     return res.status(200).json({
//       code: 200,
//       message: 'Data pengajuan kredit berhasil ditemukan',
//       data
//     })
//   } catch (err) {
//     return res.status(500).json({
//       code: 500,
//       message: err.message || 'Terjadi kesalahan',
//     })
//   }
// }

// // GET BY USER LOGIN
// exports.getByUserId = async (req, res) => {
//   try {
//     const data = await prisma.creditApplication.findMany({
//       where: {
//         profile_id: req.user.id,
//       },
//       include: {
//         statuses: {
//           orderBy: { created_at: 'desc' },
//         },
//       },
//       orderBy: { created_at: 'desc' },
//     })

//     return res.status(200).json({
//       code: 200,
//       message: 'Data pengajuan kredit berhasil ditemukan',
//       data
//     })
//   } catch (err) {
//     return res.status(500).json({
//       code: 500,
//       message: err.message || 'Terjadi kesalahan',
//     })
//   }
// }

// // GET BY ID
// exports.getById = async (req, res) => {
//   const id = Number(req.params.id)

//   try {
//     const data = await prisma.creditApplication.findUnique({
//       where: { id },
//       include: {
//         statuses: {
//           orderBy: { created_at: 'desc' },
//         },
//       },
//     })

//     if (!data) {
//       return res.status(404).json({
//         code: 404,
//         message: 'Data tidak ditemukan',
//       })
//     }

//     return res.status(200).json({
//       code: 200,
//       message: 'Data pengajuan kredit berhasil ditemukan',
//       data
//     })
//   } catch (err) {
//     return res.status(500).json({
//       code: 500,
//       message: err.message || 'Terjadi kesalahan',
//     })
//   }
// }

// // CREATE
// exports.create = async (req, res) => {
//   try {
//     const userId = req.user.id
//     const email = req.user.email

//     // pastikan profile ada
//     let profile = await prisma.profile.findUnique({
//       where: { id: userId },
//     })

//     if (!profile) {
//       profile = await prisma.profile.create({
//         data: {
//           id: userId,
//           email,
//           name: req.body.nama_lengkap,
//           role_id: 1,
//         },
//       })
//     }

//     // ambil data terakhir berdasarkan kode_pengajuan
//     const lastData = await prisma.creditApplication.findFirst({
//       where: {
//         kode_pengajuan: {
//           startsWith: "L-",
//         },
//       },
//       orderBy: {
//         id: "desc",
//       },
//       select: {
//         kode_pengajuan: true,
//       },
//     })

//     let nextNumber = 1

//     if (lastData?.kode_pengajuan) {
//       const lastNumber = parseInt(
//         lastData.kode_pengajuan.replace("L-", ""),
//         10
//       )
//       if (!isNaN(lastNumber)) {
//         nextNumber = lastNumber + 1
//       }
//     }

//     // format jadi 4 digit: 0001
//     const kode_pengajuan = `L-${String(nextNumber).padStart(4, "0")}`

//     const data = await prisma.creditApplication.create({
//       data: {
//         nik: req.body.nik,
//         nama_lengkap: req.body.nama_lengkap,
//         alamat: req.body.alamat,
//         tempat_lahir: req.body.tempat_lahir,
//         tanggal_lahir: new Date(req.body.tanggal_lahir),
//         email,
//         jenis_kredit: req.body.jenis_kredit,
//         plafond: req.body.plafond,
//         jaminan: req.body.jaminan,
//         profile_id: userId,
//         kode_pengajuan,
//         statuses: {
//           create: {
//             status: "DIAJUKAN",
//             changed_by: userId,
//             catatan: "Pengajuan dibuat",
//           },
//         },
//       },
//     })

//     return res.status(201).json({
//       code: 201,
//       message: 'Pengajuan kredit berhasil dibuat',
//       data
//     })
//   } catch (err) {
//     return res.status(400).json({
//       code: 400,
//       message: err.message || 'Gagal membuat pengajuan kredit',
//     })
//   }
// }


// // UPDATE
// exports.update = async (req, res) => {
//   const id = Number(req.params.id)

//   try {
//     const existing = await prisma.creditApplication.findFirst({
//       where: {
//         id,
//         profile_id: req.user.id,
//       },
//     })

//     if (!existing) {
//       return res.status(403).json({
//         code: 403,
//         message: 'Tidak punya akses',
//       })
//     }

//     const data = await prisma.creditApplication.update({
//       where: { id },
//       data: req.body,
//     })

//     return res.status(200).json({
//       code: 200,
//       message: 'Pengajuan kredit berhasil diperbarui',
//       data
//     })
//   } catch (err) {
//     return res.status(500).json({
//       code: 500,
//       message: err.message || 'Gagal memperbarui pengajuan kredit',
//     })
//   }
// }

// // DELETE
// exports.remove = async (req, res) => {
//   const id = Number(req.params.id)

//   try {
//     const existing = await prisma.creditApplication.findFirst({
//       where: {
//         id,
//         profile_id: req.user.id,
//       },
//     })

//     if (!existing) {
//       return res.status(403).json({
//         code: 403,
//         message: 'Tidak punya akses',
//       })
//     }

//     await prisma.creditApplication.delete({
//       where: { id },
//     })

//     return res.status(200).json({
//       code: 200,
//       message: 'Pengajuan kredit berhasil dihapus',
//     })
//   } catch (err) {
//     return res.status(500).json({
//       code: 500,
//       message: err.message || 'Gagal menghapus pengajuan kredit',
//     })
//   }
// }