/**
 * ============================================================
 * SISTEM DIGITAL ARSIP PENGGAJIAN
 * Dinas Pendidikan Provinsi Sumatera Utara
 * ============================================================
 *
 * Struktur Sheet:
 *   USERS          : Data pengguna (admin & operator)
 *   INPUT          : Form input data layanan
 *   DATA           : Penyimpanan data utama
 *   REKAP_BULANAN  : Rekapitulasi bulanan
 *   DASHBOARD      : Data dashboard (computed)
 */

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  SPREADSHEET_ID: '', // Kosongkan untuk active spreadsheet
  SHEETS: {
    USERS: 'USERS',
    INPUT: 'INPUT',
    DATA: 'DATA',
    REKAP_BULANAN: 'REKAP_BULANAN',
    DASHBOARD: 'DASHBOARD',
    SEKOLAH: 'SEKOLAH'
  },
  URUSAN_LIST: [
    'Kenaikan Gaji Berkala',
    'Kenaikan Pangkat',
    'Perubahan Tunjangan Keluarga',
    'Pensiun',
    'Mutasi'
  ],
  OPERATOR_LIST: [
    'Wahyu Sudarmadi, A.Md',
    'Dahlia Istiqma, S.E.',
    'Hendra Gunawan',
    'Heri Pribadi Nasution',
    'Amir Hakim, S.Kom',
    'Ranni Simanjuntak, S.Kom'
  ],
  SATUAN_KERJA_MAP: {
    'Cabang Dinas Wilayah I': ['Kota Medan', 'Kabupaten Deli Serdang'],
    'Cabang Dinas Wilayah II': ['Kota Binjai', 'Kabupaten Langkat'],
    'Cabang Dinas Wilayah III': ['Kabupaten Serdang Bedagai', 'Kota Tebing Tinggi'],
    'Cabang Dinas Wilayah IV': ['Kabupaten Karo', 'Kabupaten Dairi', 'Kabupaten Pakpak Bharat'],
    'Cabang Dinas Wilayah V': ['Kabupaten Batubara', 'Kabupaten Asahan', 'Kota Tanjungbalai'],
    'Cabang Dinas Wilayah VI': ['Kota Pematang Siantar', 'Kabupaten Simalungun'],
    'Cabang Dinas Wilayah VII': ['Kabupaten Labuhan Batu', 'Kabupaten Labuhan Batu Utara', 'Kabupaten Labuhan Batu Selatan'],
    'Cabang Dinas Wilayah VIII': ['Kabupaten Toba', 'Kabupaten Samosir'],
    'Cabang Dinas Wilayah IX': ['Kabupaten Humbang Hasundutan', 'Kabupaten Tapanuli Utara'],
    'Cabang Dinas Wilayah X': ['Kabupaten Tapanuli Tengah', 'Kota Sibolga'],
    'Cabang Dinas Wilayah XI': ['Kabupaten Tapanuli Selatan', 'Kabupaten Mandailing Natal', 'Kota Padangsidempuan'],
    'Cabang Dinas Wilayah XII': ['Kabupaten Padang Lawas', 'Kabupaten Padang Lawas Utara'],
    'Cabang Dinas Wilayah XIII': ['Kabupaten Nias', 'Kabupaten Nias Utara', 'Kota Gunungsitoli'],
    'Cabang Dinas Wilayah XIV': ['Kabupaten Nias Barat', 'Kabupaten Nias Selatan'],
    'Dinas Pendidikan Provinsi Sumatera Utara': ['Kota Medan'],
    'UPTD TIKP Dinas Pendidikan Provinsi Sumatera Utara': ['Kota Medan']
  },
  KAB_KOTA_LIST: [
    'Kota Medan', 'Kabupaten Deli Serdang',
    'Kota Binjai', 'Kabupaten Langkat',
    'Kabupaten Serdang Bedagai', 'Kota Tebing Tinggi',
    'Kabupaten Karo', 'Kabupaten Dairi', 'Kabupaten Pakpak Bharat',
    'Kabupaten Batubara', 'Kabupaten Asahan', 'Kota Tanjungbalai',
    'Kota Pematang Siantar', 'Kabupaten Simalungun',
    'Kabupaten Labuhan Batu', 'Kabupaten Labuhan Batu Utara', 'Kabupaten Labuhan Batu Selatan',
    'Kabupaten Toba', 'Kabupaten Samosir',
    'Kabupaten Humbang Hasundutan', 'Kabupaten Tapanuli Utara',
    'Kabupaten Tapanuli Tengah', 'Kota Sibolga',
    'Kabupaten Tapanuli Selatan', 'Kabupaten Mandailing Natal', 'Kota Padangsidempuan',
    'Kabupaten Padang Lawas', 'Kabupaten Padang Lawas Utara',
    'Kabupaten Nias', 'Kabupaten Nias Utara', 'Kota Gunungsitoli',
    'Kabupaten Nias Barat', 'Kabupaten Nias Selatan'
  ],
  DEFAULT_ADMIN: {
    username: 'admin',
    password: 'admin123',
    nama: 'Administrator',
    role: 'admin'
  },
  SESSION_DURATION: 21600 // 6 hours in seconds
};

