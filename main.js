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

        try {
            switch (path) {
                case '/':
                    return new Response('Telegram Spotify Status Bot', {headers: corsHeaders});

                case '/auth':
                    return handleAuth(request, env);

                case '/auth/callback':
                    return handleAuthCallback(request, env);

                case '/current-track':
                    return handleCurrentTrack(request, env);

                case '/webhook':
                    return handleWebhook(request, env);

                default:
                    return new Response('Not Found', {status: 404, headers: corsHeaders});
            }
        } catch (error) {
            console.error('Error:', error);
            return new Response('Internal Error', {
                status: 500,
                headers: corsHeaders
            });
        }
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(updateAllProgressBars(env));
    }
};

// Генерация URL для авторизации Spotify
async function handleAuth(request, env) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
        return new Response('Missing user_id parameter', {status: 400});
    }

    const scopes = [
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-read-recently-played'
    ].join(' ');

    const state = btoa(JSON.stringify({userId, timestamp: Date.now()}));

    const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${env.SPOTIFY_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(url.origin + '/auth/callback')}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `state=${state}`;

    return Response.redirect(authUrl, 302);
}

// Обработка callback после авторизации
async function handleAuthCallback(request, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
        return new Response(`Authorization error: ${error}`, {status: 400});
    }

    if (!code || !state) {
        return new Response('Missing code or state parameter', {status: 400});
    }

    try {
        const {userId} = JSON.parse(atob(state));

        const tokens = await exchangeCodeForTokens(code, url.origin + '/auth/callback', env);

        await env.TOKENS.put(`spotify:${userId}`, JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + (tokens.expires_in * 1000),
            created_at: Date.now()
        }));

        return new Response(`
      <html>
        <head><title>Spotify Connected!</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>✅ Spotify подключен!</h1>
          <p>Теперь ваша музыка будет отображаться в Telegram профиле</p>
          <p>Можете закрыть эту вкладку</p>
        </body>
      </html>
    `, {
            headers: {'Content-Type': 'text/html'}
        });
    } catch (error) {
        console.error('Auth callback error:', error);
        return new Response('Authorization failed', {status: 500});
    }
}

// Обмен authorization code на токены
async function exchangeCodeForTokens(code, redirectUri, env) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET)}`
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
        })
    });

    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
    }

    return await response.json();
}

// Обновление access token
async function refreshAccessToken(refreshToken, env) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET)}`
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    return await response.json();
}

// Получение текущего трека
async function getCurrentTrack(accessToken) {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
    }

    return await response.json();
}

// Обработка запроса текущего трека
async function handleCurrentTrack(request, env) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
        return new Response('Missing user_id parameter', {status: 400});
    }

    try {
        const tokenData = await env.TOKENS.get(`spotify:${userId}`, 'json');

        if (!tokenData) {
            return new Response('User not authorized', {status: 401});
        }

        let accessToken = tokenData.access_token;

        if (Date.now() >= tokenData.expires_at) {
            const newTokens = await refreshAccessToken(tokenData.refresh_token, env);
            accessToken = newTokens.access_token;

            await env.TOKENS.put(`spotify:${userId}`, JSON.stringify({
                ...tokenData,
                access_token: newTokens.access_token,
                expires_at: Date.now() + (newTokens.expires_in * 1000)
            }));
        }

        const track = await getCurrentTrack(accessToken);

        return new Response(JSON.stringify(track), {
            headers: {'Content-Type': 'application/json'}
        });
    } catch (error) {
        console.error('Current track error:', error);
        return new Response('Failed to get current track', {status: 500});
    }
}

// Обработка webhook от Telegram
async function handleWebhook(request, env) {
    return new Response('OK');
}

// Обновление всех прогресс-баров (cron job)
async function updateAllProgressBars(env) {
    const userKeys = await env.TOKENS.list({prefix: 'spotify:'});

    for (const key of userKeys.keys) {
        const userId = key.name.replace('spotify:', '');

        try {
            const track = await getCurrentTrackForUser(userId, env);

            if (track && track.is_playing) {
                await updateTelegramChannel(userId, track, env);
            }
        } catch (error) {
            console.error(`Error updating user ${userId}:`, error);
        }
    }
}

async function getCurrentTrackForUser(userId, env) {
    const tokenData = await env.TOKENS.get(`spotify:${userId}`, 'json');

    if (!tokenData) return null;

    let accessToken = tokenData.access_token;

    if (Date.now() >= tokenData.expires_at) {
        const newTokens = await refreshAccessToken(tokenData.refresh_token, env);
        accessToken = newTokens.access_token;

        await env.TOKENS.put(`spotify:${userId}`, JSON.stringify({
            ...tokenData,
            access_token: newTokens.access_token,
            expires_at: Date.now() + (newTokens.expires_in * 1000)
        }));
    }

    return await getCurrentTrack(accessToken);
}

async function updateTelegramChannel(userId, track, env) {
    const progressBar = createProgressBar(track.progress_ms, track.item.duration_ms);

    console.log(`Updating ${userId}: ${track.item.name} - ${progressBar}`);
}

function createProgressBar(current, total) {
    const progress = current / total;
    const barLength = 20;
    const filledLength = Math.floor(progress * barLength);

    const filled = '━'.repeat(filledLength);
    const dot = '●';
    const empty = '─'.repeat(Math.max(0, barLength - filledLength - 1));

    const currentTime = formatTime(current);
    const remainingTime = formatTime(total - current);

    return `${currentTime} ${filled}${dot}${empty} -${remainingTime}`;
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
