const { SlashCommandBuilder, escapeMarkdown } = require('discord.js');
const { errorEmbed, successEmbed, requireSessionConditions } = require('../../../helper/utils');
const { useQueue } = require('discord-player');
const { ERROR_MSGE_DELETE_TIMEOUT, BOT_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');
const { errorLog } = require('../../../configs/logger');

module.exports = {
	category: 'music',
	cooldown: 3,
	aliases: [],
	data: new SlashCommandBuilder()
		.setName('skip-to')
		.setDescription("Пропустить к песни из очереди.")
		.addIntegerOption(option =>
			option.setName('position')
				.setDescription('Позиция песни в очереди.')
				.setRequired(true)
				.setMinValue(2)
				.setMaxValue(999_999)
		),

	async execute(interaction, client) {

		const skipToIndex = Number(interaction.options.getInteger('position')) - 1;

		// Check state
		if (!requireSessionConditions(interaction, true)) return;

		// Check has queue
		const queue = useQueue(interaction.guild.id);
		if (queue.isEmpty()) {
			await interaction.reply({ embeds: [errorEmbed(` Очередь пуста.`)] });
			setTimeout(() => interaction.deleteReply(), ERROR_MSGE_DELETE_TIMEOUT)
			return;
		}

		// Check bounds
		const queueSizeZeroOffset = queue.size - 1;
		if (skipToIndex > queueSizeZeroOffset) {
			await interaction.reply({ embeds: [errorEmbed(` Такой песни не существует ${skipToIndex + 1}, в очереди их ${queue.size}`)] });
			setTimeout(() => interaction.deleteReply(), ERROR_MSGE_DELETE_TIMEOUT)
			return;
		}

		try {
			// Jump to position
			const track = queue.tracks.at(skipToIndex);
			queue.node.skipTo(skipToIndex);
			await interaction.reply({ embeds: [successEmbed(` Пропускаем к [${escapeMarkdown(track.title)}](${track.url}) - By ${interaction.user}`)] });
			setTimeout(() => interaction.deleteReply(), BOT_MSGE_DELETE_TIMEOUT)

		} catch (error) {
			await interaction.reply({
				embeds: [
					errorEmbed(`Что-то пошло не так, при использовании этой: \`/skip-to\` команды.`)
				],
				ephemeral: true
			});
			errorLog(error)
		}

	},
};