// telegram/channel.js - Управление каналами Telegram

import { TelegramAPI } from './base.js';
import { createProgressBar } from '../utils.js';

export class TelegramChannel extends TelegramAPI {
    // Обновление названия канала
    async updateChannelTitle(channelUsername, title) {
        const url = `https://api.telegram.org/bot${this.token}/setChatTitle`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: `@${channelUsername}`,
                    title: title
                })
            });
        } catch (error) {
            console.error('Title update error:', error);
        }
    }

    // Обновление фото канала
    async updateChannelPhoto(channelUsername, photoUrl) {
        try {
            // Скачиваем изображение
            const imageResponse = await fetch(photoUrl);
            const imageBuffer = await imageResponse.arrayBuffer();

            // Создаем form data
            const formData = new FormData();
            formData.append('chat_id', `@${channelUsername}`);
            formData.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), 'cover.jpg');

            const url = `https://api.telegram.org/bot${this.token}/setChatPhoto`;

            await fetch(url, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Photo update error:', error);
        }
    }

    // Установка дефолтного фото (белого)
    async setDefaultChannelPhoto(channelUsername) {
        try {
            // Создаем белое изображение 512x512
            const canvas = new OffscreenCanvas(512, 512);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 512, 512);

            const blob = await canvas.convertToBlob({ type: 'image/png' });

            const formData = new FormData();
            formData.append('chat_id', `@${channelUsername}`);
            formData.append('photo', blob, 'default.png');

            const url = `https://api.telegram.org/bot${this.token}/setChatPhoto`;

            await fetch(url, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Default photo error:', error);
        }
    }

    // Отправка сообщения с прогресс-баром
    async sendProgressMessage(channelUsername, progressText) {
        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: `@${channelUsername}`,
                    text: progressText || '\u200B', // Невидимый символ если пусто
                    parse_mode: 'Markdown'
                })
            });

            const data = await response.json();
            return data.result?.message_id;
        } catch (error) {
            console.error('Send progress message error:', error);
            return null;
        }
    }

    // Редактирование существующего сообщения с прогресс-баром
    async editProgressMessage(channelUsername, messageId, progressText) {
        await this.editMessage(`@${channelUsername}`, messageId, progressText || '\u200B');
    }

    // Очистка всех служебных сообщений вокруг последнего сообщения с прогресс-баром
    async cleanupChannelMessages(channelUsername, lastMessageId) {
        if (!lastMessageId) return;

        // Удаляем сообщения в диапазоне ±5 от последнего известного ID
        const promises = [];

        for (let offset = -5; offset <= 5; offset++) {
            const messageId = lastMessageId + offset;
            if (messageId > 0 && messageId !== lastMessageId) { // Не удаляем само сообщение с прогресс-баром
                promises.push(this.deleteMessage(`@${channelUsername}`, messageId));
            }
        }

        // Выполняем все удаления параллельно
        await Promise.allSettled(promises);

        // Небольшая задержка чтобы удаления точно прошли
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Обновление канала с активным треком
    async updateChannelWithTrack(channelUsername, track) {
        const artists = track.item.artists.map(a => a.name).join(', ');
        const title = `🎵 ${track.item.name} - ${artists}`;

        // Обновляем название канала
        await this.updateChannelTitle(channelUsername, title);

        // Обновляем аватар канала (обложка трека) только если есть изображения
        if (track.item.album.images && track.item.album.images.length > 0) {
            const coverUrl = track.item.album.images[0].url;
            await this.updateChannelPhoto(channelUsername, coverUrl);
        }
    }

    // Обновление канала когда ничего не играет
    async updateChannelWithNoMusic(channelUsername) {
        // Меняем название на "ничего не играет"
        await this.updateChannelTitle(channelUsername, '⏸️ Ничего не играет');

        // Ставим дефолтную аватарку
        await this.setDefaultChannelPhoto(channelUsername);
    }

    // Инициализация канала с первым сообщением
    async initializeChannel(channelUsername, userId, spotifyAPI) {
        try {
            // Получаем текущий трек
            const track = await spotifyAPI.getCurrentTrackForUser(userId);

            if (track && track.is_playing) {
                // Есть активный трек
                await this.updateChannelWithTrack(channelUsername, track);
            } else {
                // Ничего не играет
                await this.updateChannelWithNoMusic(channelUsername);
            }

            const progressText = track && track.is_playing ?
                createProgressBar(track.progress_ms, track.item.duration_ms) : '';

            // Создаем первое сообщение с прогресс-баром
            const messageId = await this.sendProgressMessage(channelUsername, progressText);

            // Сохраняем ID сообщения и текущий трек для дальнейших обновлений
            await this.saveChannelData(userId, channelUsername, messageId, track);

        } catch (error) {
            console.error('Channel initialization error:', error);
        }
    }

    // ГЛАВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ КОНТЕНТА КАНАЛА С ОПТИМИЗАЦИЕЙ
    async updateChannelContent(userId, track) {
        const channelData = await this.getUserChannel(userId);

        if (!channelData) {
            console.log(`No channel data for user ${userId}`);
            return;
        }

        const { username: channelUsername, message_id: lastMessageId, last_track_id, last_track_image } = channelData;

        if (track && track.is_playing) {
            // Есть активный трек
            console.log(`Updating channel @${channelUsername} with track: ${track.item.name}`);

            const currentTrackId = track.item.id;
            const currentTrackImage = track.item.album.images?.[0]?.url;

            // Проверяем, изменился ли трек (только тогда обновляем название и фото)
            const trackChanged = currentTrackId !== last_track_id;

            if (trackChanged) {
                console.log(`Track changed for user ${userId}, updating channel info`);

                // 1. Обновляем название канала
                await this.updateChannelWithTrack(channelUsername, track);

                // 2. Обновляем фото только если изображение изменилось
                if (currentTrackImage && currentTrackImage !== last_track_image) {
                    console.log(`Album cover changed, updating channel photo`);
                    await this.updateChannelPhoto(channelUsername, currentTrackImage);
                }

                // 3. Сохраняем новую информацию о треке
                await this.updateLastTrackInfo(userId, track);

                // 4. Ждем немного чтобы обновления применились
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 5. Удаляем служебные сообщения (уведомления о смене названия/фото)
                await this.cleanupChannelMessages(channelUsername, lastMessageId);
            }

            // Создаем новый прогресс-бар (обновляется всегда)
            const progressBar = createProgressBar(track.progress_ms, track.item.duration_ms);

            if (lastMessageId) {
                // Редактируем существующее сообщение
                await this.editProgressMessage(channelUsername, lastMessageId, `\`${progressBar}\``);
            } else {
                // Создаем новое сообщение если ID потерялся
                const newMessageId = await this.sendProgressMessage(channelUsername, `\`${progressBar}\``);
                if (newMessageId) {
                    await this.updateChannelMessageId(userId, newMessageId);
                }
            }

        } else {
            // Ничего не играет
            console.log(`Clearing channel @${channelUsername} - no music playing`);

            // Проверяем, был ли трек (чтобы не обновлять канал без необходимости)
            if (last_track_id !== null) {
                console.log(`Music stopped for user ${userId}, updating channel to "no music"`);

                // 1. Обновляем канал на "ничего не играет"
                await this.updateChannelWithNoMusic(channelUsername);

                // 2. Сохраняем что трека нет
                await this.updateLastTrackInfo(userId, null);

                // 3. Ждем немного
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 4. Удаляем служебные сообщения
                await this.cleanupChannelMessages(channelUsername, lastMessageId);
            }

            if (lastMessageId) {
                // Редактируем сообщение на пустое
                await this.editProgressMessage(channelUsername, lastMessageId, '\u200B');
            } else {
                // Создаем пустое сообщение
                const newMessageId = await this.sendProgressMessage(channelUsername, '\u200B');
                if (newMessageId) {
                    await this.updateChannelMessageId(userId, newMessageId);
                }
            }
        }
    }

    // --- Методы для работы с данными канала ---

    // Сохранение полных данных канала пользователя
    async saveChannelData(userId, channelUsername, messageId, currentTrack) {
        const channelData = {
            username: channelUsername,
            created_at: Date.now(),
            message_id: messageId,
            last_track_id: currentTrack?.item?.id || null,
            last_track_image: currentTrack?.item?.album?.images?.[0]?.url || null
        };

        await this.env.TOKENS.put(`channel:${userId}`, JSON.stringify(channelData));
    }

    // Обновление ID сообщения в данных канала
    async updateChannelMessageId(userId, messageId) {
        const channelData = await this.env.TOKENS.get(`channel:${userId}`, 'json') || {};
        channelData.message_id = messageId;
        await this.env.TOKENS.put(`channel:${userId}`, JSON.stringify(channelData));
    }

    // Обновление информации о последнем треке
    async updateLastTrackInfo(userId, track) {
        const channelData = await this.env.TOKENS.get(`channel:${userId}`, 'json') || {};
        channelData.last_track_id = track?.item?.id || null;
        channelData.last_track_image = track?.item?.album?.images?.[0]?.url || null;
        await this.env.TOKENS.put(`channel:${userId}`, JSON.stringify(channelData));
    }

    // Сохранение информации о канале пользователя (упрощенная версия)
    async saveUserChannel(userId, channelUsername) {
        await this.env.TOKENS.put(`channel:${userId}`, JSON.stringify({
            username: channelUsername,
            created_at: Date.now(),
            message_id: null,
            last_track_id: null,
            last_track_image: null
        }));
    }

    // Получение информации о канале пользователя
    async getUserChannel(userId) {
        return await this.env.TOKENS.get(`channel:${userId}`, 'json');
    }
}
