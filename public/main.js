/* Modern Gaming Interface JavaScript */
(function() {
  console.log('[app] initializing modern interface...');

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

  // Tab switching functionality
  function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');

        // Remove active class from all nav items and tab contents
        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked nav item and corresponding tab content
        item.classList.add('active');
        const targetContent = document.querySelector(`.tab-content[data-tab="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');

          // Load user data when switching to store tab
          if (targetTab === 'store') {
            loadUserData();
            renderPlans();
          }
        }
      });
    });
  }

  // Sub-tab switching functionality
  function initSubTabs() {
    const subTabs = document.querySelectorAll('.sub-tab');
    const subContents = document.querySelectorAll('.sub-content');

    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const parentSection = tab.closest('.content-section');
        const targetSubTab = tab.getAttribute('data-subtab');

        // Remove active class from sibling sub-tabs and sub-contents
        const siblingTabs = parentSection.querySelectorAll('.sub-tab');
        const siblingContents = parentSection.querySelectorAll('.sub-content');

        siblingTabs.forEach(sibling => sibling.classList.remove('active'));
        siblingContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked sub-tab and corresponding content
        tab.classList.add('active');
        const targetContent = parentSection.querySelector(`.sub-content[data-subtab="${targetSubTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // Slider functionality
  function initSliders() {
    const sliders = document.querySelectorAll('.slider');

    sliders.forEach(slider => {
      const valueDisplay = slider.parentNode.querySelector('.slider-value');
      if (valueDisplay) {
        valueDisplay.textContent = slider.value;

        slider.addEventListener('input', () => {
          valueDisplay.textContent = slider.value;
        });
      }

      // Add hover effects
      slider.addEventListener('mouseenter', () => {
        slider.style.background = 'rgba(79, 156, 249, 0.2)';
      });

      slider.addEventListener('mouseleave', () => {
        slider.style.background = 'var(--bg-tertiary)';
      });
    });
  }

  // Dropdown functionality
  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
      dropdown.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`[dropdown] ${dropdown.value} selected`);
      });

      dropdown.addEventListener('change', () => {
        console.log(`[dropdown] changed to: ${dropdown.value}`);
      });
    });
  }

  // Button click handlers
  function initButtons() {
    // Config action buttons
    const saveBtn = document.querySelector('.config-actions .btn-primary');
    const loadBtn = document.querySelector('.config-actions .btn-secondary');
    const openFolderBtn = document.querySelector('.config-actions .btn-secondary:last-child');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('[config] save clicked');
        // Add save logic here
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        console.log('[config] load clicked');
        // Add load logic here
      });
    }

    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', () => {
        console.log('[config] open folder clicked');
        // Add folder opening logic here
      });
    }
  }

  // Color picker functionality
  function initColorPickers() {
    const colorPickers = document.querySelectorAll('.color-picker');

    colorPickers.forEach(picker => {
      picker.addEventListener('change', () => {
        console.log(`[color] changed to: ${picker.value}`);
        // Apply color changes here
      });
    });
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

  // Initialize all functionality when DOM is ready
  function init() {
    console.log('[app] DOM ready, initializing components...');

    initTabs();
    initSubTabs();
    initSliders();
    initDropdowns();
    initButtons();
    initColorPickers();
    initStore();

    console.log('[app] all components initialized');
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debug function
  window.debugApp = function() {
    console.log('[app] debug info:');
    console.log('- nav items:', document.querySelectorAll('.nav-item').length);
    console.log('- tab contents:', document.querySelectorAll('.tab-content').length);
    console.log('- sliders:', document.querySelectorAll('.slider').length);
    console.log('- dropdowns:', document.querySelectorAll('.dropdown').length);
    console.log('- store elements:');
    console.log('  - plans grid:', !!document.getElementById('plansGrid'));
    console.log('  - gift section:', !!document.getElementById('giftSection'));
    console.log('  - user chat_id:', pageChatId);
  };

  console.log('[app] script loaded');
})();
