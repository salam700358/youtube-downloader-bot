require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 YouTube Downloader Bot démarré...');

// Commande /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `👋 Bienvenue sur le Bot Téléchargeur YouTube !

📥 Envoie-moi un lien YouTube et je téléchargerai la vidéo pour toi.

Exemple :
https://www.youtube.com/watch?v=xxxxx`
  );
});

// Recevoir un lien YouTube
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  // Vérifier si c'est un lien YouTube
  if (!ytdl.validateURL(text)) {
    return bot.sendMessage(chatId, '❌ Ce lien n\'est pas valide. Envoie un lien YouTube valide.');
  }

  try {
    await bot.sendMessage(chatId, '⏳ Téléchargement en cours... Patiente quelques secondes !');

    // Obtenir les infos de la vidéo
    const info = await ytdl.getInfo(text);
    const title = info.videoDetails.title;
    const duration = parseInt(info.videoDetails.lengthSeconds);

    // Vérifier la durée (max 10 minutes pour Telegram)
    if (duration > 600) {
      return bot.sendMessage(chatId, '❌ La vidéo est trop longue. Maximum 10 minutes.');
    }

    await bot.sendMessage(chatId, `📹 Vidéo trouvée : *${title}*\n⬇️ Envoi en cours...`, { parse_mode: 'Markdown' });

    // Télécharger la vidéo
    const filePath = path.join(__dirname, `${chatId}_video.mp4`);
    const writeStream = fs.createWriteStream(filePath);

    ytdl(text, { quality: 'highest', filter: 'videoandaudio' }).pipe(writeStream);

    writeStream.on('finish', async () => {
      try {
        await bot.sendVideo(chatId, filePath, { caption: `✅ ${title}` });
        fs.unlinkSync(filePath); // Supprimer après envoi
      } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, '❌ Erreur lors de l\'envoi de la vidéo.');
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });

    writeStream.on('error', (err) => {
      console.error(err);
      bot.sendMessage(chatId, '❌ Erreur lors du téléchargement.');
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Une erreur est survenue. Réessaie plus tard.');
  }
});
