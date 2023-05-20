//use path module
const path = require('path');
//use express module
const express = require('express');
//use hbs view engine
const hbs = require('hbs');
//use bodyParser middleware
const bodyParser = require('body-parser');
//use mysql database
const mysql = require('mysql');

const app = express();

//konfigurasi koneksi
const conn = mysql.createConnection({
  host: 'sql12.freesqldatabase.com',
  user: 'sql12619673',
  password: 'A9SaTxhQ1H',
  database: 'sql12619673'
});

//connect ke database
conn.connect((err) => {
  if (err) throw err;
  console.log('Mysql Connected...');
});

//set views file
app.set('views', path.join(__dirname, 'views'));
//set view engine
app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//set folder public sebagai static folder untuk static file
app.use('/assets', express.static(path.join(__dirname, 'public')));

hbs.registerHelper('inc', function (value, options) {
  return parseInt(value) + 1;
});

// formatDate
hbs.registerHelper('formatDate', function (date) {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
  });
  return formattedDate;
});

hbs.registerHelper('formatRupiah', function(saldo) {
  let rupiah = 'Rp' + saldo.toLocaleString('id-ID');
  return rupiah;
});

// Route untuk homepage
app.get('/', (req, res) => {
  let sql = "SELECT * FROM tbl_transaksi";
  let query = conn.query(sql, (err, results) => {
    if (err) throw err;

    // Calculate total saldo
    let totalSaldo = 0;
    let saldoMasuk = 0;
    let saldoKeluar = 0;
    for (let i = 0; i < results.length; i++) {
      totalSaldo += results[i].saldo;
      saldoMasuk += results[i].kas_masuk;
      saldoKeluar += results[i].kas_keluar;
    }

    res.render('dashboard', {
      saldoMasuk: saldoMasuk,
      saldoKeluar: saldoKeluar,
      totalSaldo: totalSaldo
    });
  });
});

app.get('/kas-masuk', (req, res) => {
  // query untuk data no buti terakhir
  let sql = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_keluar IS NULL OR tbl_transaksi.kas_keluar = '' ORDER BY no_bukti DESC";
  // query untuk menampilkan data kedalam tabel
  let sql2 = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_keluar IS NULL OR tbl_transaksi.kas_keluar = '' ORDER BY no_bukti ASC";

  conn.query(sql, (err, results) => {
      if (err) {
          console.error('Error saat mengambil data nomor bukti:', err);
          throw err;
      }

      let lastBuktiNumber = results.length > 0 ? results[0].no_bukti : 'BKM-000';
      let counter = parseInt(lastBuktiNumber.split('-')[1]) + 1;
      const buktiNumber = 'BKM-' + counter.toString().padStart(3, '0');

      conn.query(sql2, (err, data) => {
          if (err) {
              console.error('Error saat mengambil data untuk tabel:', err);
              throw err;
          }

          let sqlAkun = "SELECT no_akun, nm_akun FROM tbl_akun";
          conn.query(sqlAkun, (err, options) => {
              if (err) {
                  console.error('Error saat mengambil data akun:', err);
                  throw err;
              }

              res.render('kas-masuk', {
                  results: data,
                  options: options,
                  buktiNumber: buktiNumber,
              
              });
          });
      });
  });
});

app.post('/addKasmasuk', (req, res) => {
  let data = {
      tgl: req.body.tgl,
      no_bukti: req.body.no_bukti,
      tujuan: req.body.tujuan,
      no_akun: req.body.no_akun,
      jumlah: req.body.jumlah,
      tipe: "DEBET",
      kas_masuk: req.body.jumlah, // Jumlah kas masuk
      kas_keluar: 0 // Kas keluar diatur menjadi 0
  };

  // Mengambil saldo saat ini dari transaksi terakhir
  let getSaldoQuery = "SELECT saldo FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
  conn.query(getSaldoQuery, (err, result) => {
      if (err) {
          console.error('Error saat mengambil saldo:', err);
          throw err;
      }

      let saldo = 0;
      if (result.length > 0) {
          saldo = result[0].saldo; // Nilai saldo saat ini
      }

      let jumlahKasMasuk = parseInt(req.body.jumlah);

      // Memperbarui saldo dengan menambahkan jumlah kas masuk
      let updatedSaldo = saldo + jumlahKasMasuk;

      // Menyimpan data transaksi kas masuk dan memperbarui saldo
      let updateAndInsertQuery = "INSERT INTO tbl_transaksi SET ?, saldo = ?";
      conn.query(updateAndInsertQuery, [data, updatedSaldo], (err, result) => {
          if (err) {
              console.error('Error saat menyimpan data:', err);
              throw err;
          }
          res.redirect('/kas-masuk');
      });
  });
});


//edit kas masuk
app.post('/editKasmasuk', (req, res) => {
  const idTrans = req.body.id_trans;
  const tgl = req.body.tgl;
  const noBukti = req.body.no_bukti;
  const tujuan = req.body.tujuan;
  const noAkun = req.body.no_akun;
  const jumlah = req.body.jumlah;
  
  // Lakukan logika pembaruan data sesuai dengan nilai-nilai yang diterima
  let sql = "UPDATE tbl_transaksi SET tgl=?, no_bukti=?, tujuan=?, no_akun=?, jumlah=? WHERE id_trans=?";
  let data = [tgl, noBukti, tujuan, noAkun, jumlah, idTrans];
  
  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;
    res.redirect('/kas-masuk');
  });
});

