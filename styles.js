export const styles = `
* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
    background: linear-gradient(135deg, #1DB954 0%, #191414 100%);
    color: white;
    margin: 0;
    padding: 20px;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    text-align: center;
    max-width: 450px;
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    padding: 40px;
    border-radius: 24px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

h1 {
    margin-bottom: 16px;
    font-size: 2.2em;
    font-weight: 600;
    background: linear-gradient(45deg, #1DB954, #1ed760);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

h2 {
    margin-bottom: 12px;
    font-size: 1.4em;
    font-weight: 500;
}

h3 {
    margin-bottom: 8px;
    font-size: 1.1em;
    font-weight: 500;
    color: #1DB954;
}

p {
    opacity: 0.9;
    margin-bottom: 20px;
    line-height: 1.5;
}

.btn {
    background: linear-gradient(45deg, #1DB954, #1ed760);
    color: white;
    padding: 16px 32px;
    border: none;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(29, 185, 84, 0.4);
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(29, 185, 84, 0.6);
}

.btn:active {
    transform: translateY(0);
}

.steps {
    margin-top: 32px;
    text-align: left;
    opacity: 0.85;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.steps p {
    margin-bottom: 8px;
}

.success-icon {
    font-size: 4em;
    margin-bottom: 20px;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-10px);
    }
    60% {
        transform: translateY(-5px);
    }
}

.error-container {
    background: rgba(220, 53, 69, 0.2);
    border: 1px solid rgba(220, 53, 69, 0.3);
}

.error-container h1 {
    background: linear-gradient(45deg, #dc3545, #ff4757);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* Адаптивность */
@media (max-width: 480px) {
    body {
        padding: 10px;
    }

    .container {
        padding: 30px 20px;
    }

    h1 {
        font-size: 1.8em;
    }

    .btn {
        padding: 14px 28px;
        font-size: 15px;
    }
}

`
