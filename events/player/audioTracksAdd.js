const { EmbedBuilder } = require("discord.js");
const { botColor } = require("../../configs/config");
const { musicmany, leftAngleDown, arrow } = require("../../configs/emojis");
const { BOT_MSGE_DELETE_TIMEOUT, ERROR_MSGE_DELETE_TIMEOUT } = require("../../helper/constants");
const { errorLog } = require("../../configs/logger");
const { usePlayer } = require("discord-player");
const { errorEmbed, startedPlayingMenu } = require("../../helper/utils");

module.exports = {
    name: 'audioTracksAdd',
    async execute(queue, tracks, client) {
        try {
            if (!queue.metadata?.channel) {
                errorLog("Ошибка: `queue.metadata.channel` не найден.");
                return;
            }

            // Проверка на длину названия плейлиста
            if (tracks[0].playlist.title.length > 100) {
                await queue.metadata.channel.send({
                    embeds: [errorEmbed("Название плейлиста слишком длинное! Максимальная длина — **100 символов**.")],
                }).then(errMsg => setTimeout(() => errMsg.delete(), ERROR_MSGE_DELETE_TIMEOUT)).catch(() => {});
                return;
            }

            const position = queue.tracks.toArray().length - tracks.length - 1;
            const message = await queue.metadata.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(botColor)
                        .setDescription(`${musicmany} **${tracks.length}** песни из **[${tracks[0].playlist.title}]** добавлены в очередь${position > 0 ? ` количество ${position} ` : ''}- ${tracks[0].requestedBy}.`)
                ]
            }).catch(error => {
                errorLog("Ошибка при отправке сообщения о добавлении плейлиста:", error);
            });

            if (message) {
                setTimeout(async () => {
                    await message.delete().catch(() => {});
                }, BOT_MSGE_DELETE_TIMEOUT);
            }

            const cp = usePlayer(queue);
            if (cp.isPlaying() && queue.metadata?.nowPlaying) {
                try {
                    const msg = await queue.metadata.channel.messages.fetch(queue.metadata.nowPlaying).catch(() => null);

                    // Если сообщение с текущим треком не найдено, сбрасываем
                    if (!msg) {
                        queue.metadata.nowPlaying = null;
                        errorLog("Не удалось найти сообщение с текущим треком. Сбросим nowPlaying.");
                        return;
                    }

                    const nextTrack = queue.tracks.toArray()[0];
                    if (!nextTrack) return;

                    // Проверка на наличие поля Next song в Embed
                    const embedObject = msg.embeds[0]?.toJSON();
                    if (!embedObject) {
                        errorLog("Не удалось получить Embed-сообщение.");
                        return;
                    }

                    const fieldIndex = embedObject?.fields?.findIndex(field => field.name === `${leftAngleDown} Next song`);

                    if (fieldIndex !== -1) {
                        embedObject.fields[fieldIndex].value = `${arrow} ${nextTrack ? `[${nextTrack.cleanTitle}](${nextTrack.url})` : 'No more songs in the queue.'}`;
                    } else {
                        await queue.metadata.channel.send({
                            embeds: [errorEmbed("Что-то пошло не так при обновлении текущего трека")],
                        }).then(errMsg => setTimeout(() => errMsg.delete(), ERROR_MSGE_DELETE_TIMEOUT)).catch(() => {});
                        return;
                    }

                    const { currentTrack } = queue;
                    const updatedEmbed = new EmbedBuilder(embedObject);
                    const updatedSuggestionMenu = await startedPlayingMenu(queue, currentTrack);

                    await msg.edit({
                        embeds: [updatedEmbed],
                        components: [updatedSuggestionMenu]
                    }).catch(error => {
                        errorLog("Ошибка при обновлении сообщения 'Сейчас играет':", error);
                    });

                } catch (error) {
                    errorLog("Ошибка при обработке обновления 'Сейчас играет':", error);
                    queue.metadata.nowPlaying = null;
                }
            }
        } catch (error) {
            errorLog("Ошибка в audioTracksAdd.js:", error);
        }
    }
};