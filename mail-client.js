const express = require('express');
const fs = require('fs');
const path = require('path');
const { simpleParser } = require('mailparser');
const app = express();

const inboxFile = path.join(__dirname, 'inbox.json');
const usersFile = path.join(__dirname, 'users.json');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Inisialisasi users.json kalau belum ada
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify([]));
}

// Home page
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>KBJ Mailing</title>
    <link rel="stylesheet" href="/public/tailwind.min.css">
    <script src="/public/js/alpine.min.js" defer></script>
  </head>
  <body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center bg-white p-8 rounded shadow max-w-md w-full">
      <h1 class="text-4xl font-bold mb-6 text-blue-700">KBJ Mailing</h1>
      <p class="text-gray-600 mb-8">Sistem Mail Sederhana untuk Lab Testing Forensik Digital</p>
      <div class="space-y-4">
        <a href="/inbox" class="block bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition">📥 Lihat Inbox</a>
        <a href="/register" class="block bg-green-600 text-white py-3 rounded hover:bg-green-700 transition">➕ Buat Akun Baru</a>
      </div>
    </div>
  </body>
  </html>
  `);
});

// Halaman register
app.get('/register', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Register Akun</title>
    <link rel="stylesheet" href="/public/tailwind.min.css">
    <script src="/public/js/alpine.min.js" defer></script>
  </head>
  <body class="bg-gray-100 p-6">
    <div class="max-w-md mx-auto bg-white p-6 rounded shadow" x-data="registerApp()">
      <h1 class="text-2xl font-bold mb-4">👤 Tambah Akun Baru</h1>
      <form @submit.prevent="addAccount" class="space-y-2">
        <input x-model="newName" placeholder="Nama lengkap" class="w-full border p-2 rounded">
        <input x-model="newUsername" placeholder="username (tanpa @kbj.mailing)" class="w-full border p-2 rounded">
        <input x-model="newPassword" type="password" placeholder="password" class="w-full border p-2 rounded">
        <button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Tambah Akun</button>
      </form>
      <template x-if="accountMsg">
        <div class="border p-2 rounded mt-2" :class="accountSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
          <span x-text="accountMsg"></span>
        </div>
      </template>
      <div class="mt-4">
        <a href="/inbox" class="text-blue-600 hover:underline">Lihat Inbox</a>
      </div>
    </div>

    <script>
      function registerApp() {
        return {
          newName: '',
          newUsername: '',
          newPassword: '',
          accountMsg: '',
          accountSuccess: false,
          async addAccount() {
            if (!this.newName.trim() || !this.newUsername.trim() || !this.newPassword.trim()) {
              this.accountMsg = "Nama, username, dan password wajib diisi";
              this.accountSuccess = false;
              return;
            }
            const res = await fetch('/add-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: this.newName,
                username: this.newUsername,
                password: this.newPassword
              })
            });
            const data = await res.json();
            this.accountMsg = data.message;
            this.accountSuccess = data.success;
            if (data.success) {
              this.newName = '';
              this.newUsername = '';
              this.newPassword = '';
            }
          }
        }
      }
    </script>
  </body>
  </html>
  `);
});

// Halaman inbox
app.get('/inbox', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Inbox</title>
    <link rel="stylesheet" href="/public/tailwind.min.css">
    <script src="/public/js/alpine.min.js" defer></script>
  </head>
  <body class="bg-gray-100 p-6">
    <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow" x-data="inboxApp()" x-init="loadUsers(); loadInbox();">
      <h1 class="text-2xl font-bold mb-4">📥 Inbox Per Akun</h1>

      <div class="mb-4">
        <label class="block font-semibold mb-1">Pilih akun:</label>
        <select x-model="selectedUser" @change="applyFilter" class="w-full border p-2 rounded">
          <option value="">-- Pilih Akun --</option>
          <template x-for="u in users" :key="u.email">
            <option :value="u.email" x-text="u.email + ' (' + u.name + ')'"></option>
          </template>
        </select>
      </div>

      <template x-if="selectedUser && filtered.length === 0">
        <p class="text-gray-500">Tidak ada email untuk akun ini.</p>
      </template>

      <template x-if="selectedUser">
        <div>
          <template x-for="mail in filtered" :key="mail.date + mail.from">
            <div class="border rounded p-4 bg-gray-50 mb-3">
              <div class="text-sm text-gray-600"><strong>From:</strong> <span x-text="mail.from"></span></div>
              <div class="text-sm text-gray-600"><strong>To:</strong> <span x-text="mail.to.join(', ')"></span></div>
              <div class="text-sm text-gray-600"><strong>Date:</strong> <span x-text="mail.date"></span></div>
              <div class="mt-2 border-t pt-2">
                <div x-html="mail.html || ('<pre>' + mail.text + '</pre>')"></div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <div class="mt-4">
        <a href="/" class="text-blue-600 hover:underline">🏠 Kembali ke Home</a>
        <span class="mx-2">|</span>
        <a href="/register" class="text-blue-600 hover:underline">➕ Tambah Akun</a>
      </div>
    </div>

    <script>
      function inboxApp() {
        return {
          users: [],
          mails: [],
          filtered: [],
          selectedUser: '',
          async loadUsers() {
            const res = await fetch('/users');
            this.users = await res.json();
          },
          async loadInbox() {
            const res = await fetch('/inbox-data');
            this.mails = await res.json();
          },
          applyFilter() {
            if (this.selectedUser) {
              this.filtered = this.mails.filter(mail =>
                mail.to.includes(this.selectedUser)
              );
            } else {
              this.filtered = [];
            }
          }
        }
      }
    </script>
  </body>
  </html>
  `);
});

// API users
app.get('/users', (req, res) => {
  const data = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : [];
  res.json(data);
});

// API inbox-data (dengan mailparser)
app.get('/inbox-data', async (req, res) => {
  const rawMails = fs.existsSync(inboxFile) ? JSON.parse(fs.readFileSync(inboxFile)) : [];
  const parsedMails = [];

  for (const mail of rawMails) {
    const parsed = await simpleParser(mail.data);
    parsedMails.push({
      from: parsed.from?.text || mail.from,
      to: parsed.to?.value.map(v => v.address) || mail.to,
      subject: parsed.subject,
      date: parsed.date || mail.date,
      text: parsed.text,
      html: parsed.html
    });
  }

  res.json(parsedMails);
});

// API add-account
app.post('/add-account', (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.json({ success: false, message: 'Semua field wajib diisi' });
  }
  const email = `${username}@kbj.mailing`;
  let users = JSON.parse(fs.readFileSync(usersFile));
  if (users.find(u => u.email === email)) {
    return res.json({ success: false, message: 'Akun sudah ada' });
  }
  users.push({ email, name, password });
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  res.json({ success: true, message: `Akun ${email} berhasil ditambahkan` });
});

app.listen(5000, () => console.log('📥 Mail client web at http://localhost:5000'));
