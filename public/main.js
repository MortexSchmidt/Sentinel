/* Telegram WebApp Store JavaScript */
(function() {
  console.log('[store] initializing Telegram WebApp store...');

  // Telegram/WebApp integration
  let pageChatId = null;
  const PLANS = [
    {days: 7, label: '7 дней', price: 179, description: 'Неделя доступа'},
    {days: 30, label: '30 дней', price: 358, description: 'Месяц доступа', popular: true},
    {days: 0, label: 'Навсегда', price: 4491, description: 'Перманентный доступ'}
  ];

  // Load user data
  async function loadUserData() {
    const params = new URLSearchParams(window.location.search);
    pageChatId = params.get('chat_id') || null;

    // Check for pending auth code in localStorage
    const pendingCode = localStorage.getItem('pendingAuthCode');
    if (pendingCode && !pageChatId) {
      console.log('[auth] found pending auth code:', pendingCode);
      // Here you would typically verify the code with your backend
      // For now, we'll just clear it and show a message
      localStorage.removeItem('pendingAuthCode');
      alert('Код авторизации использован! Теперь вы можете войти в магазин.');
      return;
    }

    const chatId = pageChatId || ((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) ? window.Telegram.WebApp.initDataUnsafe.user.id : null);

    if (!chatId) {
      console.log('[store] no chat_id found');
      return;
    }

    try {
      const response = await fetch('/me?chat_id=' + encodeURIComponent(chatId));
      const data = await response.json();

      if (data.ok) {
        const user = data.user || {};
        updateUserInterface(user, data);
        pageChatId = chatId;

        // If we're on webapp.html, redirect to main.html after auth
        if (window.location.pathname.includes('webapp.html')) {
          const redirectUrl = '/main.html' + (pageChatId ? '?chat_id=' + pageChatId : '');
          window.location.href = redirectUrl;
        }
      }
    } catch (error) {
      console.error('[store] error loading user data:', error);
    }
  }

  function updateUserInterface(user, data) {
    const storeName = document.getElementById('storeName');
    const storeUsername = document.getElementById('storeUsername');
    const storeStatus = document.getElementById('planStatus');
    const storeAvatar = document.getElementById('storeAvatar');

    if (storeName) storeName.textContent = user.first_name || user.username || 'Пользователь';
    if (storeUsername) storeUsername.textContent = user.username ? '@' + user.username : '';
    if (storeAvatar) {
      if (user.avatar) {
        storeAvatar.src = user.avatar;
        storeAvatar.classList.remove('hidden');
      }
    }

    const status = data.active ? (data.daysRemaining ? data.daysRemaining + ' дней' : 'Навсегда') : 'Нет подписки';
    if (storeStatus) storeStatus.textContent = status;
  }

  // Initialize interfaces based on current page
  function initInterface() {
    console.log('[store] initializing interface for:', window.location.pathname);

    if (window.location.pathname.includes('webapp.html')) {
      initAuthInterface();
    } else if (window.location.pathname.includes('main.html')) {
      initStoreInterface();
    }
  }

  // Initialize auth interface for webapp.html
  function initAuthInterface() {
    console.log('[auth] initializing auth interface...');

    const authBtn = document.getElementById('authBtn');
    const authCodeSection = document.getElementById('authCodeSection');
    const authCodeElement = document.getElementById('authCode');

    if (authBtn) {
      authBtn.addEventListener('click', () => {
        console.log('[auth] generating auth code...');

        // Generate random 6-digit code
        const authCode = generateAuthCode();
        console.log('[auth] generated code:', authCode);

        // Display the code
        if (authCodeElement) {
          authCodeElement.textContent = authCode;
        }

        // Show auth code section
        if (authCodeSection) {
          authCodeSection.classList.remove('hidden');
        }

        // Change button text
        authBtn.textContent = 'Код сгенерирован';
        authBtn.disabled = true;

        // Save code for later verification
        localStorage.setItem('pendingAuthCode', authCode);

        console.log('[auth] code displayed, waiting for bot verification');
      });
    }

    // Click on code to copy command
    if (authCodeElement) {
      authCodeElement.addEventListener('click', () => {
        const code = authCodeElement.textContent;
        if (code && code !== 'XXXXXX') {
          const command = `/auth ${code}`;
          navigator.clipboard.writeText(command).then(() => {
            // Visual feedback
            authCodeElement.style.background = 'rgba(79, 156, 249, 0.1)';
            authCodeElement.style.borderColor = 'var(--accent-primary)';
            authCodeElement.textContent = 'СКОПИРОВАНО!';

            setTimeout(() => {
              authCodeElement.style.background = 'var(--bg-card)';
              authCodeElement.style.borderColor = 'var(--border-color)';
              authCodeElement.textContent = code;
            }, 1500);
          }).catch(err => {
            console.error('[auth] failed to copy command:', err);
          });
        }
      });
    }
  }

  // Generate random 6-digit auth code
  function generateAuthCode() {
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  // Initialize store interface for main.html
  function initStoreInterface() {
    console.log('[store] initializing store interface...');
    loadUserData();
    renderPlans();
  }

  // Store functionality
  function initStore() {
    const authBtn = document.getElementById('authBtn');
    const buyBtn = document.getElementById('buyBtn');
    const showGiftBtn = document.getElementById('showGiftBtn');
    const giftSection = document.getElementById('giftSection');
    const giftUsername = document.getElementById('giftUsername');
    const cancelGiftBtn = document.getElementById('cancelGiftBtn');
    const sendGiftBtn = document.getElementById('sendGiftBtn');

    // Auth button
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        console.log('[store] auth button clicked');
        // Telegram WebApp auth logic would go here
        loadUserData();
      });
    }

    // Show gift section
    if (showGiftBtn) {
      showGiftBtn.addEventListener('click', () => {
        console.log('[store] show gift section');
        giftSection.classList.remove('hidden');
        showGiftBtn.parentElement.classList.add('hidden');
      });
    }

    // Cancel gift
    if (cancelGiftBtn) {
      cancelGiftBtn.addEventListener('click', () => {
        console.log('[store] cancel gift');
        giftSection.classList.add('hidden');
        showGiftBtn.parentElement.classList.remove('hidden');
        if (giftUsername) giftUsername.value = '';
      });
    }

    // Gift username input handler
    if (giftUsername) {
      giftUsername.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          const username = giftUsername.value.trim();
          if (username) {
            await showGiftPreview(username);
          }
        }
      });
    }

    // Send gift
    if (sendGiftBtn) {
      sendGiftBtn.addEventListener('click', async () => {
        const selectedPlan = document.querySelector('.gift-plan-card.selected');
        if (!selectedPlan) {
          alert('Выберите тариф для подарка');
          return;
        }

        const days = parseInt(selectedPlan.dataset.days);
        const to = giftUsername.value.trim();
        const from = pageChatId;

        if (!to || !from) {
          alert('Ошибка: не указан получатель или отправитель');
          return;
        }

        try {
          const response = await fetch('/gift', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({from_chat_id: from, to_username: to, days})
          });

          const data = await response.json();
          if (data.ok) {
            alert('Подарок отправлен успешно!');
            window.location.reload();
          } else {
            alert('Ошибка: ' + (data.error || 'неизвестная ошибка'));
          }
        } catch (error) {
          alert('Ошибка сети');
        }
      });
    }
  }

  function renderPlans() {
    const plansGrid = document.getElementById('plansGrid');
    if (!plansGrid) return;

    plansGrid.innerHTML = '';

    PLANS.forEach(plan => {
      const planCard = document.createElement('div');
      planCard.className = `plan-card ${plan.popular ? 'popular' : ''}`;
      planCard.dataset.days = plan.days;

      planCard.innerHTML = `
        <div class="plan-title">${plan.label}</div>
        <div class="plan-price">${plan.price} руб.</div>
        <div class="plan-description">${plan.description}</div>
      `;

      planCard.addEventListener('click', () => {
        document.querySelectorAll('.plan-card').forEach(card => card.classList.remove('selected'));
        planCard.classList.add('selected');

        const buyBtn = document.getElementById('buyBtn');
        if (buyBtn) {
          buyBtn.disabled = false;
        }
      });

      plansGrid.appendChild(planCard);
    });
  }

  async function showGiftPreview(username) {
    console.log('[store] showing gift preview for:', username);

    // Show preview section
    const giftPreview = document.getElementById('giftPreview');
    const giftPlansGrid = document.getElementById('giftPlansGrid');
    const giftToName = document.getElementById('giftToNameSmall');

    if (giftPreview) giftPreview.classList.remove('hidden');
    if (giftToName) giftToName.textContent = username;

    // Render gift plans
    if (giftPlansGrid) {
      giftPlansGrid.innerHTML = '';

      PLANS.forEach(plan => {
        const giftPlanCard = document.createElement('div');
        giftPlanCard.className = 'gift-plan-card';
        giftPlanCard.dataset.days = plan.days;

        giftPlanCard.innerHTML = `
          <div class="gift-plan-title">${plan.label}</div>
          <div class="gift-plan-price">${plan.price} руб.</div>
        `;

        giftPlanCard.addEventListener('click', () => {
          document.querySelectorAll('.gift-plan-card').forEach(card => card.classList.remove('selected'));
          giftPlanCard.classList.add('selected');
        });

        giftPlansGrid.appendChild(giftPlanCard);
      });
    }
  }

  // Initialize when DOM is ready
  function init() {
    console.log('[app] DOM ready, initializing...');
    initInterface();
    console.log('[app] initialization complete');
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debug function
  window.debugStore = function() {
    console.log('[store] debug info:');
    console.log('- plans grid:', !!document.getElementById('plansGrid'));
    console.log('- gift section:', !!document.getElementById('giftSection'));
    console.log('- user chat_id:', pageChatId);
    console.log('- auth button:', !!document.getElementById('authBtn'));
    console.log('- buy button:', !!document.getElementById('buyBtn'));
  };

  console.log('[app] script loaded');
})();