// ============================================================
// WEB APP ENTRY POINTS
// ============================================================

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Sistem Digital Arsip Penggajian - Dinas Pendidikan Prov. Sumatera Utara')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ============================================================
// SPREADSHEET HELPERS
// ============================================================

function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ============================================================
// PASSWORD & SESSION
// ============================================================

function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + '_arsip_penggajian_sumut'
  );
  return digest
    .map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2))
    .join('');
}

function createSession(username, role, nama) {
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put(
    'session_' + token,
    JSON.stringify({ username: username, role: role, nama: nama }),
    CONFIG.SESSION_DURATION
  );
  return token;
}

function verifySession(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const data = cache.get('session_' + token);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function destroySession(token) {
  if (!token) return;
  const cache = CacheService.getScriptCache();
  cache.remove('session_' + token);
}

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Login user
 * @param {string} username
 * @param {string} password
 * @return {Object} Result with token and user info
 */
function login(username, password) {
  try {
    if (!username || !password) {
      return { status: 'error', message: 'Username dan password harus diisi.' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { status: 'error', message: 'Belum ada user terdaftar. Jalankan inisialisasi.' };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    const hashedPw = hashPassword(password);

    for (const row of data) {
      if (row[0] === username && row[1] === hashedPw && row[4] === 'active') {
        const token = createSession(row[0], row[2], row[3]);
        return {
          status: 'success',
          token: token,
          username: row[0],
          role: row[2],
          nama: row[3],
          message: 'Login berhasil!'
        };
      }
    }

    return { status: 'error', message: 'Username atau password salah.' };
  } catch (error) {
    return { status: 'error', message: 'Gagal login: ' + error.message };
  }
}

/**
 * Logout user
 * @param {string} token
 */
function logout(token) {
  destroySession(token);
  return { status: 'success', message: 'Berhasil logout.' };
}

/**
 * Check session validity
 * @param {string} token
 * @return {Object} Session info or null
 */
function checkSession(token) {
  const session = verifySession(token);
  if (!session) {
    return { status: 'expired', message: 'Sesi telah berakhir.' };
  }
  return { status: 'valid', username: session.username, role: session.role, nama: session.nama };
}

// ============================================================
// USER MANAGEMENT (Admin Only)
// ============================================================

/**
 * Get all users (admin only)
 * @param {string} token - Admin session token
 * @return {Array} Users list
 */
function getAllUsers(token) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin.' };
  }

  try {
    const sheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    return data.map(row => ({
      username: row[0],
      role: row[2],
      nama: row[3],
      status: row[4],
      createdAt: row[5] ? Utilities.formatDate(new Date(row[5]), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm') : ''
    }));
  } catch (error) {
    Logger.log('Error getAllUsers: ' + error.message);
    return [];
  }
}

/**
 * Add a new user (admin only)
 * @param {string} token - Admin session token
 * @param {Object} userData - { username, password, nama, role }
 * @return {Object} Result
 */
function addUser(token, userData) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin.' };
  }

  try {
    if (!userData.username || !userData.password || !userData.nama || !userData.role) {
      return { status: 'error', message: 'Semua field harus diisi.' };
    }

    if (userData.username.length < 3) {
      return { status: 'error', message: 'Username minimal 3 karakter.' };
    }

    if (userData.password.length < 5) {
      return { status: 'error', message: 'Password minimal 5 karakter.' };
    }

    if (!['admin', 'operator'].includes(userData.role)) {
      return { status: 'error', message: 'Role harus admin atau operator.' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
    const lastRow = sheet.getLastRow();

    // Check duplicate username
    if (lastRow > 1) {
      const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (const row of usernames) {
        if (row[0] === userData.username) {
          return { status: 'error', message: 'Username sudah digunakan.' };
        }
      }
    }

    const hashedPw = hashPassword(userData.password);
    sheet.appendRow([
      userData.username,
      hashedPw,
      userData.role,
      userData.nama,
      'active',
      new Date()
    ]);

    return { status: 'success', message: `User "${userData.username}" berhasil ditambahkan sebagai ${userData.role}.` };
  } catch (error) {
    return { status: 'error', message: 'Gagal menambahkan user: ' + error.message };
  }
}

/**
 * Get daftar sekolah berdasarkan Kab/Kota
 */
function getSekolahByKabKota(kabKota) {
  try {
    let sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SEKOLAH);
    
    // Auto-inisialisasi jika sheet SEKOLAH belum ada
    if (!sheet) {
      initializeSheets();
      sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SEKOLAH);
    }
    
    const result = [];
    const targetKb = kabKota ? String(kabKota).trim().toLowerCase() : "";
    
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
        for (let i = 0; i < data.length; i++) {
          const cellKb = data[i][0] ? String(data[i][0]).trim().toLowerCase() : "";
          const cellSek = data[i][1] ? String(data[i][1]).trim() : "";
          
          if (cellKb === targetKb && cellSek) {
            result.push(cellSek);
          }
        }
      }
    }
    
    // Fallback cerdas: Jika belum ada satupun data di Sheet untuk Kab/Kota tersebut,
    // maka berikan contoh 1 data dummy otomatis agar dropdown tidak pernah kosong.
    if (result.length === 0 && kabKota) {
      result.push('SMAN 1 ' + String(kabKota).replace('Kota ', '').replace('Kabupaten ', ''));
    }
    
    return result;
  } catch (e) {
    return ['Error Backend: ' + e.message];
  }
}

