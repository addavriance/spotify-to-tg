import {TelegramCommands} from './commands.js';

export class TelegramBot extends TelegramCommands {

    async handleWebhook(request, spotifyAPI) {
        const update = await request.json();

        if (update.message) {
            await this.handleMessage(request, update.message, spotifyAPI);
        }

        if (update.callback_query) {
            await this.handleCallbackQuery(update.callback_query, spotifyAPI);
        }

        return new Response('OK');
    }

    async handleMessage(request, message, spotifyAPI) {
        const chatId = message.chat.id;
        const userId = message.from.id;
        const text = message.text;
        const origin = new URL(request.url).origin;

        switch (text) {
            case '/start':
                await this.handleStartCommand(chatId, userId, origin);
                break;

            case '/help':
                await this.handleHelpCommand(chatId);
                break;

            case '/status':
                await this.handleStatusCommand(chatId, userId, spotifyAPI);
                break;

            case '/disconnect':
                await this.handleDisconnectCommand(chatId, userId, spotifyAPI);
                break;

            case '/current':
                await this.handleCurrentCommand(chatId, userId, spotifyAPI);
                break;

            default:
                if (text?.startsWith('/channel ')) {
                    const channelUrl = text.replace('/channel ', '').trim();
                    await this.handleChannelCommand(chatId, userId, channelUrl, spotifyAPI);
                } else {
                    await this.handleUnknownCommand(chatId);
                }
        }
    }

    async handleCallbackQuery(callbackQuery, spotifyAPI) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;

        await this.answerCallbackQuery(callbackQuery.id);

        switch (data) {
            case 'help':
                await this.handleHelpCommand(chatId);
                break;

            case 'create_channel_help':
                await this.handleCreateChannelHelp(chatId);
                break;

            case 'current_track':
                await this.handleCurrentCommand(chatId, userId, spotifyAPI);
                break;

            case 'update_channel':
                await this.handleUpdateChannel(chatId, userId, spotifyAPI);
                break;

            case 'channel_settings':
                await this.handleChannelSettings(chatId, userId);
                break;

            case 'settings':
                await this.handleSettingsCommand(chatId, userId);
                break;

            case 'disconnect':
                await this.handleDisconnectCommand(chatId, userId, spotifyAPI);
                break;

            default:
                console.log(`Unknown callback data: ${data}`);
        }
    }
}
