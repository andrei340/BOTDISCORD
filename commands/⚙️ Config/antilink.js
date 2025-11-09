const { Client, Message, EmbedBuilder } = require('discord.js');
const ee = require('../../config/embed.json');
const config = require('../../config/config.json');

// Stocăm local starea (nu în DB)
const activeAntilink = new Set();

module.exports = {
    name: 'antilink',
    aliases: ['al'],
    category: '⚙️ Config',
    memberpermissions: ['Administrator'],
    cooldown: 5,
    description: 'Activează sau dezactivează sistemul Anti-Link',
    usage: 'antilink <on|off>',
    
    /**
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    run: async (client, message, args, prefix) => {
        if (!args[0]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ee.color)
                        .setDescription(`❓ Folosește: \`${prefix}antilink <on|off>\``)
                        .setFooter({ text: ee.footertext })
                ]
            });
        }

        const guildID = message.guild.id;

        if (args[0].toLowerCase() === 'on') {
            activeAntilink.add(guildID);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Green')
                        .setDescription('✅ Sistemul **Anti-Link** a fost activat!')
                        .setFooter({ text: ee.footertext })
                ]
            });
        }

        if (args[0].toLowerCase() === 'off') {
            activeAntilink.delete(guildID);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setDescription('🚫 Sistemul **Anti-Link** a fost dezactivat!')
                        .setFooter({ text: ee.footertext })
                ]
            });
        }

        return message.reply('❌ Opțiune invalidă. Folosește `on` sau `off`.');
    }
};

// Eveniment pentru detectarea link-urilor
module.exports.onMessage = (message) => {
    if (!message.guild || message.author.bot) return;
    const guildID = message.guild.id;
    if (!activeAntilink.has(guildID)) return;

    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    if (linkRegex.test(message.content)) {
        message.delete().catch(() => {});
        message.channel.send(`🚫 ${message.author}, linkurile nu sunt permise aici!`)
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }
};
