const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed, repeatModeEmojiStr, requireSessionConditions } = require('../../../helper/utils');
const { useQueue } = require('discord-player');
const { errorLog } = require('../../../configs/logger');
const GuildModel = require('../../../schema/guild');
const { cyanDot, arrow, leftAngleDown } = require('../../../configs/emojis');
const { ERROR_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: ['repeat'],
    data: new SlashCommandBuilder()
        .setName('repeat-mode')
        .setDescription("Настроить режим повторения или отключить его.")
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Выберите режим.')
                .setRequired(false)
                .addChoices(
                    { name: 'off', value: '0' },
                    { name: 'song', value: '1' },
                    { name: 'queue', value: '2' },
                    { name: 'autoplay', value: '3' }
                ))
        .addBooleanOption(option =>
            option.setName('persistent')
                .setDescription('Для сохранения режима повтора. Он будет применяться и к новым сеансам.')
                .setRequired(false)),

    async execute(interaction, client) {
        const repeatMode = interaction.options.getString('mode') ? Number(interaction.options.getString('mode')) : 0;
        const shouldSave = interaction.options.getBoolean('persistent') ?? false;

        if (!requireSessionConditions(interaction)) return;

        try {
            await interaction.deferReply().catch(() => {});
            const queue = useQueue(interaction.guild.id);

            if (!queue) {
                await interaction.editReply({ embeds: [errorEmbed(`Боту нечего повторять.`)] }).catch(() => {});
                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, ERROR_MSGE_DELETE_TIMEOUT);
                return;
            }

            queue.setRepeatMode(repeatMode);
            const modeEmoji = repeatModeEmojiStr(repeatMode);

            if (queue.metadata?.nowPlaying) {
                try {
                    const msg = await queue.metadata.channel.messages.fetch(queue.metadata.nowPlaying).catch(() => null);
                    if (!msg) throw new Error("Сообщение с текущей песней не найдено.");

                    const embedObject = msg.embeds[0]?.toJSON();
                    if (!embedObject || !embedObject.fields) throw new Error("Сообщение не содержит корректные параметры.");

                    const updatedEmbed = EmbedBuilder.from(embedObject);
                    await msg.edit({ embeds: [updatedEmbed] }).catch(() => {});

                } catch (err) {
                    await interaction.editReply({
                        embeds: [errorEmbed(`Произошла ошибка при обновлении режима повтора: ${err.message}`)]
                    }).catch(() => {});

                    setTimeout(() => {
                        interaction.deleteReply().catch(() => {});
                    }, ERROR_MSGE_DELETE_TIMEOUT);

                    errorLog(err);
                }
            }

            if (shouldSave) {
                const settings = await GuildModel.findOne({ guildId: interaction.guild.id });
                if (settings) {
                    settings.repeatMode = repeatMode;
                    await settings.save().catch(() => {});
                }
            }

            await interaction.editReply({
                embeds: [successEmbed(`Обновлен ${shouldSave ? 'общий' : 'текущий'} режим повтора на: ${modeEmoji}`)]
            }).catch(() => {});

        } catch (error) {
            await interaction.editReply({
                embeds: [errorEmbed(`Что-то пошло не так при использовании команды \`/repeat-mode\`.`)],
                ephemeral: true
            }).catch(() => {});
            errorLog(error);
        }
    },
};