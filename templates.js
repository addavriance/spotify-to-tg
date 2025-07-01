import {styles} from './styles.js';

// Базовый HTML шаблон
export function createBasePage(title, content, additionalStyles = '') {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${styles}
    ${additionalStyles}
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}

// Главная страница (лендинг)
// Главная страница (лендинг) - только информация и переход в бота
export function createLandingPage(botUsername) {
    const content = `
    <h1>🎵 Spotify в Telegram</h1>
    <p>Покажи что слушаешь прямо в профиле Telegram через приватный канал</p>
    
    <a href="https://t.me/${botUsername}" class="btn">
      🤖 Открыть бота
    </a>
    
    <div class="steps">
      <h3>Как это работает:</h3>
      <p><strong>1.</strong> Открываешь бота в Telegram</p>
      <p><strong>2.</strong> Привязываешь Spotify аккаунт</p>
      <p><strong>3.</strong> Бот создает приватный канал</p>
      <p><strong>4.</strong> Добавляешь канал в профиль</p>
      <p><strong>5.</strong> Трек обновляется автоматически!</p>
      
      <h3 style="margin-top: 20px;">Особенности:</h3>
      <p>• Обновление каждые 5 секунд</p>
      <p>• Красивый прогресс-бар с временем</p>
      <p>• Обложка трека как аватар канала</p>
      <p>• Название канала = название трека</p>
      <p>• Работает в фоне автоматически</p>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 16px;">
      <h3>🎯 Зачем это нужно?</h3>
      <p>Показывай друзьям свой музыкальный вкус прямо в профиле! Все увидят что ты слушаешь в реальном времени.</p>
    </div>
  `;

    return createBasePage('Telegram Spotify Status', content);
}

// Страница успешного подключения
export function createSuccessPage() {
    const content = `
    <div class="success-icon">✅</div>
    <h1>Spotify подключен!</h1>
    <p>Отлично! Теперь ваша музыка будет отображаться в профиле Telegram.</p>
    
    <div class="steps">
      <h3>Что дальше:</h3>
      <p><strong>1.</strong> Откройте Telegram</p>
      <p><strong>2.</strong> Найдите созданный канал в поиске</p>
      <p><strong>3.</strong> Добавьте канал в свой профиль</p>
      <p><strong>4.</strong> Включите музыку в Spotify</p>
    </div>
    
    <p style="margin-top: 24px; opacity: 0.7;">
      Можете закрыть эту вкладку
    </p>
  `;

    return createBasePage('Подключение успешно!', content);
}

// Страница ошибки
export function createErrorPage(error, description = '') {
    const content = `
    <div class="success-icon">❌</div>
    <h1>Ошибка подключения</h1>
    <p><strong>Что случилось:</strong> ${error}</p>
    ${description ? `<p>${description}</p>` : ''}
    
    <a href="/" class="btn" style="margin-top: 20px;">
      🔄 Попробовать снова
    </a>
    
    <div class="steps">
      <h3>Возможные причины:</h3>
      <p>• Отказ в авторизации Spotify</p>
      <p>• Проблемы с интернет-соединением</p>
      <p>• Временные неполадки сервиса</p>
    </div>
  `;

    return createBasePage('Ошибка', content, `
    .container {
      background: rgba(220, 53, 69, 0.15);
      border: 1px solid rgba(220, 53, 69, 0.3);
    }
    h1 {
      background: linear-gradient(45deg, #dc3545, #ff4757) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      background-clip: text !important;
    }
  `);
}

// Страница статуса/дашборд
export function createDashboardPage(user, track) {
    const trackInfo = track && track.is_playing ? `
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 16px; margin: 20px 0;">
      <h3>🎵 Сейчас играет:</h3>
      <p><strong>${track.item.name}</strong></p>
      <p>${track.item.artists.map(a => a.name).join(', ')}</p>
      <p style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px;">
        ${createProgressBarHTML(track.progress_ms, track.item.duration_ms)}
      </p>
    </div>
  ` : `
    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; margin: 20px 0;">
      <p>⏸️ Ничего не играет</p>
      <p style="opacity: 0.7;">Включите музыку в Spotify</p>
    </div>
  `;

    const content = `
    <h1>🎛️ Панель управления</h1>
    <p>Добро пожаловать, <strong>${user.name || 'пользователь'}</strong>!</p>
    
    ${trackInfo}
    
    <div class="steps">
      <h3>Управление:</h3>
      <p><a href="/disconnect" style="color: #ff4757;">🔌 Отключить Spotify</a></p>
      <p><a href="/current-track?user_id=${user.id}" style="color: #1DB954;">🔄 Обновить статус</a></p>
    </div>
  `;

    return createBasePage('Панель управления', content);
}

// Простой прогресс-бар для HTML
function createProgressBarHTML(current, total) {
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