/**
 * Update a user (admin only)
 * @param {string} token
 * @param {Object} userData - { username, password (optional), nama, role, status }
 * @return {Object} Result
 */
function updateUser(token, userData) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin.' };
  }

  try {
    const sheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: 'error', message: 'User tidak ditemukan.' };

    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === userData.username) {
        // Update nama
        if (userData.nama) sheet.getRange(i + 2, 4).setValue(userData.nama);
        // Update role
        if (userData.role) sheet.getRange(i + 2, 3).setValue(userData.role);
        // Update status
        if (userData.status) sheet.getRange(i + 2, 5).setValue(userData.status);
        // Update password (if provided)
        if (userData.password && userData.password.length >= 5) {
          sheet.getRange(i + 2, 2).setValue(hashPassword(userData.password));
        }

        return { status: 'success', message: `User "${userData.username}" berhasil diperbarui.` };
      }
    }

    return { status: 'error', message: 'User tidak ditemukan.' };
  } catch (error) {
    return { status: 'error', message: 'Gagal memperbarui user: ' + error.message };
  }
}

/**
 * Delete a user (admin only)
 * @param {string} token
 * @param {string} username
 * @return {Object} Result
 */
function deleteUser(token, username) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin.' };
  }

  try {
    if (username === session.username) {
      return { status: 'error', message: 'Tidak dapat menghapus akun sendiri.' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: 'error', message: 'User tidak ditemukan.' };

    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === username) {
        sheet.deleteRow(i + 2);
        return { status: 'success', message: `User "${username}" berhasil dihapus.` };
      }
    }

    return { status: 'error', message: 'User tidak ditemukan.' };
  } catch (error) {
    return { status: 'error', message: 'Gagal menghapus user: ' + error.message };
  }
}

/**
 * Reset user password (admin only)
 * @param {string} token
 * @param {string} username
 * @param {string} newPassword
 * @return {Object} Result
 */
function resetPassword(token, username, newPassword) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin.' };
  }

  if (!newPassword || newPassword.length < 5) {
    return { status: 'error', message: 'Password baru minimal 5 karakter.' };
  }

  return updateUser(token, { username: username, password: newPassword });
}

// ============================================================
// INITIALIZATION
// ============================================================

