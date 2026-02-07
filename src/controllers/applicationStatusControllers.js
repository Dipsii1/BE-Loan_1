// const prisma = require('../config/prisma');

// // Helper function untuk menghitung durasi SLA
// const calculateSLA = async (applicationId, newStatus, prismaClient = null) => {
//   try {
//     const client = prismaClient || prisma;

//     // Ambil status terakhir sebelum perubahan
//     const lastStatus = await client.applicationStatus.findFirst({
//       where: { application_id: applicationId },
//       orderBy: { created_at: 'desc' },
//     });

//     if (!lastStatus) {
//       // status pertama (DIAJUKAN)
//       console.log('Status pertama, tidak perlu tracking SLA');
//       return null;
//     }

//     // Cek apakah status benar-benar berubah
//     if (lastStatus.status === newStatus) {
//       console.log('Status tidak berubah, skip SLA tracking');
//       return null;
//     }

//     // Hitung durasi dari status sebelumnya ke status baru
//     const startTime = new Date(lastStatus.created_at);
//     const endTime = new Date();
//     const durationMs = endTime - startTime;
//     const durationMinutes = Math.floor(durationMs / (1000 * 60));

//     // Validasi durasi tidak negatif
//     if (durationMinutes < 0) {
//       console.error('ERROR: Duration negatif!', {
//         startTime: startTime.toISOString(),
//         endTime: endTime.toISOString()
//       });
//       return null;
//     }

//     // Simpan ke tabel ApplicationSLA
//     const slaRecord = await client.applicationSLA.create({
//       data: {
//         application_id: applicationId,
//         from_status: lastStatus.status,
//         to_status: newStatus,
//         start_time: startTime,
//         end_time: endTime,
//         duration_minutes: durationMinutes,
//         catatan: `Transisi dari ${lastStatus.status} ke ${newStatus}`,
//       },
//     });

//     console.log('SLA tracked successfully:', {
//       application_id: applicationId,
//       from: lastStatus.status,
//       to: newStatus,
//       duration: durationMinutes,
//     });

//     return {
//       from: lastStatus.status,
//       to: newStatus,
//       duration: durationMinutes,
//       sla_id: slaRecord.id,
//     };
//   } catch (error) {
//     console.error('ERROR CALCULATE SLA:', {
//       applicationId,
//       newStatus,
//       error: error.message,
//       stack: error.stack,
//     });
//     throw error;
//   }
// };

// // GET ALL
// exports.getAll = async (req, res) => {
//   try {
//     const data = await prisma.applicationStatus.findMany({
//       include: {
//         application: {
//           select: {
//             kode_pengajuan: true,
//             nama_lengkap: true,
//           },
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
//     });

//     return res.status(200).json({
//       code: 200,
//       message: 'Data status pengajuan berhasil ditemukan',
//       data,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       code: 500,
//       message: error.message || 'Terjadi kesalahan',
//     });
//   }
// };

// // GET BY APPLICATION ID
// exports.getByApplication = async (req, res) => {
//   try {
//     const applicationId = Number(req.params.id);

//     // Jika bukan ADMIN, cek kepemilikan
//     if (req.user.role.name !== 'ADMIN') {
//       const owned = await prisma.creditApplication.findFirst({
//         where: {
//           id: applicationId,
//           email: req.user.email,
//         },
//       });

//       if (!owned) {
//         return res.status(403).json({
//           code: 403,
//           message: 'Anda tidak memiliki akses ke pengajuan ini',
//         });
//       }
//     }

//     const data = await prisma.applicationStatus.findMany({
//       where: { application_id: applicationId },
//       include: {
//         profile: {
//           select: { name: true, email: true },
//         },
//       },
//       orderBy: { created_at: 'desc' },
//     });

//     if (data.length === 0) {
//       return res.status(404).json({
//         code: 404,
//         message: 'Status pengajuan tidak ditemukan',
//       });
//     }

//     return res.status(200).json({
//       code: 200,
//       message: 'Data status pengajuan berhasil ditemukan',
//       data,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       code: 500,
//       message: error.message || 'Terjadi kesalahan',
//     });
//   }
// };

// // CREATE (ADMIN) - Dengan SLA Tracking
// exports.create = async (req, res) => {
//   try {
//     const { application_id, status, catatan } = req.body;

//     if (!application_id || !status) {
//       return res.status(400).json({
//         code: 400,
//         message: 'application_id dan status wajib diisi',
//       });
//     }

//     // Validasi status enum
//     const validStatuses = ['DIAJUKAN', 'DIPROSES', 'DITERIMA', 'DITOLAK'];
//     if (!validStatuses.includes(status.toUpperCase())) {
//       return res.status(400).json({
//         code: 400,
//         message: `Status harus salah satu dari: ${validStatuses.join(', ')}`,
//       });
//     }

//     // Cek application exists
//     const application = await prisma.creditApplication.findUnique({
//       where: { id: Number(application_id) },
//     });

//     if (!application) {
//       return res.status(404).json({
//         code: 404,
//         message: 'Pengajuan tidak ditemukan',
//       });
//     }

//     // Cek profile exists
//     const profile = await prisma.profile.findUnique({
//       where: { id: req.user.id },
//     });

//     if (!profile) {
//       return res.status(404).json({
//         code: 404,
//         message: 'Profile user tidak ditemukan',
//       });
//     }

