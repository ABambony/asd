const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, requireSessionConditions } = require('../../../helper/utils');
const { usePlayer } = require('discord-player');
const { errorLog } = require('../../../configs/logger');

module.exports = {
    category: 'music',
    cooldown: 3,
    aliases: ['pause', 'resume'],
    data: new SlashCommandBuilder()
        .setName('pause-resume')
        .setDescription("Остановить или продолжить проигрывание."),
    async execute(interaction, client) {
        // Check state
        if (!requireSessionConditions(interaction, true)) return;
        await interaction.deferReply()

        try {
            const guildPlayerNode = usePlayer(interaction.guild.id);
            const newPauseState = !guildPlayerNode.isPaused();
            guildPlayerNode.setPaused(newPauseState);
            await interaction.deleteReply()

        } catch (error) {
            await interaction.editReply({
                embeds: [
                    errorEmbed(`Что-то пошло не так, при использовании этой: \`/pause-resume\` команды.`)
                ],
                ephemeral: true
            });
            errorLog(error)
        }

    },
};