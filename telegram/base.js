// telegram/base.js - Базовые функции для работы с Telegram API

export class TelegramAPI {
    constructor(env) {
        this.token = env.TELEGRAM_BOT_TOKEN;
        this.botId = env.TELEGRAM_BOT_ID;
        this.botUsername = env.TELEGRAM_BOT_USERNAME || 'your_spotify_bot';
        this.env = env;
    }

    // Отправка обычного сообщения
    async sendMessage(chatId, text, options = {}) {
        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;

        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: options.parseMode || 'Markdown',
            disable_web_page_preview: options.disablePreview !== false,
            ...options
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error('Telegram API error:', await response.text());
        }

        return response;
    }

    // Отправка сообщения с инлайн кнопками
    async sendMessageWithKeyboard(chatId, text, keyboard, options = {}) {
        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;

        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: options.parseMode || 'Markdown',
            disable_web_page_preview: options.disablePreview !== false,
            reply_markup: {
                inline_keyboard: keyboard
            },
            ...options
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error('Telegram API error:', await response.text());
        }

        return response;
    }

    // Редактирование сообщения
    async editMessage(chatId, messageId, text, options = {}) {
        const url = `https://api.telegram.org/bot${this.token}/editMessageText`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: text,
                    parse_mode: options.parseMode || 'Markdown'
                })
            });
        } catch (error) {
            console.error('Edit message error:', error);
        }
    }

    // Удаление сообщения
    async deleteMessage(chatId, messageId) {
        const url = `https://api.telegram.org/bot${this.token}/deleteMessage`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId
                })
            });
        } catch (error) {
            // Игнорируем ошибки удаления - сообщение могло быть уже удалено
            console.log(`Failed to delete message ${messageId}:`, error.message);
        }
    }

    // Подтверждение callback query
    async answerCallbackQuery(callbackQueryId, text = '') {
        const url = `https://api.telegram.org/bot${this.token}/answerCallbackQuery`;

        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text
            })
        });
    }

    // Проверка статуса админа бота в канале
    async checkBotAdminStatus(channelUsername) {
        const url = `https://api.telegram.org/bot${this.token}/getChatMember`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: `@${channelUsername}`,
                    user_id: this.botId
                })
            });

            if (!response.ok) return false;

            const data = await response.json();
            const member = data.result;

            return member.status === 'administrator' &&
                member.can_change_info &&
                member.can_post_messages &&
                member.can_edit_messages;
        } catch (error) {
            console.error('Admin check error:', error);
            return false;
        }
    }

    // Экранирование специальных символов Markdown
    escapeMarkdown(text) {
        return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    }

    // Извлечение username канала из ссылки
    extractChannelUsername(input) {
        if (input.startsWith('@')) {
            return input.substring(1);
        }

        const match = input.match(/t\.me\/([a-zA-Z0-9_]+)/);
        return match ? match[1] : null;
    }

    // Получение username бота
    getBotUsername() {
        return this.botUsername;
    }
}
