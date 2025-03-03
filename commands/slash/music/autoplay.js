const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, requireSessionConditions, repeatModeEmojiStr } = require('../../../helper/utils');
const { useQueue, QueueRepeatMode } = require('discord-player');
const { errorLog } = require('../../../configs/logger');
const { enabled, disabled, leftAngleDown, arrow } = require('../../../configs/emojis');
const { ERROR_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');
const { botColor } = require('../../../configs/config');

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: ['ap'],
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription("При автозапуске, для текущего сеанса воспроизводится музыка, когда в очереди ничего нет."),

    async execute(interaction, client) {

        // Check state
        if (!requireSessionConditions(interaction)) return;

        try {
            const queue = useQueue(interaction.guild.id);
            if (!queue) {
                await interaction.reply({ embeds: [errorEmbed(` Музыка не воспроизводится. Пожалуйста, запустите сеанс, чтобы установить режим.`)] })
                setTimeout(() => {
                    interaction.deleteReply()
                }, ERROR_MSGE_DELETE_TIMEOUT);
                return;
            }

            let isAutoplay = null
            if (queue.repeatMode === QueueRepeatMode.AUTOPLAY) {
                queue.setRepeatMode(0);
                isAutoplay = false
            } else {
                queue.setRepeatMode(3)
                isAutoplay = true
            }
            // Resolve repeat mode

            if (queue.metadata?.nowPlaying) {

                const msg = await queue.metadata.channel.messages.fetch(queue.metadata.nowPlaying)
                const embedObject = msg.embeds[0].toJSON();
                // Find the field you want to update by name and update its value
                const fieldIndex = embedObject.fields.findIndex(field => field.name === `${leftAngleDown} Повторять`);
                if (fieldIndex !== -1) {
                    embedObject.fields[fieldIndex].value = `${arrow} ${repeatModeEmojiStr(queue.repeatMode)}`;
                } else {
                    await interaction.reply({ embeds: [errorEmbed(`Что-то пошло не так при попытке обновить текущий трек.`)] })
                    setTimeout(() => {
                        interaction.deleteReply()
                    }, ERROR_MSGE_DELETE_TIMEOUT);
                    errorLog(new Error('Что-то пошло не так при попытке обновить текущий трек.'));
                    return;
                }

                const updatedEmbed = new EmbedBuilder(embedObject);

                msg.edit({ embeds: [updatedEmbed] });
            }

            let msge = ''
            if (isAutoplay) {
                msge = `${enabled} Автоматическое воспроизведение теперь **[включено](https://discord.com)** для текущего сеанса.\nЕсли вы хотите, чтобы оно было постоянным, используйте \`/repeat-mode\` с значением true.`
            } else {
                msge = `${disabled} Автоматическое воспроизведение теперь **[выключено](https://discord.com)** для текущего сеанса.\nЕсли вы хотите, чтобы оно было постоянным, используйте \`/repeat-mode\` с значением true.`
            }
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(botColor)
                        .setDescription(msge)
                ]
            });
        }
        catch (error) {
            await interaction.reply({
                embeds: [
                    errorEmbed(`Что-то пошло не так, при использовании этой: \`/autoplay\` команды.`)
                ],
                ephemeral: true
            });
            errorLog(error)
        }

    },
};