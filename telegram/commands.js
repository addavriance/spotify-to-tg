// telegram/commands.js - Обработка команд бота

import { TelegramChannel } from './channel.js';
import { createProgressBar } from '../utils.js';

export class TelegramCommands extends TelegramChannel {

    // Команда /start
    async handleStartCommand(chatId, userId, origin) {
        const authUrl = `${origin}/auth?user_id=tg_${userId}`;

        const keyboard = [[
            { text: '🎧 Привязать Spotify', url: authUrl },
            { text: '❓ Помощь', callback_data: 'help' }
        ]];

        await this.sendMessageWithKeyboard(chatId, `
🎵 *Spotify Status Bot*

Отображай музыку в профиле Telegram через канал.

*Возможности:*
• Автообновление каждые 5 секунд
• Прогресс-бар трека
• Обложка как аватар канала

👇 *Начни с подключения Spotify*
    `, keyboard);
    }

    // Команда /help
    async handleHelpCommand(chatId) {
        await this.sendMessage(chatId, `
📚 *Инструкция*

*1. Подключение Spotify*
• Нажми "Привязать Spotify"
• Авторизуйся в аккаунте

*2. Создание канала*
• Создай новый канал в Telegram
• Добавь бота как админа с правами:
  - Изменять информацию канала
  - Отправлять сообщения
• Отправь: /channel @твой_канал

*3. Добавление в профиль*
• Настройки > Редактировать профиль > Канал

*Команды:*
/start - подключить Spotify
/status - проверить статус
/current - текущий трек
/channel @username - добавить канал
/disconnect - отключить
    `);
    }

    // Команда /status
    async handleStatusCommand(chatId, userId, spotifyAPI) {
        const tokens = await spotifyAPI.getUserTokens(`tg_${userId}`);
        const channelData = await this.getUserChannel(`tg_${userId}`);

        if (tokens) {
            const keyboard = [[
                { text: '🎵 Текущий трек', callback_data: 'current_track' },
                { text: '⚙️ Настройки', callback_data: 'settings' }
            ]];

            let channelInfo = channelData ?
                `🎯 Канал: @${channelData.username}` :
                `⚠️ Канал не настроен. Используй /channel`;

            await this.sendMessageWithKeyboard(chatId, `
✅ *Spotify подключен*

📅 Подключен: ${new Date(tokens.created_at).toLocaleDateString('ru-RU')}
${channelInfo}
🔄 Обновления: каждые 5 сек
      `, keyboard);
        } else {
            const authUrl = `${this.getWorkerUrl()}/auth?user_id=tg_${userId}`;
            const keyboard = [[{ text: '🎧 Подключить Spotify', url: authUrl }]];

            await this.sendMessageWithKeyboard(chatId, `
❌ *Spotify не подключен*

Для работы нужно подключить аккаунт Spotify.
      `, keyboard);
        }
    }

    // Команда /current
    async handleCurrentCommand(chatId, userId, spotifyAPI) {
        try {
            const track = await spotifyAPI.getCurrentTrackForUser(`tg_${userId}`);

            if (track && track.is_playing) {
                const progressBar = createProgressBar(track.progress_ms, track.item.duration_ms);
                const artists = track.item.artists.map(a => a.name).join(', ');
                const trackName = this.escapeMarkdown(track.item.name);
                const artistsEscaped = this.escapeMarkdown(artists);

                await this.sendMessage(chatId, `
🎵 *${trackName}*
👤 ${artistsEscaped}

\`${progressBar}\`
        `);
            } else {
                await this.sendMessage(chatId, `⏸️ Ничего не играет`);
            }
        } catch (error) {
            console.error('Current track error:', error);
            await this.sendMessage(chatId, `❌ Ошибка получения трека. Попробуй переподключить: /start`);
        }
    }

    // Команда /disconnect
    async handleDisconnectCommand(chatId, userId, spotifyAPI) {
        await spotifyAPI.removeUserTokens(`tg_${userId}`);
        await this.sendMessage(chatId, `🔌 *Spotify отключен*\n\n/start - подключить заново`);
    }

