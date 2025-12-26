const DEFAULTS = {
    balance: 0,
    bonuses: 0,
    sessionDuration: 120,
    currentAvatar: './img/Ellipse 53.svg',
    userName: 'АЛЕКСЕЙ',
    phone: '+7(923)00-531-17',
    favouriteGame: 'Counter-Strike 2',
    pcNumber: 1,
    zone: 'VIP'
};

let state = {
    balance: parseFloat(localStorage.getItem('balance')) || DEFAULTS.balance,
    bonuses: parseInt(localStorage.getItem('bonuses')) || DEFAULTS.bonuses,
    sessionStartTime: parseInt(localStorage.getItem('sessionStartTime')) || Date.now(),
    sessionDuration: parseInt(localStorage.getItem('sessionDuration')) || DEFAULTS.sessionDuration,
    currentAvatar: localStorage.getItem('userAvatar') || DEFAULTS.currentAvatar,
    history: JSON.parse(localStorage.getItem('paymentHistory')) || [],
    notifications: JSON.parse(localStorage.getItem('notifications')) || {
        push: true,
        smsBooking: false
    },
    personal: JSON.parse(localStorage.getItem('personal')) || {
        name: DEFAULTS.userName,
        phone: DEFAULTS.phone
    },
    stats: JSON.parse(localStorage.getItem('stats')) || {
        visits: 12,
        hoursPlayed: 37,
        tournamentsPlayed: 0,
        favouriteGame: DEFAULTS.favouriteGame
    }
};

document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    initUI();
    setupEvents();
    startSessionTimer();
    loadNotificationSettings();
});

const DOM = {};

function cacheDom() {
    DOM.balanceTitle = document.querySelector('.text-wrapper-5');
    DOM.bonusesTitle = document.querySelector('.text-wrapper-7');
    DOM.sessionTime = document.querySelector('.text-wrapper-11');
    DOM.pcText = document.querySelector('.text-wrapper-12');
    DOM.zoneText = document.querySelector('.text-wrapper-13');
    DOM.avatarImg = document.querySelector('.img');
    DOM.avatarContainer = document.querySelector('.ellipse-variant');
    
    DOM.pushToggle = document.querySelector('.group-6');
    DOM.smsToggle = document.querySelector('.group-7');

    DOM.historyList = document.querySelector('.history-list');

    DOM.nameText = document.querySelector('.text-wrapper-18');
    DOM.phoneText = document.querySelector('.text-wrapper-19');
    DOM.tournamentsText = document.querySelector('.p');
    DOM.favGameText = document.querySelector('.text-wrapper-24');

    DOM.modals = document.querySelectorAll('.modal');
    DOM.modalCurrentTime = document.getElementById('currentTime');
}

function initUI() {
    initAvatarOverlay();
    updateBalanceAndBonuses();
    updateSessionTexts();
    updateAvatar();
    renderHistory();
    fillStaticTexts();
}

