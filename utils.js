// utils.js - Общие утилиты

// Создание прогресс-бара
export function createProgressBar(current, total) {
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

// Форматирование времени из миллисекунд в MM:SS
export function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Генерация уникального ID пользователя
export function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Создание HTTP ответа с правильными заголовками
export function createHTMLResponse(html, options = {}) {
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': options.cache || 'no-cache',
            ...options.headers
        }
    });
}

// Создание JSON ответа
export function createJSONResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

// Обработка ошибок
export function createErrorResponse(message, status = 500) {
    return new Response(message, {
        status,
        headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
