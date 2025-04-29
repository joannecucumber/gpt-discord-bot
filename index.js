import 'dotenv/config';
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from 'discord.js';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const command = new SlashCommandBuilder()
  .setName('ask')
  .setDescription('摘要或提問')
  .addStringOption(o => o.setName('input').setDescription('文字 / 網址').setRequired(true));

async function register() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(client.application.id, process.env.GUILD_ID), {
    body: [command.toJSON()]
  });
  console.log('✅  /ask 指令已同步');
}

client.once('ready', async () => {
  console.log(`🤖  Logged in as ${client.user.tag}`);
  await register();
});

client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand() || i.commandName !== 'ask') return;
  await i.deferReply();
  let text = i.options.getString('input').trim();
  if (text.startsWith('http')) {
    try { const r = await fetch(text); text = (await r.text()).replace(/<[^>]*>/g, ''); }
    catch { return i.editReply('❌ 網址讀取失敗'); }
  }
  const chat = await openai.chat.completions.create({
    model: 'gpt-o4mini',
    messages: [
      { role: 'system', content: '你是專業摘要助手，回答請用繁體中文，不超過 200 字。' },
      { role: 'user', content: text }
    ],
    max_tokens: 300
  });
  i.editReply(chat.choices[0].message.content.trim());
});

client.login(process.env.BOT_TOKEN);
