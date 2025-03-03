const { usePlayer } = require('discord-player');
const { SlashCommandBuilder } = require('discord.js');
const { BOT_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');
const { errorEmbed, successEmbed, requireSessionConditions } = require('../../../helper/utils');
const { errorLog } = require('../../../configs/logger');

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: ['next'],
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропустить текущую песню.'),

    async execute(interaction, client) {

        if (!requireSessionConditions(interaction, true)) return;

        try {
            const guildPlayerNode = usePlayer(interaction.guild.id);

            const currentTrack = guildPlayerNode.queue.currentTrack;
            if (!currentTrack) {
                await interaction.reply({
                    embeds: [
                        errorEmbed(`Ничего не играет.`)
                    ]
                })
                setTimeout(() => {
                    interaction.deleteReply()
                }, BOT_MSGE_DELETE_TIMEOUT);
                return;
            }

            const successSkip = guildPlayerNode.skip();
            await interaction.reply({
                embeds: [
                    successSkip
                        ? successEmbed(` Пропущена **[${currentTrack}](${currentTrack.url})** - By ${interaction.user}`)
                        : errorEmbed(` Что-то произошло не так - не удалось пропустить текущую песню`)
                ]
            })
            setTimeout(() => {
                interaction.deleteReply()
            }, BOT_MSGE_DELETE_TIMEOUT);
            return
        }
        catch (error) {
            await interaction.reply({
                embeds: [
                    errorEmbed(`Что-то пошло не так, при использовании этой: \`/skip\` команды.`)
                ],
                ephemeral: true
            });
            errorLog(error)
        }
    },
};