function initAvatarOverlay() {
    if (!DOM.avatarContainer) return;
    if (!DOM.avatarContainer.querySelector('.avatar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'avatar-overlay';
        overlay.textContent = 'Сменить фото';
        DOM.avatarContainer.appendChild(overlay);
    }
}

function fillStaticTexts() {
     const nameField = document.querySelector('.text-wrapper-22');
    const phoneField = document.querySelector('.text-wrapper-21');
    
    if (nameField) {
        nameField.textContent = state.personal.name;
    }
    if (phoneField) {
        phoneField.textContent = state.personal.phone;
    }
    
    if (DOM.favGameText) {
        DOM.favGameText.textContent = state.stats.favouriteGame;
    }
    if (DOM.tournamentsText) {
        DOM.tournamentsText.textContent = state.stats.tournamentsPlayed > 0
            ? `Вы участвуете в ${state.stats.tournamentsPlayed} турнирах`
            : 'Вы не зарегистрированы ни на один турнир';
    }
}

function updateBalanceAndBonuses() {
    if (DOM.balanceTitle) {
        DOM.balanceTitle.textContent = `баланс: ${state.balance} р`;
    }
    if (DOM.bonusesTitle) {
        DOM.bonusesTitle.textContent = `Бонусы: ${state.bonuses}`;
    }
}

function updateSessionTexts() {
    if (DOM.pcText && !DOM.pcText.dataset.inited) {
        DOM.pcText.dataset.inited = '1';
        DOM.pcText.textContent = `Компьютер: №${DEFAULTS.pcNumber}`;
    }
    if (DOM.zoneText && !DOM.zoneText.dataset.inited) {
        DOM.zoneText.dataset.inited = '1';
        DOM.zoneText.textContent = `Зона: ${DEFAULTS.zone}`;
    }
}

function updateAvatar() {
    if (DOM.avatarImg) {
        DOM.avatarImg.src = state.currentAvatar;
    }
}

function renderHistory() {
    if (!DOM.historyList) return;
    if (!state.history.length) {
        DOM.historyList.innerHTML = '<div class="history-item">Пополнений пока не было</div>';
        return;
    }

    DOM.historyList.innerHTML = state.history
        .map(item => `
            <div class="history-item">
                <div><strong>+${item.amount} ₽</strong></div>
                <div>${item.date} ${item.time}</div>
                <div>${item.method}</div>
            </div>
        `)
        .join('');
}

function setupEvents() {
    bindModal('.group', 'rechargeModal');
    bindModal('.group-2', 'sessionModal');
    bindModal('.rectangle-7', 'historyModal');
    bindModal('.ellipse-variant', 'avatarModal');
    bindModal('.text-wrapper-25', 'profileModal');

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    DOM.modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeAllModals();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    document.querySelectorAll('.recharge-option[data-amount]').forEach(btn => {
        btn.addEventListener('click', function () {
            const amount = parseInt(this.getAttribute('data-amount'));
            if (!amount || amount <= 0) return;
            rechargeBalance(amount);
        });
    });

    const customBtn = document.getElementById('rechargeCustomBtn');
    const customInput = document.getElementById('customAmount');
    if (customBtn && customInput) {
        customBtn.addEventListener('click', () => {
            const val = parseInt(customInput.value);
            if (isNaN(val)) {
                showNotification('❌ Введите сумму', 'error');
                return;
            }
            if (val < 10 || val > 10000) {
                showNotification('❌ Сумма от 10 до 10 000 ₽', 'error');
                return;
            }
            rechargeBalance(val);
            customInput.value = '';
        });
    }

    const extendSessionBtn = document.getElementById('extendSessionBtn');
    if (extendSessionBtn) {
        extendSessionBtn.addEventListener('click', () => {
            extendSession();
        });
    }

    const endSessionBtn = document.querySelector('.group-3');
    const endSessionModalBtn = document.getElementById('endSessionBtn');
    const endHandler = () => {
        if (confirm('Вы уверены, что хотите завершить сессию?')) {
            endSession();
        }
    };
    if (endSessionBtn) endSessionBtn.addEventListener('click', endHandler);
    if (endSessionModalBtn) endSessionModalBtn.addEventListener('click', endHandler);

    const playBtn = document.querySelector('.text-wrapper-30');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            playBtn.classList.add('clicked');
            setTimeout(() => playBtn.classList.remove('clicked'), 150);
            showNotification('🎮 Запуск Counter-Strike 2 на вашем ПК...');
        });
    }

    const editNameBtn = document.querySelector('.pencil-svgrepo-com-wrapper');
    const editPhoneBtn = document.querySelector('.rectangle-16');
    if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
            const newName = prompt('Введите новое имя', state.personal.name);
            if (!newName) return;
            if (newName.trim().length < 2) {
                showNotification('❌ Слишком короткое имя', 'error');
                return;
            }
            state.personal.name = newName.trim();
            saveState();
            fillStaticTexts();
            showNotification('✅ Имя обновлено');
        });
    }
    if (editPhoneBtn) {
        editPhoneBtn.addEventListener('click', () => {
            const newPhone = prompt('Введите телефон в формате +7XXXXXXXXXX', state.personal.phone);
            if (!newPhone) return;
            const digits = newPhone.replace(/\D/g, '');
            if (!/^7\d{10}$/.test(digits)) {
                showNotification('❌ Некорректный номер телефона', 'error');
                return;
            }
            state.personal.phone = newPhone;
            saveState();
            fillStaticTexts();
            showNotification('✅ Телефон обновлен');
        });
    }

    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.addEventListener('click', function () {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    const avatarFileInput = document.getElementById('avatarFile');
    const uploadBtn = document.querySelector('.upload-btn');
    if (uploadBtn && avatarFileInput) {
        uploadBtn.addEventListener('click', () => avatarFileInput.click());
        avatarFileInput.addEventListener('change', handleAvatarUpload);
    }

    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
    if (saveAvatarBtn) {
        saveAvatarBtn.addEventListener('click', saveAvatarFromModal);
    }

    const statsButton = document.querySelector('.text-wrapper-20');
    const tournamentsButton = document.querySelector('.text-wrapper-20_1');
    
    if (statsButton) {
        statsButton.addEventListener('click', function () {
            showNotification('📊 Открываем статистику...');
            openStatsModal();
        });
    }
    
    if (tournamentsButton) {
        tournamentsButton.addEventListener('click', function () {
            showNotification('🏆 Открываем информацию о турнирах...');
            openTournamentModal();
        });
    }

    const headerItems = document.querySelectorAll('.text-wrapper-25, .text-wrapper-26, .text-wrapper-27, .text-wrapper-28, .text-wrapper-29');
    headerItems.forEach(item => {
        item.addEventListener('click', function () {
            const text = this.textContent.trim();
            showNotification(`➡ Переход в раздел: ${text}`);
        });
    });

    if (DOM.pushToggle) {
        DOM.pushToggle.addEventListener('click', function() {
            const circle = this.querySelector('.rectangle-11');
            const background = this.querySelector('.rectangle-10');
            
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                if (circle) circle.style.left = '-1px';
                if (background) background.style.background = 'linear-gradient(90deg, rgba(36, 36, 36, 1) 0%, rgba(119, 119, 119, 1) 100%)';
                state.notifications.push = false;
                window.disablePushNotifications = true;
            
                const existing = document.querySelector('.success-notification');
                if (existing) existing.remove();
                showNotification('🔕 Push-уведомления отключены');
            } else {
                this.classList.add('active');
                if (circle) circle.style.left = '45px';
                if (background) background.style.background = 'linear-gradient(90deg, rgba(184, 32, 44, 1) 0%, rgba(0, 0, 0, 1) 100%)';
                state.notifications.push = true;
                window.disablePushNotifications = false;
                showNotification('🔔 Push-уведомления включены');
            }
            saveState();
        });
    }

    if (DOM.smsToggle) {
        DOM.smsToggle.addEventListener('click', function() {
            const circle = this.querySelector('.rectangle-13');
            const background = this.querySelector('.rectangle-12');
            
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                if (circle) circle.style.left = '-1px';
                if (background) background.style.background = 'linear-gradient(90deg, rgba(36, 36, 36, 1) 0%, rgba(119, 119, 119, 1) 100%)';
                state.notifications.smsBooking = false;
                showNotification('📴 SMS о брони отключены');
            } else {
                this.classList.add('active');
                if (circle) circle.style.left = '45px';
                if (background) background.style.background = 'linear-gradient(90deg, rgba(184, 32, 44, 1) 0%, rgba(0, 0, 0, 1) 100%)';
                state.notifications.smsBooking = true;
                showNotification('📲 SMS о брони включены');
            }
            saveState();
        });
    }

    setTimeout(() => {
        initStatsModal();
        initTournamentModal();
        setupTournamentEvents();
    }, 100);
}