function initializeSheets() {
  // USERS sheet
  const usersSheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow(['Username', 'Password', 'Role', 'Nama', 'Status', 'Created At']);
    usersSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    usersSheet.setFrozenRows(1);

    // Create default admin
    usersSheet.appendRow([
      CONFIG.DEFAULT_ADMIN.username,
      hashPassword(CONFIG.DEFAULT_ADMIN.password),
      CONFIG.DEFAULT_ADMIN.role,
      CONFIG.DEFAULT_ADMIN.nama,
      'active',
      new Date()
    ]);
  }

  // INPUT sheet
  const inputSheet = getOrCreateSheet(CONFIG.SHEETS.INPUT);
  if (inputSheet.getLastRow() === 0) {
    inputSheet.appendRow([
      'Kab/Kota', 'Satuan Kerja', 'Nama Pemohon', 'NIP', 'Jabatan',
      'Unit Kerja', 'Urusan', 'No HP', 'Operator', 'Timestamp'
    ]);
    inputSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    inputSheet.setFrozenRows(1);
  }

  // DATA sheet
  const dataSheet = getOrCreateSheet(CONFIG.SHEETS.DATA);
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow([
      'ID', 'Kab/Kota', 'Satuan Kerja', 'Nama Pemohon', 'NIP', 'Jabatan',
      'Unit Kerja', 'Urusan', 'No HP', 'Operator', 'Timestamp'
    ]);
    dataSheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    dataSheet.setFrozenRows(1);
  }

  // REKAP_BULANAN sheet
  const rekapSheet = getOrCreateSheet(CONFIG.SHEETS.REKAP_BULANAN);
  if (rekapSheet.getLastRow() === 0) {
    rekapSheet.appendRow([
      'Bulan', 'NIP', 'Nama', 'Asal Sekolah', 'Kab/Kota',
      'Gaji Kotor', 'TMT Kepangkatan', 'TMT Gaji', 'TMT'
    ]);
    rekapSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    rekapSheet.setFrozenRows(1);
  }

  // DASHBOARD sheet
  const dashboardSheet = getOrCreateSheet(CONFIG.SHEETS.DASHBOARD);
  if (dashboardSheet.getLastRow() === 0) {
    dashboardSheet.appendRow(['Kategori', 'Total']);
    dashboardSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    dashboardSheet.setFrozenRows(1);
  }

  // SEKOLAH sheet
  const sekolahSheet = getOrCreateSheet(CONFIG.SHEETS.SEKOLAH);
  if (sekolahSheet.getLastRow() === 0) {
    sekolahSheet.appendRow(['Kab/Kota', 'Nama Sekolah', 'Jenjang']);
    sekolahSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    sekolahSheet.setFrozenRows(1);
    
    // Add some dummy schools
    const dummySchools = [
      ['Kota Medan', 'SMAN 1 Medan', 'SMA'],
      ['Kota Medan', 'SMKN 1 Medan', 'SMK'],
      ['Kota Medan', 'SLB Negeri 1 Medan', 'SLB'],
      ['Kabupaten Deli Serdang', 'SMAN 1 Lubuk Pakam', 'SMA'],
      ['Kota Binjai', 'SMAN 1 Binjai', 'SMA']
    ];
    sekolahSheet.getRange(2, 1, dummySchools.length, 3).setValues(dummySchools);
  }

  return 'Semua sheet berhasil diinisialisasi!';
}

// ============================================================
// DATA OPERATIONS
// ============================================================

