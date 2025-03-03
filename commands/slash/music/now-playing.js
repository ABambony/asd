const { useQueue } = require("discord-player");
const { SlashCommandBuilder } = require("discord.js");
const { errorEmbed, nowPlayingEmbed, requireSessionConditions } = require("../../../helper/utils");
const { ERROR_MSGE_DELETE_TIMEOUT } = require("../../../helper/constants");
const { errorLog } = require("../../../configs/logger");

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: ['np'],
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription("Отобразить детальную информацию о текущей песне."),
    async execute(interaction, client) {

        if (!requireSessionConditions(interaction, true, false, false)) return;

        try {
            const queue = useQueue(interaction.guild.id);
            if (!queue) {
                await interaction.reply({ embeds: [errorEmbed(` Очередь пуста.`)] })
                setTimeout(() => {
                    interaction.deleteReply()
                }, ERROR_MSGE_DELETE_TIMEOUT);
                return;
            }

            const { currentTrack } = queue;
            if (!currentTrack) {
                await interaction.reply({ embeds: [errorEmbed(`Не удалось получить информацию о песне.`)] })
                setTimeout(() => interaction.deleteReply(), ERROR_MSGE_DELETE_TIMEOUT)
                return;
            }

            const npEmbed = nowPlayingEmbed(interaction, client, queue);
            await interaction.reply({ embeds: [npEmbed] });

        } catch (error) {
            await interaction.reply({
                embeds: [
                    errorEmbed(`Что-то пошло не так, при использовании этой: \`/nowplaying\` команды.`)
                ],
                ephemeral: true
            });
            errorLog(error)
        }
    },
};