function bindModal(triggerSelector, modalId) {
    document.querySelectorAll(triggerSelector).forEach(el => {
        el.addEventListener('click', () => openModal(modalId));
    });
}

function openModal(id) {
    closeAllModals();
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function openStatsModal() {
    closeAllModals();
    const modalId = 'statsModal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        initStatsModal();
        modal = document.getElementById(modalId);
    }
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function openTournamentModal() {
    closeAllModals();
    const modalId = 'tournamentModal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        initTournamentModal();
        modal = document.getElementById(modalId);
    }
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeAllModals() {
    DOM.modals.forEach(m => m.style.display = 'none');
    document.body.style.overflow = 'auto';
    
    const customModals = ['statsModal', 'tournamentModal'];
    customModals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    });
}

function rechargeBalance(amount) {
    state.balance += amount;
    const bonusEarned = Math.floor(amount * 0.1);
    state.bonuses += bonusEarned;

    const now = new Date();
    state.history.unshift({
        amount,
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        method: 'Банковская карта'
    });

    state.stats.visits += 1;
    state.stats.hoursPlayed += Math.round(amount / 50);

    saveState();
    updateBalanceAndBonuses();
    renderHistory();
    fillStaticTexts();
    closeAllModals();
    showNotification(`✅ Баланс пополнен на ${amount} ₽ (+${bonusEarned} бонусов)`);
}

