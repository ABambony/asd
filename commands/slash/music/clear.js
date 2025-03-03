const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed, requireSessionConditions, startedPlayingMenu } = require('../../../helper/utils');
const { useQueue } = require('discord-player');
const { ERROR_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');
const { errorLog } = require('../../../configs/logger');
const { arrow, leftAngleDown } = require('../../../configs/emojis');

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: ['clearqueue'],
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription("Очистить всю очередь."),

    async execute(interaction, client) {
        // Check state
        if (!requireSessionConditions(interaction, true)) return;

        try {
            const queue = useQueue(interaction.guild.id);
            if (queue?.tracks.toArray().length === 0) {
                await interaction.reply({ embeds: [errorEmbed(` В очереди ничего нет.`)] })
                setTimeout(() => interaction.deleteReply(), ERROR_MSGE_DELETE_TIMEOUT)
                return;
            }
            queue.clear();
            if (queue.metadata?.nowPlaying) {
                const { tracks } = queue
                const nextTrack = tracks.toArray()[0]
                const msg = await queue.metadata.channel.messages.fetch(queue.metadata.nowPlaying)
                const embedObject = msg.embeds[0].toJSON();

                // Find the field you want to update by name and update its value
                const fieldIndex = embedObject.fields.findIndex(field => field.name === `${leftAngleDown} Следующая песня`);
                if (fieldIndex !== -1) {
                    embedObject.fields[fieldIndex].value = `${arrow} ${nextTrack ? `[${nextTrack.cleanTitle}](${nextTrack.url})` : 'В очереди больше нет песен.'}`
                } else {
                    await interaction.reply({ embeds: [errorEmbed(`Что-то пошло не так при попытке обновить текущий трек.`)] })
                    setTimeout(() => {
                        interaction.deleteReply()
                    }, ERROR_MSGE_DELETE_TIMEOUT);
                    errorLog(error)
                    return;
                }

                const { currentTrack } = queue
                const updatedEmbed = new EmbedBuilder(embedObject);
                const updatedSuggestionMenu = await startedPlayingMenu(queue, currentTrack)

                msg.edit({
                    embeds: [updatedEmbed],
                    components: [
                        updatedSuggestionMenu
                    ]
                });
            }

            await interaction.reply({ embeds: [successEmbed(` Очередь была очищена - By ${interaction.user}`)] })

        } catch (error) {
            await interaction.reply({
                embeds: [
                    errorEmbed(`Что-то пошло не так, при использовании этой: \`/clear\` команды.`)
                ],
                ephemeral: true
            });
            errorLog(error)
        }

    },
};