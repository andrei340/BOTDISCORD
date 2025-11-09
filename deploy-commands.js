const { REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// 🔹 Citim toate comenzile din folderele /commands
const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[⚠️] Comanda din ${filePath} nu are "data" sau "execute".`);
    }
  }
}

// 🔹 Conectăm API-ul Discord
const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`🔁 Înregistrare ${commands.length} comenzi slash pe serverul tău...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ Comenzile slash au fost înregistrate pe serverul tău!');
  } catch (error) {
    console.error('❌ Eroare la înregistrarea comenzilor:', error);
  }
})();