function startSessionTimer() {
    if (!state.sessionStartTime) {
        state.sessionStartTime = Date.now();
        saveState();
    }

    setInterval(() => {
        const now = Date.now();
        const elapsedMin = Math.floor((now - state.sessionStartTime) / 60000);
        const total = state.sessionDuration;
        const current = Math.min(elapsedMin, total);

        const hCur = Math.floor(current / 60);
        const mCur = current % 60;
        const hTotal = Math.floor(total / 60);
        const mTotal = total % 60;

        const timeStr = `Время: ${hCur}:${mCur.toString().padStart(2, '0')}/${hTotal}:${mTotal.toString().padStart(2, '0')}`;

        if (DOM.sessionTime) {
            DOM.sessionTime.textContent = timeStr;
        }
        if (DOM.modalCurrentTime) {
            DOM.modalCurrentTime.textContent = `${hCur}:${mCur.toString().padStart(2, '0')}`;
        }

        if (elapsedMin >= total && total > 0) {
            state.sessionDuration = 0;
            saveState();
            showNotification('⏰ Время сессии истекло', 'error');
        }
    }, 1000);
}

function extendSession() {
    const price = 50;
    const minutes = 30;
    if (state.balance < price) {
        showNotification('❌ Недостаточно средств для продления', 'error');
        return;
    }
    state.balance -= price;
    state.sessionDuration += minutes;
    saveState();
    updateBalanceAndBonuses();
    showNotification(`✅ Сессия продлена на ${minutes} минут`);
    closeAllModals();
}

