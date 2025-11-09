// index.js
const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  EmbedBuilder, 
  REST, 
  Routes 
} = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const fs = require('fs');
require('dotenv').config();

// --- ffmpeg ---
const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;

// --- Keep alive pentru Render ---
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("✅ Botul este online și activ!"));
app.listen(3000, () => console.log("🌐 Server web (keep-alive) pornit pe portul 3000"));

// --- Funcții bază de date ---
const dbPath = './database.json';
function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ warnings: {}, levels: {}, xp: {} }));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    console.error('Eroare la citirea bazei de date:', err);
    const fresh = { warnings: {}, levels: {}, xp: {} };
    fs.writeFileSync(dbPath, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- Inițializare client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// --- Sistem muzică ---
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  plugins: [
    new SpotifyPlugin(),
    new SoundCloudPlugin(),
    new YtDlpPlugin()
  ],
  ffmpeg: { path: ffmpegPath }
});

distube
  .on('playSong', (queue, song) => {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎵 Acum Cântă')
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        { name: 'Durată', value: song.formattedDuration, inline: true },
        { name: 'Cerut de', value: song.user.tag, inline: true }
      )
      .setThumbnail(song.thumbnail);
    queue.textChannel.send({ embeds: [embed] });
  })
  .on('addSong', (queue, song) => {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('➕ Adăugat în Coadă')
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        { name: 'Durată', value: song.formattedDuration, inline: true },
        { name: 'Poziție', value: `#${queue.songs.length}`, inline: true }
      )
      .setThumbnail(song.thumbnail);
    queue.textChannel.send({ embeds: [embed] });
  })
  .on('error', (channel, error) => {
    console.error('DisTube error:', error);
    if (channel) channel.send(`❌ Eroare: ${error.message}`);
  });

// --- Eveniment READY ---
client.once('ready', async () => {
  console.log(`✅ Botul este online ca ${client.user.tag}`);

  // === Înregistrare automată Slash Commands ===
  try {
    const commands = [];
    const basePath = './commands';
    if (fs.existsSync(basePath)) {
      const folders = fs.readdirSync(basePath);
      for (const folder of folders) {
        const folderPath = `${basePath}/${folder}`;
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
          const cmd = require(`${folderPath}/${file}`);
          if ('data' in cmd && 'execute' in cmd) {
            commands.push(cmd.data.toJSON());
          }
        }
      }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    console.log(`🔁 Înregistrare ${commands.length} comenzi slash...`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands au fost înregistrate cu succes!');
  } catch (err) {
    console.error('❌ Eroare la înregistrarea slash commands:', err);
  }
});

// --- Gestionare comenzi ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, member, guild } = interaction;

  function hasPerm(perm) { return member.permissions.has(PermissionsBitField.Flags[perm]); }
  function botHasPerm(perm) { return guild.members.me.permissions.has(PermissionsBitField.Flags[perm]); }

  // 🎧 Comanda /play
  if (commandName === 'play') {
    const query = options.getString('query');
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return interaction.reply({ content: '❌ Intră într-un canal vocal!', ephemeral: true });
    if (!botHasPerm('Connect') || !botHasPerm('Speak'))
      return interaction.reply({ content: '❌ Nu am permisiunile Connect/Speak.', ephemeral: true });

    await interaction.reply({ content: `🔍 Caut: **${query}**...` });
    try {
      await distube.play(voiceChannel, query, { member, textChannel: interaction.channel });
    } catch (err) {
      console.error(err);
      await interaction.followUp({ content: `❌ Eroare la redare: ${err.message}` });
    }
  }

  // 🔨 Comenzi de moderare etc. — restul codului tău rămâne identic
});

// --- Login Bot ---
client.login(process.env.TOKEN);
