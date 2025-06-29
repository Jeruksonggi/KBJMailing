const { SMTPServer } = require('smtp-server');
const fs = require('fs');
const path = require('path');

const inboxFile = path.join(__dirname, 'inbox.json');
const usersFile = path.join(__dirname, 'users.json');

// Pastikan users.json ada
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify([]));
}

const server = new SMTPServer({
  onData(stream, session, callback) {
    let rawData = '';
    stream.on('data', chunk => rawData += chunk);
    stream.on('end', () => {
      // Ambil daftar user dari users.json
      let users = [];
      if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile));
      }

      const recipients = session.envelope.rcptTo.map(r => r.address);
      const invalidRecipients = recipients.filter(r => !users.some(u => u.email === r));

      if (invalidRecipients.length > 0) {
        console.warn(`❌ Invalid recipients: ${invalidRecipients.join(', ')}`);
        return callback(new Error(`Invalid recipients: ${invalidRecipients.join(', ')}`));
      }

      // Simpan email ke inbox.json
      const mail = {
        from: session.envelope.mailFrom.address,
        to: recipients,
        date: new Date().toISOString(),
        data: rawData
      };

      let inbox = [];
      if (fs.existsSync(inboxFile)) {
        inbox = JSON.parse(fs.readFileSync(inboxFile));
      }
      inbox.push(mail);
      fs.writeFileSync(inboxFile, JSON.stringify(inbox, null, 2));

      console.log(`✅ Email from ${mail.from} to ${mail.to.join(', ')} saved.`);
      callback();
    });
  },
  disabledCommands: ['AUTH'],
  logger: true
});

server.listen(2525, () => {
  console.log('📬 SMTP server listening on port 2525');
});
