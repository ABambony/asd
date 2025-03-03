const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed, requireSessionConditions } = require('../../../helper/utils');
const { useQueue } = require('discord-player');
const { ERROR_MSGE_DELETE_TIMEOUT, BOT_MSGE_DELETE_TIMEOUT } = require('../../../helper/constants');
const { errorLog } = require('../../../configs/logger');

module.exports = {
  category: 'music',
  cooldown: 3,
  aliases: ['jump'],
  data: new SlashCommandBuilder()
    .setName('jump')
    .setDescription("Выбрать песню из очереди. (без удаления)")
    .addIntegerOption(option =>
      option.setName('position')
        .setDescription('Позиция песни в очереди.')
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(999_999)
    ),

  async execute(interaction, client) {

    const jumpToIndex = Number(interaction.options.getInteger('position')) - 1;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      // Check has queue
      const queue = useQueue(interaction.guild.id);
      if (queue.isEmpty()) {
        await interaction.reply({ embeds: [errorEmbed(`Очередь пуста.`)] });
        setTimeout(() => interaction.deleteReply(), ERROR_MSGE_DELETE_TIMEOUT)
        return;
      }

      // Check bounds
      const queueSizeZeroOffset = queue.size - 1;
      if (jumpToIndex > queueSizeZeroOffset) {
        await interaction.reply({ embeds: [errorEmbed(`Такой песни не существует ${jumpToIndex + 1}, в очереди их ${queue.size}.`)] });
        setTimeout(() => interaction.deleteReply(), ERROR_MSGE_DELETE_TIMEOUT)
        return;
      }

      // Try to jump to new position/queue
      queue.node.jump(jumpToIndex);
      await interaction.reply({ embeds: [successEmbed(`Начинаю играть песню под номером **${jumpToIndex + 1}**.`)] });
      setTimeout(() => interaction.deleteReply(), BOT_MSGE_DELETE_TIMEOUT)

    } catch (error) {
      await interaction.reply({
        embeds: [
          errorEmbed(`Что-то произошло не так, при использований этой: \`/jump\` команды.`)
        ],
        ephemeral: true
      });
      errorLog(error)
    }
  },
};