// Route untuk menghapus data
app.post('/deleteKasmasuk', (req, res) => {
  const idTrans = req.body.id_trans;
  
  // Lakukan logika penghapusan data sesuai dengan idTrans yang diterima
  let sql = "DELETE FROM tbl_transaksi WHERE id_trans=?";
  let data = [idTrans];
  
  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;
    res.redirect('/kas-masuk');
  });
});





// // Route untuk 
// app.get('/transaksi_view', (req, res) => {
//   let sql = "SELECT * FROM tbl_transaksi";
//   let query = conn.query(sql, (err, results) => {
//     if (err) throw err;

//     // Calculate total saldo
//     let totalSaldo = 0;
//     for (let i = 0; i < results.length; i++) {
//       totalSaldo += results[i].saldo;
//     }

//     res.render('transaksi_view', {
//       results: results,
//       totalSaldo: totalSaldo
//     });
//   });
// });

// menampilkan data table kas keluar
app.get('/kas-keluar', (req, res) => {
  // query untuk data no buti terakhir
  let sql = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_masuk IS NULL OR tbl_transaksi.kas_masuk = '' ORDER BY no_bukti DESC";
  // query untuk menampilkan data kedalam tabel
  let sql2 = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_masuk IS NULL OR tbl_transaksi.kas_masuk = '' ORDER BY no_bukti ASC";

  conn.query(sql, (err, results) => {
      if (err) {
          console.error('Error saat mengambil data nomor bukti:', err);
          throw err;
      }

      let lastBuktiNumber = results.length > 0 ? results[0].no_bukti : 'BKK-000';
      let counter = parseInt(lastBuktiNumber.split('-')[1]) + 1;
      const buktiNumber = 'BKK-' + counter.toString().padStart(3, '0');

      conn.query(sql2, (err, data) => {
          if (err) {
              console.error('Error saat mengambil data untuk tabel:', err);
              throw err;
          }

          let sqlAkun = "SELECT no_akun, nm_akun FROM tbl_akun";
          conn.query(sqlAkun, (err, options) => {
              if (err) {
                  console.error('Error saat mengambil data akun:', err);
                  throw err;
              }

              
              res.render('kas-keluar', {
                  results: data,
                  options: options,
                  buktiNumber: buktiNumber,
              });
          });
      });
  });
});

// route untuk menyimpan kas keluar
app.post('/addKaskeluar', (req, res) => {
  let data = {
      tgl: req.body.tgl,
      no_bukti: req.body.no_bukti,
      tujuan: req.body.tujuan,
      no_akun: req.body.no_akun,
      jumlah: req.body.jumlah,
      tipe: "KREDIT",
      kas_masuk: 0,
      kas_keluar: req.body.jumlah
  };

  // Mengambil saldo saat ini dari transaksi terakhir
  let getSaldoQuery = "SELECT saldo FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
  conn.query(getSaldoQuery, (err, result) => {
      if (err) {
          console.error('Error saat mengambil saldo:', err);
          throw err;
      }

      let saldo = 0;
      if (result.length > 0) {
          saldo = result[0].saldo; // Nilai saldo saat ini
      }

      let jumlahKasKeluar = parseInt(req.body.jumlah);

      // Memperbarui saldo dengan menambahkan jumlah kas masuk
      let updatedSaldo = saldo - jumlahKasKeluar;

      // Menyimpan data transaksi kas masuk dan memperbarui saldo
      let updateAndInsertQuery = "INSERT INTO tbl_transaksi SET ?, saldo = ?";
      conn.query(updateAndInsertQuery, [data, updatedSaldo], (err, result) => {
          if (err) {
              console.error('Error saat menyimpan data:', err);
              throw err;
          }
          res.redirect('/kas-keluar');
      });
  });
});


// Route untuk insert data
app.post('/save', (req, res) => {
  let data = {
    tgl: req.body.tgl,
    no_bukti: generateNoBukti(),
    tujuan: req.body.diterima_dari,
    no_akun: req.body.untuk_keperluan,
    jumlah: req.body.uang_sejumlah,
    tipe: 'DEBET', // Set tipe transaksi sebagai DEBET
    kas_masuk: req.body.uang_sejumlah,
    kas_keluar: 0,
    saldo: 0 // Ganti dengan nilai saldo yang sesuai
  };
  let sql = "INSERT INTO tbl_transaksi SET ?";
  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;
    res.redirect('/');
  });
});

//route untuk update data
app.post('/update', (req, res) => {
  let sql = "UPDATE tbl_transaksi SET tgl=?, no_bukti=?, tujuan=?, no_akun=?, jumlah=?, tipe=?, kas_masuk=?, kas_keluar=? WHERE id_trans=?";
  let data = [
    req.body.tgl,
    req.body.no_bukti,
    req.body.tujuan,
    req.body.no_akun,
    req.body.jumlah,
    req.body.tipe,
    req.body.tipe === 'kas_masuk' ? req.body.jumlah : 0,
    req.body.tipe === 'kas_keluar' ? req.body.jumlah : 0,
    req.body.id_trans
  ];
  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;
    res.redirect('/');
  });
});

//route untuk delete data
app.post('/delete', (req, res) => {
  let sql = "DELETE FROM tbl_transaksi WHERE id_trans=?";
  let data = [req.body.id_trans];
  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;
    res.redirect('/');
  });
});



//server listening
app.listen(8010, () => {
  console.log('Server is running at port 8010');
});
