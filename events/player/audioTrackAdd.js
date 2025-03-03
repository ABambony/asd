const { EmbedBuilder, escapeMarkdown } = require("discord.js");
const { botColor } = require("../../configs/config");
const { musicone, bottomArrow, leftAngleDown, arrow } = require("../../configs/emojis");
const { usePlayer } = require("discord-player");
const { BOT_MSGE_DELETE_TIMEOUT } = require("../../helper/constants");
const { errorLog } = require("../../configs/logger");
const { startedPlayingMenu } = require("../../helper/utils");

module.exports = {
    name: 'audioTrackAdd',
    async execute(queue, track, client) {
        try {
            const cp = usePlayer(queue);

            if (!queue.metadata?.channel) {
                errorLog("Ошибка: `queue.metadata.channel` не найден.");
                return;
            }

            if (cp.isPlaying()) {
                const position = queue.tracks.toArray().length;
                const message = await queue.metadata.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(botColor)
                            .setDescription(`${musicone} Добавлен в очередь [${escapeMarkdown(track.title)}](${track.url}) - \`${track.duration}\` на ${position} позицию - ${track.requestedBy}.`)
                    ]
                }).catch(error => {
                    errorLog("Ошибка при отправке сообщения о добавлении трека:", error);
                });

                if (message) {
                    setTimeout(async () => {
                        await message.delete().catch(() => {});
                    }, BOT_MSGE_DELETE_TIMEOUT);
                }

                // Обновляем сообщение "Сейчас играет"
                if (queue.metadata?.nowPlaying) {
                    try {
                        const msg = await queue.metadata.channel.messages.fetch(queue.metadata.nowPlaying).catch(() => null);
                        if (!msg) {
                            queue.metadata.nowPlaying = null;
                            return;
                        }

                        const nextTrack = queue.tracks.toArray()[0];
                        if (!nextTrack) return;

                        const embedObject = msg.embeds[0]?.toJSON();
                        const fieldIndex = embedObject?.fields?.findIndex(field => field.name === `${leftAngleDown} Следующая песня`);

                        if (fieldIndex !== -1) {
                            embedObject.fields[fieldIndex].value = `${arrow} ${nextTrack ? `[${nextTrack.cleanTitle}](${nextTrack.url})` : 'В очереди больше нет песен.'}`;

                            const updatedEmbed = new EmbedBuilder(embedObject);
                            const updatedSuggestionMenu = await startedPlayingMenu(queue, track);

                            await msg.edit({
                                embeds: [updatedEmbed],
                                components: [updatedSuggestionMenu]
                            }).catch(error => {
                                errorLog("Ошибка при обновлении сообщения 'Сейчас играет':", error);
                                queue.metadata.nowPlaying = null;
                            });
                        }
                    } catch (error) {
                        errorLog("Ошибка при обработке обновления 'Сейчас играет':", error);
                        queue.metadata.nowPlaying = null;
                    }
                }
            } else {
                const message = await queue.metadata.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(botColor)
                            .setAuthor({
                                iconURL: client.user.displayAvatarURL(),
                                name: ` Готово к проигрыванию ${bottomArrow}`,
                            })
                            .setDescription(`[${escapeMarkdown(track.title)}](${track.url}) - \`${track.duration}\` By - ${track.requestedBy}.`)
                    ]
                }).catch(error => {
                    errorLog("Ошибка при отправке сообщения о готовности к проигрыванию:", error);
                });

                if (message) {
                    setTimeout(async () => {
                        await message.delete().catch(() => {});
                    }, BOT_MSGE_DELETE_TIMEOUT);
                }
            }
        } catch (error) {
            errorLog("Ошибка в audioTrackAdd.js:", error);
        }
    }
};