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
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_lingkom2'
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


// Route untuk homepage
app.get('/', (req, res) => {
  let sql = "SELECT * FROM tbl_transaksi";
  let query = conn.query(sql, (err, results) => {
    if (err) throw err;

    // Calculate total saldo
    let totalSaldo = 0;
    for (let i = 0; i < results.length; i++) {
      totalSaldo += results[i].saldo;
    }

    res.render('transaksi_view', {
      results: results,
      totalSaldo: totalSaldo
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