function endSession() {
    state.sessionStartTime = Date.now();
    state.sessionDuration = 0;
    saveState();
    showNotification('✅ Сессия завершена');
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const size = Math.min(img.width, img.height);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 200;

            ctx.save();
            ctx.beginPath();
            ctx.arc(100, 100, 100, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
            ctx.restore();

            const cropped = canvas.toDataURL('image/png');

            const optionsContainer = document.querySelector('.avatar-options');
            if (optionsContainer) {
                const preview = document.createElement('div');
                preview.className = 'avatar-option selected custom-preview';
                preview.innerHTML = `<img src="${cropped}" alt="avatar">`;
                optionsContainer.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                optionsContainer.prepend(preview);

                preview.addEventListener('click', function () {
                    optionsContainer.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                    preview.classList.add('selected');
                });
            }

            state.currentAvatar = cropped;
            updateAvatar();
            saveState();
            showNotification('✅ Фото загружено и сохранено');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function saveAvatarFromModal() {
    const selected = document.querySelector('.avatar-option.selected img');
    if (!selected) {
        showNotification('❌ Выберите аватар', 'error');
        return;
    }
    state.currentAvatar = selected.src;
    saveState();
    updateAvatar();
    closeAllModals();
    showNotification('✅ Аватар обновлен');
}

function loadNotificationSettings() {
    if (DOM.pushToggle) {
        state.notifications.push = true;
        DOM.pushToggle.classList.add('active');
        
        const pushCircle = DOM.pushToggle.querySelector('.rectangle-11');
        if (pushCircle) {
            pushCircle.style.left = '45px';
        }
    
        const pushBackground = DOM.pushToggle.querySelector('.rectangle-10');
        if (pushBackground) {
            pushBackground.style.background = 'linear-gradient(90deg, rgba(184, 32, 44, 1) 0%, rgba(0, 0, 0, 1) 100%)';
        }
        
        window.disablePushNotifications = false;
    }
    
    if (DOM.smsToggle) {
        state.notifications.smsBooking = false;
        DOM.smsToggle.classList.remove('active');
        
        const smsCircle = DOM.smsToggle.querySelector('.rectangle-13');
        if (smsCircle) {
            smsCircle.style.left = '-1px';
        }
        
        const smsBackground = DOM.smsToggle.querySelector('.rectangle-12');
        if (smsBackground) {
            smsBackground.style.background = 'linear-gradient(90deg, rgba(36, 36, 36, 1) 0%, rgba(119, 119, 119, 1) 100%)';
        }
    }
}

function initStatsModal() {
    if (document.getElementById('statsModal')) return;
    
    const statsModal = document.createElement('div');
    statsModal.id = 'statsModal';
    statsModal.className = 'modal';
    statsModal.style.display = 'none';
    
    statsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Ваша статистика</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="stats-grid">
                    <div class="stat-item">
                        <h3>🎮 Посещения</h3>
                        <p class="stat-value">${state.stats.visits} раз</p>
                    </div>
                    <div class="stat-item">
                        <h3>⏱️ Всего часов</h3>
                        <p class="stat-value">${state.stats.hoursPlayed} часов</p>
                    </div>
                    <div class="stat-item">
                        <h3>🏆 Турниры</h3>
                        <p class="stat-value">${state.stats.tournamentsPlayed} сыграно</p>
                    </div>
                    <div class="stat-item">
                        <h3>⭐ Любимая игра</h3>
                        <p class="stat-value">${state.stats.favouriteGame}</p>
                    </div>
                </div>
                <div class="stats-summary">
                    <h3>Средние показатели:</h3>
                    <p>• Среднее время за сеанс: ${Math.round(state.stats.hoursPlayed / Math.max(state.stats.visits, 1) * 60)} минут</p>
                    <p>• Пополнений: ${state.history.length} раз</p>
                    <p>• Всего потрачено: ${state.history.reduce((sum, item) => sum + item.amount, 0)} ₽</p>
                    <p>• Всего бонусов: ${state.bonuses}</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(statsModal);
    
    statsModal.querySelector('.close-modal').addEventListener('click', closeAllModals);
    statsModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    if (!document.querySelector('#stats-styles')) {
        const statsStyles = document.createElement('style');
        statsStyles.id = 'stats-styles';
        statsStyles.textContent = `
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .stat-item {
                background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
                border: 2px solid #b8202c;
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                transition: transform 0.3s ease;
            }
            
            .stat-item:hover {
                transform: translateY(-5px);
            }
            
            .stat-item h3 {
                color: #fff;
                font-family: "Unbounded-Regular", Helvetica;
                font-size: 18px;
                margin: 0 0 10px 0;
                opacity: 0.9;
            }
            
            .stat-value {
                color: #fff;
                font-family: "Unbounded-Bold", Helvetica;
                font-size: 24px;
                margin: 0;
                background: linear-gradient(90deg, #b8202c 0%, #ff4757 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .stats-summary {
                background: rgba(184, 32, 44, 0.1);
                border: 1px solid #b8202c;
                border-radius: 15px;
                padding: 20px;
            }
            
            .stats-summary h3 {
                color: #fff;
                font-family: "Unbounded-Bold", Helvetica;
                font-size: 20px;
                margin-top: 0;
                margin-bottom: 15px;
            }
            
            .stats-summary p {
                color: #fff;
                font-family: "Unbounded-Regular", Helvetica;
                font-size: 16px;
                margin: 8px 0;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(statsStyles);
    }
}

function initTournamentModal() {
    if (document.getElementById('tournamentModal')) return;
    
    const tournamentModal = document.createElement('div');
    tournamentModal.id = 'tournamentModal';
    tournamentModal.className = 'modal';
    tournamentModal.style.display = 'none';
    
    tournamentModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Ваши турниры</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="tournament-status">
                    <h3>Статус: <span class="status-active">${state.stats.tournamentsPlayed > 0 ? 'Активен' : 'Не участвуете'}</span></h3>
                    <p>Количество активных турниров: <strong>${state.stats.tournamentsPlayed}</strong></p>
                </div>
                
                ${state.stats.tournamentsPlayed > 0 ? `
                <div class="active-tournaments">
                    <h3>Активные турниры:</h3>
                    <div class="tournament-card">
                        <div class="tournament-header">
                            <span class="tournament-name">CyberX CS2 Championship</span>
                            <span class="tournament-prize">Приз: 50,000 ₽</span>
                        </div>
                        <div class="tournament-info">
                            <p>📅 Дата: 15-20 апреля 2024</p>
                            <p>🎮 Игра: Counter-Strike 2</p>
                            <p>👥 Участники: 32 команды</p>
                            <p>🏆 Ваша позиция: 8 место</p>
                        </div>
                        <div class="tournament-progress">
                            <div class="progress-bar">
                                <div class="progress" style="width: 60%"></div>
                            </div>
                            <span class="progress-text">Прогресс: 60%</span>
                        </div>
                    </div>
                </div>
                ` : `
                <div class="no-tournaments">
                    <div class="empty-state">
                        <h3>🎯 Турниры еще не начались</h3>
                        <p>Вы пока не зарегистрированы ни на один турнир.</p>
                        <p>Присоединяйтесь к соревнованиям, чтобы:</p>
                        <ul>
                            <li>Выиграть денежные призы</li>
                            <li>Повысить свой рейтинг</li>
                            <li>Получить эксклюзивные бонусы</li>
                            <li>Стать частью киберспортивного сообщества</li>
                        </ul>
                        <button id="joinTournamentBtn" class="recharge-option" style="margin-top: 20px; width: 100%;">
                            Присоединиться к турниру
                        </button>
                    </div>
                </div>
                `}
                
                <div class="upcoming-tournaments">
                    <h3>Ближайшие турниры:</h3>
                    <div class="tournament-list">
                        <div class="tournament-item">
                            <span class="tournament-title">Dota 2 Spring Cup</span>
                            <span class="tournament-date">25 апреля</span>
                            <button class="tournament-join-btn" data-game="Dota 2">Записаться</button>
                        </div>
                        <div class="tournament-item">
                            <span class="tournament-title">Valorant Weekly</span>
                            <span class="tournament-date">Каждую субботу</span>
                            <button class="tournament-join-btn" data-game="Valorant">Записаться</button>
                        </div>
                        <div class="tournament-item">
                            <span class="tournament-title">CyberX CS:GO Open</span>
                            <span class="tournament-date">1 мая</span>
                            <button class="tournament-join-btn" data-game="Counter-Strike 2">Записаться</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(tournamentModal);
    
    tournamentModal.querySelector('.close-modal').addEventListener('click', closeAllModals);
    tournamentModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    if (!document.querySelector('#tournament-styles')) {
        const tournamentStyles = document.createElement('style');
        tournamentStyles.id = 'tournament-styles';
        tournamentStyles.textContent = `
            .tournament-status {
                background: linear-gradient(135deg, rgba(184, 32, 44, 0.2) 0%, rgba(26, 26, 26, 1) 100%);
                border: 1px solid #b8202c;
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 25px;
            }
            
            .tournament-status h3 {
                color: #fff;
                font-family: "Unbounded-Bold", Helvetica;
                font-size: 22px;
                margin-top: 0;
            }
            
            .status-active {
                color: #00b894;
            }
            
            .status-inactive {
                color: #e74c3c;
            }
            
            .tournament-card {
                background: #2a2a2a;
                border: 2px solid #b8202c;
                border-radius: 15px;
                padding: 20px;
                margin: 15px 0;
            }
            
            .tournament-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .tournament-name {
                color: #fff;
                font-family: "Unbounded-Bold", Helvetica;
                font-size: 18px;
            }
            
            .tournament-prize {
                color: #00b894;
                font-family: "Unbounded-Regular", Helvetica;
                font-size: 16px;
                font-weight: bold;
            }
            
            .tournament-info p {
                color: #fff;
                font-family: "Unbounded-Regular", Helvetica;
                margin: 8px 0;
                opacity: 0.9;
            }
            
            .tournament-progress {
                margin-top: 20px;
            }
            
            .progress-bar {
                height: 10px;
                background: #474141;
                border-radius: 5px;
                overflow: hidden;
                margin-bottom: 5px;
            }
            
            .progress {
                height: 100%;
                background: linear-gradient(90deg, #b8202c 0%, #ff4757 100%);
                border-radius: 5px;
            }
            
            .progress-text {
                color: #fff;
                font-family: "Unbounded-Regular", Helvetica;
                font-size: 14px;
            }
            
            .empty-state {
                text-align: center;
                padding: 30px;
                background: rgba(26, 26, 26, 0.5);
                border-radius: 15px;
                border: 2px dashed #b8202c;
            }
            
            .empty-state h3 {
                color: #fff;
                font-family: "Unbounded-Bold", Helvetica;
                font-size: 24px;
                margin-bottom: 15px;
            }
            
            .empty-state p {
                color: #fff;
                font-family: "Unbounded-Regular", Helvetica;
                opacity: 0.8;
                margin: 10px 0;
            }
            
            .empty-state ul {
                text-align: left;
                color: #fff;
                font-family: "Unbounded-Regular", Helvetica;
                padding-left: 20px;
                opacity: 0.9;
            }
            
            .empty-state li {
                margin: 8px 0;
            }
            
            .upcoming-tournaments {
                margin-top: 30px;
            }
            
            .upcoming-tournaments h3 {
                color: #fff;
                font-family: "Unbounded-Bold", Helvetica;
                font-size: 20px;
                margin-bottom: 15px;
            }
            
            .tournament-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .tournament-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 10px;
                padding: 15px;
                transition: all 0.3s ease;
            }
            
            .tournament-item:hover {
                border-color: #b8202c;
                transform: translateX(5px);
            }
            
            .tournament-title {
                color: #fff;
                font-family: "Unbounded-Regular", Helvetica;
                font-size: 16px;
                flex: 1;
            }
            
            .tournament-date {
                color: #888;
                font-family: "Unbounded-Regular", Helvetica;
                font-size: 14px;
                margin: 0 15px;
            }
            
            .tournament-join-btn {
                background: linear-gradient(135deg, #b8202c 0%, #8a0000 100%);
                border: 2px solid #fff;
                border-radius: 8px;
                color: white;
                padding: 8px 15px;
                font-family: "Unbounded-Regular", Helvetica;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .tournament-join-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 0 10px rgba(184, 32, 44, 0.5);
            }
        `;
        document.head.appendChild(tournamentStyles);
    }
}

function setupTournamentEvents() {
    document.addEventListener('click', function(e) {
        if (e.target.id === 'joinTournamentBtn' || (e.target.classList && e.target.classList.contains('tournament-join-btn'))) {
            const btn = e.target.id === 'joinTournamentBtn' ? e.target : e.target;
            const game = btn.dataset.game || 'Counter-Strike 2';
            
            if (state.balance < 100) {
                showNotification('❌ Недостаточно средств для регистрации (требуется 100 ₽)', 'error');
                return;
            }
            
            state.balance -= 100;
            state.stats.tournamentsPlayed += 1;
            state.stats.favouriteGame = game;
            saveState();
            
            showNotification(`✅ Вы зарегистрированы на турнир по ${game}!`);
            closeAllModals();
            
            fillStaticTexts();
            
            setTimeout(() => {
                openTournamentModal();
            }, 500);
        }
    });
}

let notificationTimeout;
function showNotification(text, type = 'success') {
    if (window.disablePushNotifications && type !== 'error') {
        return;
    }
    
    const existing = document.querySelector('.success-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'success-notification';
    if (type === 'error') {
        div.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
    }
    div.textContent = text;
    document.body.appendChild(div);

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

function saveState() {
    localStorage.setItem('balance', state.balance);
    localStorage.setItem('bonuses', state.bonuses);
    localStorage.setItem('sessionStartTime', state.sessionStartTime);
    localStorage.setItem('sessionDuration', state.sessionDuration);
    localStorage.setItem('userAvatar', state.currentAvatar);
    localStorage.setItem('paymentHistory', JSON.stringify(state.history));
    localStorage.setItem('notifications', JSON.stringify(state.notifications));
    localStorage.setItem('personal', JSON.stringify(state.personal));
    localStorage.setItem('stats', JSON.stringify(state.stats));
}

window.disablePushNotifications = false;    