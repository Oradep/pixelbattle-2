// Получение элементов DOM
const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const userStatusElement = document.getElementById('user-status');
const logoutButton = document.getElementById('logout-button');

const PIXEL_SIZE = 13;
const GRID_SIZE = 32;

canvas.width = PIXEL_SIZE * GRID_SIZE;
canvas.height = PIXEL_SIZE * GRID_SIZE;

let currentPixels = {};

// Загрузка всех пикселей с сервера
async function loadPixels() {
    try {
        const response = await fetch('/get_pixels');
        if (!response.ok) throw new Error('Ошибка загрузки пикселей');

        const pixels = await response.json();
        pixels.forEach(({ x, y, color }) => {
            currentPixels[`${x},${y}`] = color;
            ctx.fillStyle = color;
            ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        });
    } catch (error) {
        console.error('Ошибка при загрузке пикселей:', error);
    }
}

// Установка пикселя на сервере
async function setPixel(x, y, color) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Вы должны быть авторизованы для изменения пикселей.');
        return;
    }

    try {
        const response = await fetch('/set_pixel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ x, y, color })
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Неизвестная ошибка при отправке пикселя');
        }

        console.log('Пиксель успешно установлен.');
    } catch (error) {
        console.error('Ошибка при установке пикселя:', error);
    }
}

// Периодический опрос сервера на изменения
async function pollUpdates() {
    try {
        const response = await fetch('/get_pixels');
        if (!response.ok) throw new Error('Ошибка загрузки пикселей');

        const pixels = await response.json();

        pixels.forEach(({ x, y, color }) => {
            const pixelKey = `${x},${y}`;

            if (!currentPixels[pixelKey] || currentPixels[pixelKey] !== color) {
                currentPixels[pixelKey] = color;
                ctx.fillStyle = color;
                ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        });
    } catch (error) {
        console.error('Ошибка при получении обновлений:', error);
    }
}

// Аутентификация
function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
    modal.style.display = 'none';
}

function updateUserStatus(username) {
    if (username) {
        userStatusElement.textContent = `Игрок: ${username}`;
        logoutButton.style.display = 'inline-block';
    } else {
        userStatusElement.textContent = '';
        logoutButton.style.display = 'none';
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ошибка регистрации');

        localStorage.setItem('username', username);
        localStorage.setItem('authToken', result.token);
        hideAuthModal();
        updateUserStatus(username);
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
}

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ошибка входа');

        localStorage.setItem('authToken', result.token);
        localStorage.setItem('username', username);
        hideAuthModal();

        

        if (username === 'admin') {
            goToAdminPanel()
        }

    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
}


  async function goToAdminPanel() {

            const token = localStorage.getItem('authToken');
            const url = '/admin';
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
        
                if (response.ok) {
                    const data = await response.text();
        
                    const iframe = document.createElement('iframe');
                    iframe.style.width = '100%';
                    iframe.style.height = '100vh';
                    document.body.innerHTML = '';
                    document.body.appendChild(iframe);
        
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    doc.open();
                    doc.write(data);
                    doc.close();
                } else if (response.status === 403) {
                    console.error('Access denied: You do not have the required permissions.');
                } else {
                    console.error('Error:', response.status, await response.json());
                }
            } catch (error) {
                console.error('Ошибка при входе в админ-панель:', error);
            }

  }


logoutButton.addEventListener('click', () => {
    localStorage.removeItem('username');
    localStorage.removeItem('authToken');
    updateUserStatus(null);
    window.location.reload();
});

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / PIXEL_SIZE);

    const color = colorPicker.value;
    ctx.fillStyle = color;
    ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);

    setPixel(x, y, color);
});

// Смена темы
themeToggle.addEventListener('click', () => {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
      localStorage.setItem('theme', 'light');
      document.documentElement.style.setProperty('--bg-color', '#f7f6f3');
      document.documentElement.style.setProperty('--text-color', '#444444');
      document.documentElement.style.setProperty('--primary-color', '#82c79f');
      document.documentElement.style.setProperty('--secondary-color', '#3aad6a');
      themeToggle.style.color = '#444444';
    } else {
      localStorage.setItem('theme', 'dark');
      document.documentElement.style.setProperty('--bg-color', '#101115');
      document.documentElement.style.setProperty('--text-color', '#f7f6f3');
      document.documentElement.style.setProperty('--primary-color', '#3aad6a');
      document.documentElement.style.setProperty('--secondary-color', '#82c79f');
      themeToggle.style.color = '#f7f6f3';
    }
});



// Экспорт
const exportButton = document.createElement('button');
exportButton.textContent = 'Экспортировать картинку';
exportButton.style.cssText = `
    margin: 10px;
    padding: 10px 20px;
    background-color: var(--primary-color);
    color: var(--text-color);
    border: none;
    border-radius: 5px;
    cursor: pointer;
`;
document.body.appendChild(exportButton);

exportButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'pixel_art.png'; 
    link.href = canvas.toDataURL();
    link.click();
});


// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
        updateUserStatus('Игрок: ' + localStorage.getItem('username'));
    } else {
        showAuthModal();
    }


    const username = localStorage.getItem('username');
    const adminButton = document.getElementById('admin-panel-button');

    if (username === 'admin') {
      adminButton.classList.remove('hidden');
    }


    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.documentElement.style.setProperty('--bg-color', '#101115');
        document.documentElement.style.setProperty('--text-color', '#f7f6f3');
        document.documentElement.style.setProperty('--primary-color', '#3aad6a');
        document.documentElement.style.setProperty('--secondary-color', '#82c79f');
        themeToggle.style.color = '#f7f6f3'; 
    }
    loadPixels();
    setInterval(pollUpdates, 1000);
});