    // Команда /channel
    async handleChannelCommand(chatId, userId, channelUrl, spotifyAPI) {
        try {
            const channelUsername = this.extractChannelUsername(channelUrl);

            if (!channelUsername) {
                await this.sendMessage(chatId, `
❌ *Неверная ссылка*

Формат: /channel @твой_канал
Или: /channel https://t.me/твой_канал
        `);
                return;
            }

            const isAdmin = await this.checkBotAdminStatus(channelUsername);
            if (!isAdmin) {
                await this.sendMessage(chatId, `
❌ *Нет прав админа*

Добавь бота в канал @${channelUsername} как администратора с правами:
• Изменять информацию канала
• Отправлять сообщения
• Редактировать сообщения
        `);
                return;
            }

            await this.saveUserChannel(`tg_${userId}`, channelUsername);
            await this.initializeChannel(channelUsername, `tg_${userId}`, spotifyAPI);

            const keyboard = [[
                { text: '🎵 Обновить', callback_data: 'update_channel' },
                { text: '⚙️ Настройки', callback_data: 'channel_settings' }
            ]];

            await this.sendMessageWithKeyboard(chatId, `
✅ *Канал настроен*

🎯 @${channelUsername}
⏱️ Обновления каждые 5 сек

*Добавь канал в профиль:*
Настройки > Профиль > Канал
      `, keyboard);

        } catch (error) {
            console.error('Channel setup error:', error);
            await this.sendMessage(chatId, `❌ Ошибка настройки канала`);
        }
    }

    // Настройки
    async handleSettingsCommand(chatId, userId) {
        const channelData = await this.getUserChannel(`tg_${userId}`);

        const keyboard = [
            [{ text: '⚙️ Настройки канала', callback_data: 'channel_settings' }],
            [{ text: '🔌 Отключить', callback_data: 'disconnect' }],
            [{ text: '📖 Помощь', callback_data: 'help' }]
        ];

        let info = '⚠️ Канал не настроен';
        if (channelData) {
            info = `🎯 @${channelData.username}\n📅 ${new Date(channelData.created_at).toLocaleDateString('ru-RU')}`;
        }

        await this.sendMessageWithKeyboard(chatId, `⚙️ *Настройки*\n\n${info}`, keyboard);
    }

    // Настройки канала
    async handleChannelSettings(chatId, userId) {
        const channelData = await this.getUserChannel(`tg_${userId}`);

        if (!channelData) {
            await this.sendMessage(chatId, `❌ Канал не настроен\n\nИспользуй /help для инструкции`);
            return;
        }

        const keyboard = [
            [{ text: '🔄 Обновить сейчас', callback_data: 'update_channel' }],
            [{ text: '📖 Инструкция', callback_data: 'create_channel_help' }]
        ];

        await this.sendMessageWithKeyboard(chatId, `
⚙️ *Канал @${channelData.username}*

📅 Создан: ${new Date(channelData.created_at).toLocaleDateString('ru-RU')}
🔄 Обновления: каждые 5 сек
    `, keyboard);
    }

    // Инструкция по каналу
    async handleCreateChannelHelp(chatId) {
        await this.sendMessage(chatId, `
📚 *Создание канала*

*Шаги:*
1. Telegram > Новый канал
2. Публичный канал с @username
3. Управление > Администраторы
4. Добавить @${this.getBotUsername()}
5. Права: изменять инфо + сообщения
6. В боте: /channel @твой_канал

*Профиль:*
Настройки > Редактировать профиль > Канал
    `);
    }

    // Обновление канала вручную
    async handleUpdateChannel(chatId, userId, spotifyAPI) {
        const channelData = await this.getUserChannel(`tg_${userId}`);

        if (!channelData) {
            await this.sendMessage(chatId, `❌ Канал не настроен`);
            return;
        }

        try {
            const track = await spotifyAPI.getCurrentTrackForUser(`tg_${userId}`);
            await this.updateChannelContent(`tg_${userId}`, track);
            await this.sendMessage(chatId, '✅ Канал обновлен');
        } catch (error) {
            await this.sendMessage(chatId, '❌ Ошибка обновления');
        }
    }

    // Обработка неизвестных команд
    async handleUnknownCommand(chatId) {
        await this.sendMessage(chatId, `
🤖 *Команды:*

/start - подключить Spotify
/help - инструкция
/status - статус подключения
/current - текущий трек
/channel @username - настроить канал
/disconnect - отключить

❓ /help для подробностей
    `);
    }

    // Уведомление об успешном подключении
    async notifyConnectionSuccess(userId) {
        const keyboard = [
            [{ text: '📖 Как создать канал?', callback_data: 'create_channel_help' }],
            [{ text: '🎵 Текущий трек', callback_data: 'current_track' }]
        ];

        await this.sendMessageWithKeyboard(userId, `
🎉 *Spotify подключен!*

✅ Отслеживание активно
🔄 Обновления каждые 5 сек

*Теперь создай канал:*
1. Новый канал в Telegram
2. Добавь @${this.getBotUsername()} как админа
3. /channel @твой_канал

🎧 Включи музыку в Spotify!
    `, keyboard);
    }

    // Получение URL воркера (заглушка)
    getWorkerUrl() {
        return 'https://your-worker.your-subdomain.workers.dev';
    }
}
