const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { botColor } = require('../../../configs/config');
const { sad } = require('../../../configs/emojis');
const { queueEmbedResponse, errorEmbed, requireSessionConditions } = require('../../../helper/utils');
const { useQueue } = require('discord-player');
const { BOT_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');
const { errorLog } = require('../../../configs/logger');

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: [],
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показывает очередь.'),

    async execute(interaction, client) {
        if (!requireSessionConditions(interaction, true, false, false)) return;

        try {
            const queue = useQueue(interaction.guild.id);
            if (!queue) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(botColor)
                            .setDescription(`${sad} Очередь пуста.`)
                    ]
                })
                setTimeout(() => {
                    interaction.deleteReply()
                }, BOT_MSGE_DELETE_TIMEOUT)
                return;
            }

            queueEmbedResponse(interaction, queue);

        } catch (error) {
            await interaction.reply({
                embeds: [
                    errorEmbed(`Что-то пошло не так, при использовании этой: \`/queue\` команды.`)
                ],
                ephemeral: true
            });
            errorLog(error)
        }
    },
};