/* Telegram WebApp Store JavaScript */
(function() {
  console.log('[store] initializing Telegram WebApp store...');

  // Telegram/WebApp integration
  let pageChatId = null;
  const PLANS = [
    {days: 7, label: '7 дней', price: 179, description: 'Неделя доступа'},
    {days: 30, label: '30 дней', price: 358, description: 'Месяц доступа', popular: true},
    {days: 0, label: 'Навсегда', price: 4441, description: 'Перманентный доступ'}
  ];

  // Additional plans for expandable section
  const ADDITIONAL_PLANS = [
    {days: 1, label: '1 День', price: 115, description: 'Лицензия'},
    {days: 14, label: '14 Дней', price: 266, description: 'Лицензия'},
    {days: 60, label: '60 Дней', price: 745, description: 'Лицензия'},
    {days: 180, label: '180 Дней', price: 2451, description: 'Лицензия'}
  ];

  // Load user data
  async function loadUserData() {
    const params = new URLSearchParams(window.location.search);
    pageChatId = params.get('chat_id') || null;

    // Check for pending auth code in localStorage
    const pendingCode = localStorage.getItem('pendingAuthCode');
    if (pendingCode && !pageChatId) {
      console.log('[auth] found pending auth code:', pendingCode);
      console.log('[auth] verifying code with server...');

      try {
        const response = await fetch('/auth/verify', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({code: pendingCode})
        });

        const data = await response.json();
        console.log('[auth] verification response:', data);

        if (data.ok && data.chat_id) {
          console.log('[auth] code verified, redirecting with chat_id:', data.chat_id);
          localStorage.removeItem('pendingAuthCode');
          // Redirect with verified chat_id
          window.location.href = '/main.html?chat_id=' + data.chat_id;
          return;
        } else {
          console.log('[auth] code verification failed:', data.error);
          localStorage.removeItem('pendingAuthCode');
          alert('Код авторизации неверный или уже использован. Пожалуйста, сгенерируйте новый код.');
          return;
        }
      } catch (error) {
        console.error('[auth] error verifying code:', error);
        localStorage.removeItem('pendingAuthCode');
        return;
      }
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

  // Helper: форматирует дату окончания подписки по количеству оставшихся дней
  function calculateExpiryDate(days) {
    try {
      const d = new Date();
      d.setDate(d.getDate() + Number(days));
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    } catch (e) {
      return '-';
    }
  }

  function updateUserInterface(user, data) {
    const storeName = document.getElementById('storeName');
    const storeUsername = document.getElementById('storeUsername');
    const storeStatus = document.getElementById('planStatus');
    const storeAvatar = document.getElementById('storeAvatar');
    const previewChat = document.getElementById('previewChatId');

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

    // header meta (top-right) — обновляем только если элемент присутствует
    const headerUserEl = document.getElementById('headerUser');
    const headerExpiryEl = document.getElementById('headerExpiry');
    if (headerUserEl) headerUserEl.textContent = user.username || user.first_name || 'Гость';
    if (headerExpiryEl) {
      if (data && data.active) {
        if (data.daysRemaining && !isNaN(Number(data.daysRemaining))) headerExpiryEl.textContent = calculateExpiryDate(Number(data.daysRemaining));
        else headerExpiryEl.textContent = 'Навсегда';
      } else {
        headerExpiryEl.textContent = 'Нет подписки';
      }
    }
    // also fill preview chat id if present (webapp.html preview)
    if (previewChat && user && user.chat_id) previewChat.textContent = user.chat_id;
    // also fill any preview element id in webapp (fallback)
    const previewEl = document.getElementById('previewChatId');
    if (previewEl && user && user.chat_id) previewEl.textContent = user.chat_id;
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
        console.log('[auth] saving to localStorage...');

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

       // Send code to server for registration
       registerAuthCode(authCode).then(() => {
         console.log('[auth] code registered on server successfully');
         // Start checking auth status
         startAuthStatusCheck();
       }).catch(error => {
         console.error('[auth] failed to register code on server:', error);
       });

       console.log('[auth] code displayed and registered, waiting for bot verification');
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
            authCodeElement.textContent = 'КОПИРОВАНО';

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

  // Register auth code on server
  async function registerAuthCode(code) {
    try {
      console.log('[auth] registering code on server:', code);
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code: code})
      });

      const data = await response.json();
      if (data.ok) {
        console.log('[auth] code registered successfully');
      } else {
        console.error('[auth] failed to register code:', data.error);
      }
    } catch (error) {
      console.error('[auth] error registering code:', error);
    }
  }

  // Start periodic auth status check
  function startAuthStatusCheck() {
    console.log('[auth] starting status check...');

    const checkInterval = setInterval(async () => {
      const pendingCode = localStorage.getItem('pendingAuthCode');
      if (pendingCode) {
        console.log('[auth] checking code:', pendingCode);

        try {
          const response = await fetch('/auth/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({code: pendingCode})
          });

          const data = await response.json();
          console.log('[auth] verification response:', data);

          if (data.ok && data.chat_id) {
            console.log('[auth] auth successful, stopping checks and redirecting');
            clearInterval(checkInterval);
            localStorage.removeItem('pendingAuthCode');
            window.location.href = '/main.html?chat_id=' + data.chat_id;
          } else {
            console.log('[auth] code not verified yet, continuing checks...');
          }
        } catch (error) {
          console.error('[auth] error during verification check:', error);
        }
      } else {
        console.log('[auth] no pending code found, stopping checks');
        clearInterval(checkInterval);
      }
    }, 2000); // Check every 2 seconds
  }

  // Show auth success UI
  function showAuthSuccess(chatId) {
    console.log('[auth] showing auth success UI for chat_id:', chatId);

    const authSuccessActions = document.getElementById('authSuccessActions');
    const authBtn = document.getElementById('authBtn');
    const authCodeSection = document.getElementById('authCodeSection');
    const goToStoreBtn = document.getElementById('goToStoreBtn');

    if (authSuccessActions) {
      authSuccessActions.style.display = 'block';
    }

    if (authBtn) {
      authBtn.textContent = 'Авторизация успешна';
      authBtn.style.background = 'var(--success)';
    }

    if (authCodeSection) {
      authCodeSection.classList.add('hidden');
    }

    // Add click handler for go to store button
    if (goToStoreBtn) {
      goToStoreBtn.addEventListener('click', () => {
        console.log('[auth] redirecting to store...');
        window.location.href = '/main.html?chat_id=' + chatId;
      });
    }

    // Add click handler for manual refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[auth] manual status refresh...');
        checkAuthStatus();
      });
    }

    // Clear pending code
    localStorage.removeItem('pendingAuthCode');
  }

  // Manual auth status check function
  async function checkAuthStatus() {
    const pendingCode = localStorage.getItem('pendingAuthCode');
    if (pendingCode) {
      console.log('[auth] manual check - checking code:', pendingCode);

      try {
        const response = await fetch('/auth/verify', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({code: pendingCode})
        });

        const data = await response.json();
        console.log('[auth] manual check response:', data);

        if (data.ok && data.chat_id) {
          console.log('[auth] manual check - auth successful');
          localStorage.removeItem('pendingAuthCode');
          showAuthSuccess(data.chat_id);
          return true;
        } else {
          console.log('[auth] manual check - code not verified yet');
          return false;
        }
      } catch (error) {
        console.error('[auth] error during manual check:', error);
        return false;
      }
    } else {
      console.log('[auth] manual check - no pending code');
      return false;
    }
  }

  // Initialize store interface for main.html
  function initStoreInterface() {
    console.log('[store] initializing store interface...');

    // Check if elements exist with more detailed logging
    const showMoreBtn = document.getElementById('showMoreBtn');
    const additionalGrid = document.getElementById('additionalPlansGrid');

    console.log('[store] detailed elements check:');
    console.log('- showMoreBtn element:', showMoreBtn);
    console.log('- additionalPlansGrid element:', additionalGrid);
    console.log('- showMoreBtn found:', !!showMoreBtn);
    console.log('- additionalPlansGrid found:', !!additionalGrid);

    if (showMoreBtn && additionalGrid) {
      console.log('[store] both elements found, interface ready');
    } else {
      console.error('[store] missing elements!');
      if (!showMoreBtn) console.error('[store] showMoreBtn not found');
      if (!additionalGrid) console.error('[store] additionalPlansGrid not found');
    }

    loadUserData();
    renderPlans();
    // Also initialize store functionality (bind buttons)
    try { initStore(); } catch (e) { console.error('[store] failed to initStore()', e); }

    console.log('[store] store interface initialized');
  }

  // Store functionality
  function initStore() {
  const authBtn = document.getElementById('authBtn');
  const buySelfBtn = document.getElementById('buySelfBtn');
  const giftFriendBtn = document.getElementById('giftFriendBtn');
  const selectedPlanActions = document.getElementById('selectedPlanActions');
  const selectedPlanInfo = document.getElementById('selectedPlanInfo');
  const giftSection = document.getElementById('giftSection');
  const giftUsername = document.getElementById('giftUsername');
  const cancelGiftBtn = document.getElementById('cancelGiftBtn');
  const sendGiftBtn = document.getElementById('sendGiftBtn');
  // Ensure we reference the show-more button and additional grid here as well
  const showMoreBtn = document.getElementById('showMoreBtn');
  const additionalGrid = document.getElementById('additionalPlansGrid');
  console.log('[store] initStore elements:', { showMoreBtn: !!showMoreBtn, additionalGrid: !!additionalGrid, selectedPlanActions: !!selectedPlanActions });

    // Auth button
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        console.log('[store] auth button clicked');
        // Telegram WebApp auth logic would go here
        loadUserData();
      });
    }

    // Gift to friend: open gift section for currently selected plan
    if (giftFriendBtn) {
      giftFriendBtn.addEventListener('click', () => {
        console.log('[store] giftFriendBtn clicked');
        const selectedPlan = document.querySelector('.plan-card.selected');
        if (!selectedPlan) {
          alert('Выберите тариф для подарка');
          return;
        }
        // hide per-plan actions while gifting
        if (selectedPlanActions) selectedPlanActions.classList.add('hidden');
        if (giftSection) giftSection.classList.remove('hidden');
        if (giftUsername) giftUsername.focus();

        // populate selected plan info in gift preview
        const giftSelectedPlan = document.getElementById('giftSelectedPlan');
        if (giftSelectedPlan) {
          const title = selectedPlan.querySelector('.plan-title')?.textContent || (selectedPlan.dataset.days + ' дней');
          const price = selectedPlan.querySelector('.plan-price')?.textContent || '';
          giftSelectedPlan.textContent = `${title} — ${price}`;
        }
      });
    }

    // Cancel gift: hide gift section and restore per-plan actions
    if (cancelGiftBtn) {
      cancelGiftBtn.addEventListener('click', () => {
        console.log('[store] cancel gift');
        giftSection.classList.add('hidden');
        if (giftUsername) giftUsername.value = '';
        if (selectedPlanActions) selectedPlanActions.classList.remove('hidden');
      });
    }

    // Gift username input handler (show preview for current selected plan)
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

    // Send gift for currently selected plan
    if (sendGiftBtn) {
      sendGiftBtn.addEventListener('click', async () => {
        const mainSelectedPlan = document.querySelector('.plan-card.selected');
        if (!mainSelectedPlan) {
          alert('Выберите тариф для подарка');
          return;
        }

        const days = parseInt(mainSelectedPlan.dataset.days);
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

    // Show/hide additional plans
    if (showMoreBtn) {
      console.log('[store] showMoreBtn found, adding click handler');
      showMoreBtn.addEventListener('click', () => {
        console.log('[store] show more button clicked');
        const additionalGrid = document.getElementById('additionalPlansGrid');

        if (!additionalGrid) {
          console.error('[store] additionalPlansGrid not found!');
          return;
        }

        console.log('[store] additionalGrid found, children count:', additionalGrid.children.length);
        const isHidden = additionalGrid.classList.contains('hidden');
        console.log('[store] isHidden:', isHidden);

        if (isHidden) {
          // Show additional plans
          showMoreBtn.textContent = 'Скрыть тарифы';

          // Render additional plans if not already rendered
          if (additionalGrid.children.length === 0) {
            console.log('[store] rendering additional plans...');
            renderAdditionalPlans();
          }

          // Show the grid
          additionalGrid.classList.remove('hidden');

          // Trigger animation after a small delay
          setTimeout(() => {
            additionalGrid.classList.add('show');
            console.log('[store] additional plans shown');
          }, 50);
        } else {
          // Hide additional plans
          showMoreBtn.textContent = 'Показать больше тарифов';
          additionalGrid.classList.remove('show');

          setTimeout(() => {
            additionalGrid.classList.add('hidden');
            console.log('[store] additional plans hidden');
          }, 300);
        }

        console.log('[store] toggled additional plans visibility');
      });
    }

  // Initialize store functionality
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

        const actions = document.getElementById('selectedPlanActions');
        const info = document.getElementById('selectedPlanInfo');
        if (actions) actions.classList.remove('hidden');
        if (info) info.textContent = `${plan.label} — ${plan.price} руб.`;
      });

      plansGrid.appendChild(planCard);
    });
  }

  async function showGiftPreview(username) {
    console.log('[store] showing gift preview for:', username);

    // Show preview section
    const giftPreview = document.getElementById('giftPreview');
    const giftToName = document.getElementById('giftToNameSmall');
    const giftSelectedPlan = document.getElementById('giftSelectedPlan');

    if (giftPreview) giftPreview.classList.remove('hidden');
    if (giftToName) giftToName.textContent = username;

    // Show which plan will be gifted (use currently selected plan)
    const mainSelectedPlan = document.querySelector('.plan-card.selected');
    if (giftSelectedPlan) {
      if (mainSelectedPlan) {
        const title = mainSelectedPlan.querySelector('.plan-title')?.textContent || (mainSelectedPlan.dataset.days + ' дней');
        const price = mainSelectedPlan.querySelector('.plan-price')?.textContent || '';
        giftSelectedPlan.textContent = `${title} — ${price}`;
      } else {
        giftSelectedPlan.textContent = 'Тариф не выбран';
      }
    }

    // Buy selected plan for yourself
    if (buySelfBtn) {
      buySelfBtn.addEventListener('click', async () => {
        const selectedPlan = document.querySelector('.plan-card.selected');
        if (!selectedPlan) {
          alert('Выберите тариф для покупки');
          return;
        }
        const days = parseInt(selectedPlan.dataset.days);
        const chatId = pageChatId;
        if (!chatId) {
          alert('Ошибка: необходимо авторизоваться');
          return;
        }
        try {
          const response = await fetch('/purchase', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: chatId, days })
          });
          const data = await response.json();
          if (data.ok) {
            alert('Покупка успешно завершена!');
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

  // Render additional plans
  function renderAdditionalPlans() {
    console.log('[store] starting to render additional plans...');

    const additionalGrid = document.getElementById('additionalPlansGrid');
    if (!additionalGrid) {
      console.error('[store] additionalPlansGrid not found!');
      return;
    }

    console.log('[store] clearing additional plans grid...');
    additionalGrid.innerHTML = '';

    console.log('[store] rendering', ADDITIONAL_PLANS.length, 'additional plans...');
    ADDITIONAL_PLANS.forEach((plan, index) => {
      console.log(`[store] rendering plan ${index + 1}:`, plan);

      const planCard = document.createElement('div');
      planCard.className = 'plan-card';
      planCard.dataset.days = plan.days;

      planCard.innerHTML = `
        <div class="plan-title">${plan.label}</div>
        <div class="plan-price">${plan.price} руб.</div>
        <div class="plan-description">${plan.description}</div>
      `;

      planCard.addEventListener('click', () => {
        console.log('[store] additional plan clicked:', plan.label);
        document.querySelectorAll('.plan-card').forEach(card => card.classList.remove('selected'));
        planCard.classList.add('selected');

        const actions = document.getElementById('selectedPlanActions');
        const info = document.getElementById('selectedPlanInfo');
        if (actions) actions.classList.remove('hidden');
        if (info) info.textContent = `${plan.label} — ${plan.price} руб.`;
      });

      additionalGrid.appendChild(planCard);
    });

    console.log('[store] additional plans rendered successfully');
  }

  // Initialize when DOM is ready
  function init() {
    console.log('[app] DOM ready, initializing...');
    initInterface();
    // Sidebar visual: переключатель активной кнопки (чисто визуально)
    try {
      const sidebarBtns = Array.from(document.querySelectorAll('.sidebar-btn'));
      sidebarBtns.forEach(btn => btn.addEventListener('click', () => {
        sidebarBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }));
    } catch (e) { /* no-op if sidebar not present */ }
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
  console.log('- selectedPlanActions:', !!document.getElementById('selectedPlanActions'));
  console.log('- buySelfBtn:', !!document.getElementById('buySelfBtn'));
  console.log('- giftFriendBtn:', !!document.getElementById('giftFriendBtn'));
  console.log('- showMoreBtn:', !!document.getElementById('showMoreBtn'));
  console.log('- additionalPlansGrid:', !!document.getElementById('additionalPlansGrid'));
  };

  console.log('[app] script loaded');
})();
