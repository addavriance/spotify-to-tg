export class SpotifyAPI {
    constructor(env) {
        this.clientId = env.SPOTIFY_CLIENT_ID;
        this.clientSecret = env.SPOTIFY_CLIENT_SECRET;
        this.env = env;
    }

    getAuthUrl(userId, redirectUri) {
        const scopes = [
            'user-read-currently-playing',
            'user-read-playback-state',
            'user-read-recently-played'
        ].join(' ');

        const state = btoa(JSON.stringify({userId, timestamp: Date.now()}));

        return `https://accounts.spotify.com/authorize?` +
            `client_id=${this.clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `state=${state}`;
    }

    async exchangeCodeForTokens(code, redirectUri) {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(this.clientId + ':' + this.clientSecret)}`
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

    async refreshAccessToken(refreshToken) {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(this.clientId + ':' + this.clientSecret)}`
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

    async getCurrentTrack(accessToken) {
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

    async getUserTokens(userId) {
        const tokenData = await this.env.TOKENS.get(`spotify:${userId}`, 'json');

        if (!tokenData) {
            return null;
        }

        let accessToken = tokenData.access_token;

        if (Date.now() >= tokenData.expires_at) {
            const newTokens = await this.refreshAccessToken(tokenData.refresh_token);
            accessToken = newTokens.access_token;

            await this.env.TOKENS.put(`spotify:${userId}`, JSON.stringify({
                ...tokenData,
                access_token: newTokens.access_token,
                expires_at: Date.now() + (newTokens.expires_in * 1000)
            }));
        }

        return {...tokenData, access_token: accessToken};
    }

    async getCurrentTrackForUser(userId) {
        const tokens = await this.getUserTokens(userId);

        if (!tokens) {
            return null;
        }

        return await this.getCurrentTrack(tokens.access_token);
    }

    async saveUserTokens(userId, tokens) {
        await this.env.TOKENS.put(`spotify:${userId}`, JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + (tokens.expires_in * 1000),
            created_at: Date.now()
        }));
    }

    async removeUserTokens(userId) {
        await this.env.TOKENS.delete(`spotify:${userId}`);
    }

    async getAllUsers() {
        const userKeys = await this.env.TOKENS.list({prefix: 'spotify:'});
        return userKeys.keys.map(key => key.name.replace('spotify:', ''));
    }
}