function generateId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ASN-${y}${m}${d}-${rand}`;
}

/**
 * Submit new data from the form
 */
function submitData(formData) {
  try {
    const timestamp = new Date();
    const id = generateId();

    const inputSheet = getOrCreateSheet(CONFIG.SHEETS.INPUT);
    inputSheet.appendRow([
      formData.kabKota, formData.satuanKerja, formData.namaPemohon,
      formData.nip, formData.jabatan, formData.unitKerja, formData.urusan,
      formData.noHp, formData.operator, timestamp
    ]);

    const dataSheet = getOrCreateSheet(CONFIG.SHEETS.DATA);
    dataSheet.appendRow([
      id, formData.kabKota, formData.satuanKerja, formData.namaPemohon,
      formData.nip, formData.jabatan, formData.unitKerja, formData.urusan,
      formData.noHp, formData.operator, timestamp
    ]);

    updateDashboard();

    return { status: 'success', message: `Data berhasil disimpan dengan ID: ${id}`, id: id };
  } catch (error) {
    return { status: 'error', message: `Gagal menyimpan data: ${error.message}` };
  }
}

/**
 * Get all data from DATA sheet
 */
function getAllData() {
  try {
    const dataSheet = getOrCreateSheet(CONFIG.SHEETS.DATA);
    const lastRow = dataSheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = dataSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    return data.map(row => ({
      id: row[0],
      kabKota: row[1],
      satuanKerja: row[2],
      namaPemohon: row[3],
      nip: row[4],
      jabatan: row[5],
      unitKerja: row[6],
      urusan: row[7],
      noHp: row[8],
      operator: row[9],
      timestamp: row[10] ? Utilities.formatDate(new Date(row[10]), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss') : ''
    }));
  } catch (error) {
    Logger.log('Error getAllData: ' + error.message);
    return [];
  }
}

/**
 * Delete a data entry by ID (admin only)
 */
function deleteData(token, id) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin yang dapat menghapus data.' };
  }

  try {
    const dataSheet = getOrCreateSheet(CONFIG.SHEETS.DATA);
    const lastRow = dataSheet.getLastRow();
    if (lastRow <= 1) return { status: 'error', message: 'Data tidak ditemukan.' };

    const data = dataSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === id) {
        dataSheet.deleteRow(i + 2);
        updateDashboard();
        return { status: 'success', message: `Data dengan ID ${id} berhasil dihapus.` };
      }
    }
    return { status: 'error', message: 'ID tidak ditemukan.' };
  } catch (error) {
    return { status: 'error', message: `Gagal menghapus data: ${error.message}` };
  }
}

// ============================================================
// REKAP BULANAN — Auto-generate from DATA sheet
// ============================================================

function getMonthlyRecapData() {
  try {
    const dataSheet = getOrCreateSheet(CONFIG.SHEETS.DATA);
    const lastRow = dataSheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = dataSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    const byMonth = {};

    data.forEach(row => {
      const timestamp = row[10];
      if (!timestamp) return;
      const d = new Date(timestamp);
      const monthKey = Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM');
      const monthLabel = Utilities.formatDate(d, 'Asia/Jakarta', 'MMMM yyyy');

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          bulan: monthKey, label: monthLabel, total: 0,
          kgb: 0, kp: 0, pensiun: 0, ptk: 0, mutasi: 0, entries: []
        };
      }

      byMonth[monthKey].total++;
      const urusan = row[7];
      switch (urusan) {
        case 'Kenaikan Gaji Berkala': byMonth[monthKey].kgb++; break;
        case 'Kenaikan Pangkat': byMonth[monthKey].kp++; break;
        case 'Pensiun': byMonth[monthKey].pensiun++; break;
        case 'Perubahan Tunjangan Keluarga': byMonth[monthKey].ptk++; break;
        case 'Mutasi': byMonth[monthKey].mutasi++; break;
      }

      byMonth[monthKey].entries.push({
        id: row[0], kabKota: row[1], satuanKerja: row[2], namaPemohon: row[3],
        nip: row[4], jabatan: row[5], unitKerja: row[6], urusan: row[7],
        noHp: row[8], operator: row[9],
        timestamp: Utilities.formatDate(d, 'Asia/Jakarta', 'dd/MM/yyyy')
      });
    });

    return Object.values(byMonth).sort((a, b) => b.bulan.localeCompare(a.bulan));
  } catch (error) {
    Logger.log('Error getMonthlyRecapData: ' + error.message);
    return [];
  }
}

// ============================================================
// DASHBOARD OPERATIONS
// ============================================================

function getDashboardStats() {
  try {
    const dataSheet = getOrCreateSheet(CONFIG.SHEETS.DATA);
    const lastRow = dataSheet.getLastRow();

    if (lastRow <= 1) {
      return {
        totalKeseluruhan: 0, kenaikanGajiBerkala: 0, kenaikanPangkat: 0,
        pensiun: 0, perubahanTunjanganKeluarga: 0, mutasi: 0,
        perKabKota: {}, perBulan: {}, perSatuanKerja: {}
      };
    }

    const data = dataSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    let stats = {
      totalKeseluruhan: data.length, kenaikanGajiBerkala: 0,
      kenaikanPangkat: 0, pensiun: 0, perubahanTunjanganKeluarga: 0,
      mutasi: 0, perKabKota: {}, perBulan: {}, perSatuanKerja: {}
    };

    data.forEach(row => {
      const urusan = row[7];
      const kabKota = row[1];
      const timestamp = row[10];

      switch (urusan) {
        case 'Kenaikan Gaji Berkala': stats.kenaikanGajiBerkala++; break;
        case 'Kenaikan Pangkat': stats.kenaikanPangkat++; break;
        case 'Pensiun': stats.pensiun++; break;
        case 'Perubahan Tunjangan Keluarga': stats.perubahanTunjanganKeluarga++; break;
        case 'Mutasi': stats.mutasi++; break;
      }

      if (kabKota) stats.perKabKota[kabKota] = (stats.perKabKota[kabKota] || 0) + 1;
      const satuanKerja = row[2];
      if (satuanKerja) stats.perSatuanKerja[satuanKerja] = (stats.perSatuanKerja[satuanKerja] || 0) + 1;
      if (timestamp) {
        const monthKey = Utilities.formatDate(new Date(timestamp), 'Asia/Jakarta', 'yyyy-MM');
        stats.perBulan[monthKey] = (stats.perBulan[monthKey] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    Logger.log('Error getDashboardStats: ' + error.message);
    return {
      totalKeseluruhan: 0, kenaikanGajiBerkala: 0, kenaikanPangkat: 0,
      pensiun: 0, perubahanTunjanganKeluarga: 0, mutasi: 0,
      perKabKota: {}, perBulan: {}, perSatuanKerja: {}
    };
  }
}

function updateDashboard() {
  try {
    const stats = getDashboardStats();
    const dashboardSheet = getOrCreateSheet(CONFIG.SHEETS.DASHBOARD);
    const lastRow = dashboardSheet.getLastRow();
    if (lastRow > 1) dashboardSheet.getRange(2, 1, lastRow - 1, 2).clearContent();

    const summaryData = [
      ['Total Keseluruhan', stats.totalKeseluruhan],
      ['Kenaikan Gaji Berkala', stats.kenaikanGajiBerkala],
      ['Kenaikan Pangkat', stats.kenaikanPangkat],
      ['Pensiun', stats.pensiun],
      ['Perubahan Tunjangan Keluarga', stats.perubahanTunjanganKeluarga],
      ['Mutasi', stats.mutasi]
    ];

    dashboardSheet.getRange(2, 1, summaryData.length, 2).setValues(summaryData);
    dashboardSheet.autoResizeColumns(1, 2);
  } catch (error) {
    Logger.log('Error updateDashboard: ' + error.message);
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getFormOptions() {
  return {
    kabKotaList: CONFIG.KAB_KOTA_LIST,
    urusanList: CONFIG.URUSAN_LIST,
    satuanKerjaMap: CONFIG.SATUAN_KERJA_MAP,
    operatorList: CONFIG.OPERATOR_LIST
  };
}

function searchData(keyword) {
  try {
    const allData = getAllData();
    if (!keyword || keyword.trim() === '') return allData;
    const lowerKeyword = keyword.toLowerCase();
    return allData.filter(item =>
      Object.values(item).some(val => String(val).toLowerCase().includes(lowerKeyword))
    );
  } catch (error) {
    Logger.log('Error searchData: ' + error.message);
    return [];
  }
}

function exportData() {
  try {
    const ss = getSpreadsheet();
    const newSs = SpreadsheetApp.create('Export Arsip Penggajian - ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd-MM-yyyy'));

    const dataSheet = ss.getSheetByName(CONFIG.SHEETS.DATA);
    if (dataSheet) dataSheet.copyTo(newSs).setName('DATA');

    const rekapSheet = ss.getSheetByName(CONFIG.SHEETS.REKAP_BULANAN);
    if (rekapSheet) rekapSheet.copyTo(newSs).setName('REKAP_BULANAN');

    const defaultSheet = newSs.getSheetByName('Sheet1');
    if (defaultSheet && newSs.getSheets().length > 1) newSs.deleteSheet(defaultSheet);

    return newSs.getUrl();
  } catch (error) {
    return null;
  }
}

// ============================================================
// DUMMY DATA GENERATOR
// ============================================================

function generateDummyData(token) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin.' };
  }

  try {
    initializeSheets();

    const dataSheet = getOrCreateSheet(CONFIG.SHEETS.DATA);
    const inputSheet = getOrCreateSheet(CONFIG.SHEETS.INPUT);
    const rekapSheet = getOrCreateSheet(CONFIG.SHEETS.REKAP_BULANAN);

    const namaList = [
      'Budi Hartono, S.Pd', 'Siti Aminah, M.Pd', 'Ahmad Fauzi, S.Pd',
      'Dewi Lestari, S.Pd', 'Joko Susanto, M.Pd', 'Rina Wati, S.Pd',
      'Muhammad Rizki, S.Pd', 'Nurul Hidayah, M.Pd', 'Eko Prasetyo, S.Pd',
      'Sri Wahyuni, S.Pd', 'Teguh Widodo, M.Pd', 'Ani Suryani, S.Pd',
      'Hendra Gunawan, S.Pd', 'Ratna Dewi, M.Pd', 'Agus Setiawan, S.Pd',
      'Yuni Astuti, S.Pd', 'Bambang Kusumo, M.Pd', 'Linda Permatasari, S.Pd',
      'Dian Purnama, S.Pd', 'Rudi Hermawan, M.Pd', 'Fitriani, S.Pd',
      'Wahyu Nugroho, S.Pd', 'Endang Rahayu, M.Pd', 'Arief Budiman, S.Pd',
      'Marlina Situmorang, S.Pd', 'Pardomuan Simanjuntak, M.Pd', 'Tiurma Siahaan, S.Pd',
      'Baginda Harahap, S.Pd', 'Rosmawati Lubis, M.Pd', 'Darwin Tarigan, S.Pd',
      'Khadijah Nasution, S.Pd', 'Irwan Simbolon, M.Pd', 'Nurhasanah Siregar, S.Pd',
      'Parlindungan Manurung, S.Pd', 'Seri Bulan Hutabarat, M.Pd', 'Jonni Panjaitan, S.Pd',
      'Masniari Purba, S.Pd', 'Binsar Simatupang, M.Pd', 'Rosmaida Silalahi, S.Pd',
      'Tumpal Aritonang, S.Pd', 'Dermawati Saragih, M.Pd', 'Hotman Pasaribu, S.Pd',
      'Rosliana Daulay, S.Pd', 'Edison Sinaga, M.Pd', 'Meilin Tampubolon, S.Pd',
      'Sahat Nainggolan, S.Pd', 'Tigor Hutapea, M.Pd', 'Resmi Ginting, S.Pd',
      'Nova Sitompul, S.Pd', 'Lasma Siagian, M.Pd'
    ];

    const jabatanList = [
      'Guru', 'Guru Besar', 'Kepala Sekolah', 'Wakil Kepala Sekolah',
      'Guru Mata Pelajaran', 'Guru BK', 'Pengawas Sekolah',
      'Staf TU', 'Kepala TU', 'Guru PJOK'
    ];

    const jabatanInternalList = [
      'Staf Umum dan Kepegawaian', 'Staf Keuangan', 'Staf PSMA', 'Staf PSMK',
      'Staf PPK', 'Staf GTK', 'Staf Sekretariat', 'Kepala Dinas', 'Sekretaris Dinas'
    ];

    const dummySchoolsMap = {
      'Kota Medan': ['SMAN 1 Medan', 'SMKN 1 Medan', 'SLB Negeri 1 Medan'],
      'Kabupaten Deli Serdang': ['SMAN 1 Lubuk Pakam'],
      'Kota Binjai': ['SMAN 1 Binjai']
    };

    const satuanKerjaKeys = Object.keys(CONFIG.SATUAN_KERJA_MAP);

    const urusanWeighted = [
      'Kenaikan Gaji Berkala', 'Kenaikan Gaji Berkala', 'Kenaikan Gaji Berkala',
      'Kenaikan Gaji Berkala', 'Kenaikan Gaji Berkala', 'Kenaikan Gaji Berkala',
      'Kenaikan Pangkat', 'Kenaikan Pangkat', 'Kenaikan Pangkat', 'Kenaikan Pangkat',
      'Perubahan Tunjangan Keluarga', 'Perubahan Tunjangan Keluarga', 'Perubahan Tunjangan Keluarga',
      'Pensiun', 'Pensiun', 'Mutasi', 'Mutasi'
    ];

    const nipPrefix = ['19750', '19800', '19850', '19900', '19950', '19680', '19720', '19780'];

    function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randomPhone() { return '08' + String(Math.floor(Math.random() * 10000000000)).padStart(10, '0'); }
    function randomNip() { return randomItem(nipPrefix) + String(Math.floor(Math.random() * 100000000)).padStart(8, '0') + String(Math.floor(Math.random() * 1000)).padStart(3, '0'); }
    function randomDate() {
      // Januari 2025 – Maret 2026
      const start = new Date(2025, 0, 1).getTime();
      const end = new Date(2026, 2, 31).getTime();
      const d = new Date(start + Math.random() * (end - start));
      d.setHours(Math.floor(Math.random() * 12) + 7, Math.floor(Math.random() * 60), 0, 0);
      return d;
    }

    const dummyCount = 50;
    const dataRows = [];
    const inputRows = [];

    for (let i = 0; i < dummyCount; i++) {
      const ts = randomDate();
      const id = `ASN-${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const sk = randomItem(satuanKerjaKeys);
      const kabKotaOptions = CONFIG.SATUAN_KERJA_MAP[sk];
      const kk = randomItem(kabKotaOptions);
      const nm = namaList[i % namaList.length];
      const nip = randomNip();
      
      // Sync Unit Kerja and Jabatan
      let uk = "";
      let jb = "";
      
      const isDinasUtama = sk === 'Dinas Pendidikan Provinsi Sumatera Utara' || sk === 'UPTD TIKP Dinas Pendidikan Provinsi Sumatera Utara';
      // 15% chance to be Pegawai Internal (Cabang Dinas)
      const isInternal = Math.random() < 0.15;
      
      if (isDinasUtama) {
        uk = '-';
        jb = randomItem(jabatanInternalList);
      } else if (isInternal) {
        uk = 'Kantor ' + sk;
        jb = randomItem(jabatanInternalList);
      } else {
        jb = randomItem(jabatanList);
        if (dummySchoolsMap[kk]) {
          uk = randomItem(dummySchoolsMap[kk]);
        } else {
          uk = 'SMAN 1 ' + kk.replace('Kota ', '').replace('Kabupaten ', '');
        }
      }

      const ur = randomItem(urusanWeighted);
      const hp = randomPhone();
      const op = randomItem(CONFIG.OPERATOR_LIST);

      dataRows.push([id, kk, sk, nm, nip, jb, uk, ur, hp, op, ts]);
      inputRows.push([kk, sk, nm, nip, jb, uk, ur, hp, op, ts]);
    }

    if (dataRows.length > 0) dataSheet.getRange(dataSheet.getLastRow() + 1, 1, dataRows.length, 11).setValues(dataRows);
    if (inputRows.length > 0) inputSheet.getRange(inputSheet.getLastRow() + 1, 1, inputRows.length, 10).setValues(inputRows);

    updateDashboard();
    return { status: 'success', message: `Berhasil generate ${dummyCount} data layanan dummy!` };
  } catch (error) {
    return { status: 'error', message: `Gagal generate dummy data: ${error.message}` };
  }
}