//     // Transaction untuk create status dan hitung SLA
//     const result = await prisma.$transaction(async (tx) => {
//       // Hitung SLA SEBELUM membuat status baru
//       const slaInfo = await calculateSLA(
//         Number(application_id),
//         status.toUpperCase(),
//         tx
//       );

//       //  Buat status baru
//       const newStatus = await tx.applicationStatus.create({
//         data: {
//           application_id: Number(application_id),
//           status: status.toUpperCase(),
//           catatan: catatan || `Status diubah menjadi ${status}`,
//           changed_by: req.user.id,
//         },
//         include: {
//           profile: {
//             select: {
//               name: true,
//               email: true,
//             },
//           },
//         },
//       });

//       return { newStatus, slaInfo };
//     });

//     return res.status(201).json({
//       code: 201,
//       message: 'Status pengajuan berhasil ditambahkan',
//       data: result.newStatus,
//       sla: result.slaInfo,
//     });
//   } catch (error) {
//     console.error('CREATE STATUS ERROR:', error);
//     return res.status(500).json({
//       code: 500,
//       message: error.message || 'Terjadi kesalahan saat menambahkan status',
//     });
//   }
// };

// // UPDATE
// exports.update = async (req, res) => {
//   try {
//     const { status, catatan } = req.body;
//     const statusId = Number(req.params.id);

//     if (!status || !catatan) {
//       return res.status(400).json({
//         code: 400,
//         message: 'Status dan catatan wajib diisi',
//       });
//     }

//     // Validasi status enum
//     const validStatuses = ['DIAJUKAN', 'DIPROSES', 'DITERIMA', 'DITOLAK'];
//     if (!validStatuses.includes(status.toUpperCase())) {
//       return res.status(400).json({
//         code: 400,
//         message: `Status harus salah satu dari: ${validStatuses.join(', ')}`,
//       });
//     }

//     // Mengambil status
//     const existingStatus = await prisma.applicationStatus.findUnique({
//       where: { id: statusId },
//     });

//     if (!existingStatus) {
//       return res.status(404).json({
//         code: 404,
//         message: 'Status tidak ditemukan',
//       });
//     }

//     // transaction
//     const result = await prisma.$transaction(async (tx) => {
//       let slaInfo = null;

//       // Hitung SLA HANYA jika status berubah
//       if (existingStatus.status !== status.toUpperCase()) {
//         slaInfo = await calculateSLA(
//           existingStatus.application_id,
//           status.toUpperCase(),
//           tx
//         );
//       }

//       // Update status
//       const updatedStatus = await tx.applicationStatus.update({
//         where: { id: statusId },
//         data: {
//           status: status.toUpperCase(),
//           catatan,
//           changed_by: req.user.id,
//           updated_at: new Date(), // Explicit update timestamp
//         },
//         include: {
//           profile: {
//             select: {
//               name: true,
//               email: true,
//             },
//           },
//         },
//       });

//       return { updatedStatus, slaInfo };
//     });

//     return res.status(200).json({
//       code: 200,
//       message: 'Status pengajuan berhasil diperbarui',
//       data: result.updatedStatus,
//       sla: result.slaInfo,
//     });
//   } catch (error) {
//     console.error('UPDATE STATUS ERROR:', error);
//     return res.status(400).json({
//       code: 400,
//       message: error.message || 'Gagal memperbarui status',
//     });
//   }
// };

// // DELETE 
// exports.remove = async (req, res) => {
//   try {
//     await prisma.applicationStatus.delete({
//       where: { id: Number(req.params.id) },
//     });

//     return res.status(200).json({
//       code: 200,
//       message: 'Status pengajuan berhasil dihapus',
//     });
//   } catch (error) {
//     return res.status(400).json({
//       code: 400,
//       message: error.message || 'Gagal menghapus status',
//     });
//   }
// };

// // GET SLA BY APPLICATION ID
// exports.getSLAByApplication = async (req, res) => {
//   try {
//     const applicationId = Number(req.params.id);

//     const slaData = await prisma.applicationSLA.findMany({
//       where: { application_id: applicationId },
//       orderBy: { created_at: 'asc' },
//     });

//     // Hitung total durasi
//     const totalDuration = slaData.reduce((sum, sla) => sum + sla.duration_minutes, 0);

//     return res.status(200).json({
//       code: 200,
//       message: 'Data SLA berhasil ditemukan',
//       data: {
//         transitions: slaData,
//         total_duration_minutes: totalDuration,
//         total_duration_hours: (totalDuration / 60).toFixed(2),
//         total_duration_days: (totalDuration / (60 * 24)).toFixed(2),
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       code: 500,
//       message: error.message || 'Terjadi kesalahan',
//     });
//   }
// };

// // GET ALL SLA - untuk monitoring
// exports.getAllSLA = async (req, res) => {
//   try {
//     const slaData = await prisma.applicationSLA.findMany({
//       include: {
//         application: {
//           select: {
//             kode_pengajuan: true,
//             nama_lengkap: true,
//           },
//         },
//       },
//       orderBy: { created_at: 'desc' },
//     });

//     return res.status(200).json({
//       code: 200,
//       message: 'Data SLA berhasil ditemukan',
//       data: slaData,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       code: 500,
//       message: error.message || 'Terjadi kesalahan',
//     });
//   }
// };