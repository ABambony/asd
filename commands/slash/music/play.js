const { useMainPlayer } = require('discord-player');
const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, requireSessionConditions } = require('../../../helper/utils');
const { ERROR_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');
const { errorLog } = require('../../../configs/logger');
const { getGuildSettings } = require('../../../helper/db');
const { QueryType } = require('discord-player');
const ytdl = require('@distube/ytdl-core'); // Импортируем @distube/ytdl-core
const { DefaultExtractors } = require('@discord-player/extractor');

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: [],
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Проигрывает песни с YouTube в высоком качестве.')
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Песня. Введите поисковой запрос или оставьте ссылку.')
                .setRequired(true)
                .setAutocomplete(true) // Включаем автодополнение
        ),

    // ✅ Добавляем autocomplete обработчик
    async autocomplete(interaction) {
        const query = interaction.options.getFocused().trim();

        // Проверка на длину ссылки (не превышает 100 символов)
        if (query.length < 1 || query.length > 100) return interaction.respond([]);

        const player = useMainPlayer();
        let searchResult;

        try {
            // Поиск по запросу (ссылка или название)
            searchResult = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO
            });
        } catch (error) {
            errorLog('Ошибка при поиске по запросу:', error);
            return interaction.respond([]);
        }

        // Если нет результатов — ничего не отправляем
        if (!searchResult.hasTracks()) return interaction.respond([]);

        // Если это YouTube ссылка, обработаем её
        const choices = searchResult.tracks
            .slice(0, 5) // Ограничиваем количество результатов
            .map(track => {
                let trackName = track.title.trim();

                // Если название трека длиннее 100 символов, обрезаем его
                if (trackName.length > 100) {
                    trackName = trackName.slice(0, 97) + "...";
                }

                // Если это ссылка (например, YouTube), то используем её, а не название
                const isURL = track.url.includes('youtube.com') || track.url.includes('youtu.be');
                if (isURL) {
                    trackName = track.url; // Передаем саму ссылку
                }

                return {
                    name: trackName, // Гарантированно 1–100 символов
                    value: track.url // Ссылка для выбора
                };
            })
            .filter(choice => choice.name.length >= 1 && choice.name.length <= 100); // Фильтруем пустые и длинные

        // Если нет валидных вариантов, ничего не отправляем
        if (choices.length === 0) return interaction.respond([]);

        // Отправляем результаты автодополнения
        await interaction.respond(choices);
    },

    async execute(interaction, client) {
        const player = useMainPlayer();
        const channel = interaction.member.voice.channel;

        if (!requireSessionConditions(interaction, false, true, false)) return;

        const query = interaction.options.getString('search').trim();

        // ✅ Проверяем длину запроса перед выполнением
        if (!query || query.length < 1 || query.length > 100) {
            await interaction.reply({
                embeds: [errorEmbed('Длина запроса должна быть от 1 до 100 символов')],
                ephemeral: true
            }).catch(errorLog);
            return;
        }

        await interaction.deferReply().catch(() => {});

        try {
            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO
            });

            // Проверяем, что есть треки в результатах поиска
            if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
                await interaction.editReply({
                    embeds: [errorEmbed(`Не найдена песня по запросу: ${query}`)]
                }).catch(errorLog);

                setTimeout(async () => {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.deleteReply().catch(() => {});
                    }
                }, ERROR_MSGE_DELETE_TIMEOUT);
                return;
            }

            // Проверка на длительность трека
            const track = searchResult.tracks[0]; // Первый трек из результатов
            if (!track || !track.durationMS || track.durationMS > 10 * 60 * 1000) {  // Проверка на максимальную длину (10 минут)
                await interaction.editReply({
                    embeds: [errorEmbed('Эта песня слишком длинная! Максимальная длина: 10 минут')],
                    ephemeral: true
                }).catch(errorLog);

                setTimeout(async () => {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.deleteReply().catch(() => {});
                    }
                }, ERROR_MSGE_DELETE_TIMEOUT);
                return;
            }

            const clientSettings = await getGuildSettings(interaction);

            // Переопределяем стандартный экстрактор YouTube
            await player.extractors.loadMulti(DefaultExtractors);
            player.extractors.register('YouTube', {
                validate: (query) => query.includes('youtube.com') || query.includes('youtu.be'),
                getInfo: async (query) => {
                    const info = await ytdl.getInfo(query);
                    return {
                        title: info.videoDetails.title,
                        url: info.videoDetails.video_url,
                        duration: Number(info.videoDetails.lengthSeconds),
                        thumbnail: info.videoDetails.thumbnails[0].url,
                        author: info.videoDetails.author.name
                    };
                }
            });

            await player.play(channel, searchResult.tracks[0], {
                requestedBy: interaction.user,
                nodeOptions: {
                    repeatMode: clientSettings.repeatMode,
                    volume: clientSettings.volume,
                    leaveOnEmpty: clientSettings.leaveOnEmpty,
                    leaveOnEmptyCooldown: clientSettings.leaveOnEmptyCooldown,
                    leaveOnStop: clientSettings.leaveOnStop,
                    leaveOnStopCooldown: clientSettings.leaveOnStopCooldown,
                    leaveOnEnd: clientSettings.leaveOnEnd,
                    leaveOnEndCooldown: clientSettings.leaveOnEndCooldown,
                    pauseOnEmpty: clientSettings.pauseOnEmpty,
                    selfDeaf: clientSettings.selfDeaf,
                    noEmitInsert: true,
                    skipOnNoStream: true,
                    bufferingTimeout: 15000,
                    smoothVolume: true,
                    volumeSmoothness: 0.08,
                    noFilterAboutVolume: true,
                    spotifyBridge: true,
                    ffmpegFilters: [
                        'bass=g=4,dynaudnorm=f=200',
                        'acompressor=threshold=-12dB:ratio=16:attack=25:release=100',
                        'highpass=f=100,lowpass=f=16000',
                        'equalizer=f=100:t=h:w=200:g=4'
                    ],
                    opusEncodeOptions: {
                        frameSize: 60,
                        fec: true,
                        packetLoss: 1
                    },
                    metadata: {
                        channel: interaction.channel,
                        member: interaction.member,
                        timestamp: interaction.createdTimestamp,
                        interaction
                    }
                }
            });

            await interaction.deleteReply().catch(() => {});
        } catch (error) {
            errorLog(error);
            await interaction.editReply({
                embeds: [errorEmbed('Что-то пошло не так при выполнении команды `/play`')],
                ephemeral: true
            }).catch(() => {});
        }
    }
};