function clearAllData(token) {
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    return { status: 'error', message: 'Akses ditolak. Hanya admin.' };
  }

  try {
    const sheets = [CONFIG.SHEETS.INPUT, CONFIG.SHEETS.DATA, CONFIG.SHEETS.REKAP_BULANAN, CONFIG.SHEETS.DASHBOARD];
    sheets.forEach(sheetName => {
      const sheet = getOrCreateSheet(sheetName);
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    });
    return { status: 'success', message: 'Semua data berhasil dihapus!' };
  } catch (error) {
    return { status: 'error', message: `Gagal menghapus data: ${error.message}` };
  }
}

// ============================================================
// MENU & TRIGGERS
// ============================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📋 Arsip Penggajian')
    .addItem('🔧 Inisialisasi Sheet', 'initializeSheets')
    .addItem('📊 Update Dashboard', 'updateDashboard')
    .addItem('🌐 Buka Web App', 'openWebApp')
    .addToUi();
}

function openWebApp() {
  const url = ScriptApp.getService().getUrl();
  const html = HtmlService.createHtmlOutput(
    `<script>window.open("${url}");google.script.host.close();</script>`
  ).setWidth(200).setHeight(50);
  SpreadsheetApp.getUi().showModalDialog(html, 'Membuka Web App...');
}
