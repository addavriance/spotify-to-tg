import {SpotifyAPI} from './spotify.js';
import {TelegramBot} from './telegram';
import {
    createHTMLResponse,
    createJSONResponse,
    createErrorResponse
} from './utils.js';
import {
    createLandingPage,
    createSuccessPage,
    createErrorPage
} from './templates.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, {headers: corsHeaders});
        }

        const spotify = new SpotifyAPI(env);
        const telegram = new TelegramBot(env);

        try {
            switch (path) {
                case '/':
                    return handleLandingPage(request, env);

                case '/auth':
                    return handleAuth(request, env, spotify);

                case '/auth/callback':
                    return handleAuthCallback(request, env, spotify, telegram);

                case '/current-track':
                    return handleCurrentTrack(request, env, spotify);

                case '/webhook':
                    return telegram.handleWebhook(request, spotify);

                case '/update-now':
                    ctx.waitUntil(updateAllProgressBars(env));
                    return createJSONResponse({success: true, message: 'Update started'});

                default:
                    return createErrorResponse('Not Found', 404);
            }
        } catch (error) {
            console.error('Error:', error);
            return createErrorResponse('Internal Error', 500);
        }
    },

    async scheduled(event, env, ctx) {
        console.log('Starting update cycle every 10 seconds...');

        const promises = [];

        for (let i = 0; i < 6; i++) {
            promises.push(
                new Promise(async (resolve) => {
                    await sleep(i * 10000);

                    try {
                        await updateAllProgressBars(env);
                        console.log(`Update cycle ${i + 1}/6 completed (${i * 10}s offset)`);
                    } catch (error) {
                        console.error(`Update cycle ${i + 1}/6 failed:`, error);
                    }

                    resolve();
                })
            );
        }

        ctx.waitUntil(Promise.all(promises));
    }
};

// Лендинг страница
async function handleLandingPage(request, env) {
    const botUsername = env.TELEGRAM_BOT_USERNAME || 'your_spotify_bot';
    const html = createLandingPage(botUsername);
    return createHTMLResponse(html, {cache: 'public, max-age=3600'});
}

// Генерация URL для авторизации Spotify
async function handleAuth(request, env, spotify) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
        return createErrorResponse('Missing user_id parameter', 400);
    }

    const redirectUri = url.origin + '/auth/callback';
    const authUrl = spotify.getAuthUrl(userId, redirectUri);

    return Response.redirect(authUrl, 302);
}

// Обработка callback после авторизации
async function handleAuthCallback(request, env, spotify, telegram) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
        return createErrorResponse(`Authorization error: ${error}`, 400);
    }

    if (!code || !state) {
        return createErrorResponse('Missing code or state parameter', 400);
    }

    try {
        const {userId} = JSON.parse(atob(state));

        const redirectUri = url.origin + '/auth/callback';
        const tokens = await spotify.exchangeCodeForTokens(code, redirectUri);

        await spotify.saveUserTokens(userId, tokens);

        const telegramUserId = userId.replace('tg_', '');
        await telegram.notifyConnectionSuccess(telegramUserId);

        const html = createSuccessPage();
        return createHTMLResponse(html);
    } catch (error) {
        console.error('Auth callback error:', error);
        const html = createErrorPage('Ошибка авторизации', 'Не удалось получить токены от Spotify');
        return createHTMLResponse(html, {status: 500});
    }
}

// Обработка запроса текущего трека
async function handleCurrentTrack(request, env, spotify) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
        return createErrorResponse('Missing user_id parameter', 400);
    }

    try {
        const track = await spotify.getCurrentTrackForUser(userId);
        return createJSONResponse(track);
    } catch (error) {
        console.error('Current track error:', error);
        return createErrorResponse('Failed to get current track', 500);
    }
}

// Обновление всех прогресс-баров
async function updateAllProgressBars(env) {
    const spotify = new SpotifyAPI(env);
    const telegram = new TelegramBot(env);

    try {
        const userIds = await spotify.getAllUsers();
        console.log(`Updating ${userIds.length} users`);

        for (const userId of userIds) {
            try {
                const track = await spotify.getCurrentTrackForUser(userId);

                await telegram.updateChannelContent(userId, track);

                await sleep(200);
            } catch (error) {
                console.error(`Error updating user ${userId}:`, error);
            }
        }

        console.log('Update cycle completed successfully');
    } catch (error) {
        console.error('Error in updateAllProgressBars:', error);
    }
}

// Утилита для сна
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
