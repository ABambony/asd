const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed, requireSessionConditions } = require("../../../helper/utils");
const { useQueue } = require("discord-player");
const { BOT_MSGE_DELETE_TIMEOUT, ERROR_MSGE_DELETE_TIMEOUT } = require("../../../helper/constants");
const { errorLog } = require("../../../configs/logger");

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: ['disconnect'],
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Бот вышел из голосового канала и очистил очередь.'),

    async execute(interaction, client) {
        try {
            if (!requireSessionConditions(interaction, false, false, false)) return;

            const queue = useQueue(interaction.guild.id);

            if (!(queue && queue?.channel?.id)) {
                await interaction.reply({
                    embeds: [
                        errorEmbed(` Бот не подключен к голосовому каналу.`)
                    ],
                });
                setTimeout(() => interaction.deleteReply(), ERROR_MSGE_DELETE_TIMEOUT);
                return false;
            }

            if (queue?.metadata?.nowPlaying) {
                try {
                    await queue.metadata?.channel?.messages.delete(queue.metadata.nowPlaying);
                } catch (error) {
                    if (error.code !== 10008) {
                        errorLog('Не получилось удалить сообщение:', error);
                    }
                }
            }

            if (!queue?.deleted) queue?.delete();

            await interaction.reply({
                embeds: [successEmbed(" Бот вышел из голосового канала.")],
            });
            setTimeout(() => interaction.deleteReply(), BOT_MSGE_DELETE_TIMEOUT);
        } catch (error) {
            await interaction.reply({
                embeds: [
                    errorEmbed(`Что-то пошло не так, при использовании этой: \`/leave\` команды.`)
                ],
                ephemeral: true
            });
            errorLog(error);
        }
    },
};
