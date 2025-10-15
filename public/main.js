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

        const chatId = extractChatIdFromVerifyResponse(data);
        if (data && data.ok && chatId) {
          console.log('[auth] code verified, redirecting with chat_id:', chatId);
          localStorage.removeItem('pendingAuthCode');
          window.location.href = '/main.html?chat_id=' + chatId;
          return;
        }

        if (data && data.ok && !chatId) {
          // Try to obtain user info via /me in case server didn't include chat_id in verify response
          try {
            const meResp = await fetch('/me');
            const meData = await meResp.json();
            if (meData && meData.ok && meData.user && (meData.user.chat_id || meData.user.id)) {
              const foundId = meData.user.chat_id || meData.user.id;
              console.log('[auth] /me returned user after verify, redirecting with chat_id:', foundId);
              localStorage.removeItem('pendingAuthCode');
              window.location.href = '/main.html?chat_id=' + foundId;
              return;
            }
          } catch (meErr) {
            console.warn('[auth] /me lookup failed after verify', meErr);
          }

          // If we reach here the code was accepted but the server didn't provide chat id yet.
          // Keep the pending code and start polling so we pick up the chat_id once it's assigned by the bot.
          console.log('[auth] code accepted but server did not return chat_id — will continue polling');
          try { showAuthModal(pendingCode); } catch (e) { /* ignore */ }
          try { startAuthStatusCheck(); } catch (e) { console.warn('[auth] startAuthStatusCheck not available', e); }
          showAuthToast('Код принят. Ждём подтверждения бота...');
          // Do not remove pendingAuthCode here — allow polling to continue
          return;
        }

        // Not ok
        console.log('[auth] code verification failed:', data && data.error);
        localStorage.removeItem('pendingAuthCode');
        alert('Код авторизации неверный или уже использован. Пожалуйста, сгенерируйте новый код.');
        return;
      } catch (error) {
        console.error('[auth] error verifying code:', error);
        localStorage.removeItem('pendingAuthCode');
        return;
      }
    }
    // Delegated fallback: if auth button doesn't have a direct binding, handle clicks here
    document.addEventListener('click', (e) => {
      try {
        const btn = e.target && e.target.closest && e.target.closest('#authBtn');
        if (btn && !btn.dataset.bound && !btn.dataset.handled) {
          e.preventDefault();
          handleAuthBtnClick(e);
          btn.dataset.bound = 'true';
        }
      } catch (err) { /* ignore */ }
    });

    // Additional aggressive fallback for environments where a transparent overlay blocks clicks
    // (e.g. some webviews). On the auth page only, capture pointerdown in the capture phase,
    // use elementFromPoint and the auth button's bounding rect to detect intended clicks and
    // invoke the auth handler even if another element sits above the button.
    if (window.location.pathname.includes('webapp.html')) {
      let lastAuthTrigger = 0;
      document.addEventListener('pointerdown', (e) => {
        try {
          const authBtn = document.getElementById('authBtn');
          if (!authBtn) return;
          const x = e.clientX, y = e.clientY;
          const topEl = document.elementFromPoint(x, y);
          // If pointer is directly over the button element (or its children)
          if (topEl && authBtn.contains(topEl)) {
            if (!authBtn.dataset.handled) {
              handleAuthBtnClick(e);
            }
            return;
          }
          // If an overlay is above the button, but visually the click is within button bounds — trigger handler
          const rect = authBtn.getBoundingClientRect();
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            const now = Date.now();
            if (now - lastAuthTrigger > 300) { // simple debounce
              lastAuthTrigger = now;
              if (!authBtn.dataset.handled) handleAuthBtnClick(e);
              e.preventDefault();
              e.stopPropagation && e.stopPropagation();
            }
          }
        } catch (err) { /* ignore errors in fallback */ }
      }, true);
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
    // avatar handling: показываем реальный аватар если он есть, иначе показываем плейсхолдер(ы)
    const placeholders = Array.from(document.querySelectorAll('.avatar-placeholder'));
    if (storeAvatar) {
      if (user && user.avatar) {
        storeAvatar.src = user.avatar;
        storeAvatar.classList.remove('hidden');
        placeholders.forEach(p => p.classList.add('hidden'));
      } else {
        storeAvatar.classList.add('hidden');
        placeholders.forEach(p => p.classList.remove('hidden'));
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
      authBtn.addEventListener('click', handleAuthBtnClick);
      // pointerdown fallback (mobile/touch) — idempotent inside handler
      authBtn.addEventListener('pointerdown', (ev) => { if (!authBtn.dataset.handled) handleAuthBtnClick(ev); });
      // debug hover events to diagnose blocking overlays
      authBtn.addEventListener('pointerenter', () => console.log('[auth] pointerenter authBtn'));
      authBtn.addEventListener('pointerleave', () => console.log('[auth] pointerleave authBtn'));
      // mark as bound so delegated fallback won't double-run
      authBtn.dataset.bound = 'true';
    }
    // Bind fallback button (visible alternative if primary button is blocked)
    const authFallback = document.getElementById('authFallbackBtn');
    if (authFallback) {
      authFallback.addEventListener('click', (ev) => { ev.stopPropagation && ev.stopPropagation(); handleAuthBtnClick(ev); });
      authFallback.style.zIndex = '2050';
      authFallback.style.position = 'relative';
      authFallback.dataset.bound = 'true';
    }

  // expose for inline or external fallbacks if needed
  try { window.handleAuthBtnClick = handleAuthBtnClick; window.startAuthStatusCheck = startAuthStatusCheck; } catch(e){}

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
    // ensure success actions are hidden by default until explicitly set
    try {
      const successActionsEl = document.getElementById('authSuccessActions');
      if (successActionsEl) successActionsEl.style.display = 'none';
    } catch (e) { /* ignore */ }
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

  // Reusable handler for auth button click (extracted so we can bind robustly)
  async function handleAuthBtnClick(e) {
    try {
      const authBtnEl = document.getElementById('authBtn');
      // idempotent guard: don't run twice for same element
      if (authBtnEl && authBtnEl.dataset.handled === '1') {
        console.log('[auth] handler invoked but already handled — skipping');
        return;
      }
      if (authBtnEl) authBtnEl.dataset.handled = '1';
      console.log('[auth] auth button clicked (handler)');
      const authCodeSection = document.getElementById('authCodeSection');
      const authCodeElement = document.getElementById('authCode');

      // Generate code and show
      const authCode = generateAuthCode();
      if (authCodeElement) authCodeElement.textContent = authCode;
      if (authCodeSection) authCodeSection.classList.remove('hidden');
      if (authBtnEl) {
        authBtnEl.textContent = 'Код сгенерирован';
        authBtnEl.disabled = true;
        authBtnEl.dataset.bound = 'true';
      }
      // persist and register on server
      localStorage.setItem('pendingAuthCode', authCode);
  // show quick visual feedback even if console is closed
  showAuthToast('Код сгенерирован');
  // show a large modal with the code so user can copy/send it manually
  showAuthModal(authCode);
      registerAuthCode(authCode).then((data) => {
        if (data && data.ok) console.log('[auth] code registered on server successfully', data);
        else console.warn('[auth] registration returned non-ok', data);
      }).catch(error => {
        console.error('[auth] failed to register code on server:', error);
      }).finally(() => {
        try { startAuthStatusCheck(); } catch (e) { console.error('[auth] startAuthStatusCheck error', e); }
      });
    } catch (err) {
      console.error('[auth] handleAuthBtnClick error', err);
    }
  }

  // small visual toast for auth feedback (helps when console is not open)
  function showAuthToast(text) {
    try {
      let t = document.getElementById('authToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'authToast';
        t.style.position = 'fixed';
        t.style.left = '50%';
        t.style.top = '18px';
        t.style.transform = 'translateX(-50%)';
        t.style.background = 'rgba(20,20,30,0.98)';
        t.style.color = 'white';
        t.style.padding = '8px 14px';
        t.style.borderRadius = '8px';
        t.style.zIndex = 2200;
        t.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
        document.body.appendChild(t);
      }
      t.textContent = text;
      t.style.opacity = '1';
      setTimeout(() => { if (t) t.style.opacity = '0'; }, 1800);
    } catch (e) { /* ignore */ }
  }

  // Helper: try to extract chat id from different possible server response shapes
  function extractChatIdFromVerifyResponse(data) {
    if (!data) return null;
    if (data.chat_id) return data.chat_id;
    if (data.chatId) return data.chatId;
    if (data.chatid) return data.chatid;
    if (data.user && (data.user.chat_id || data.user.id)) return data.user.chat_id || data.user.id;
    return null;
  }

  // Helper: remove any auth-related modal UI
  function removeAuthModals() {
    try {
      const m = document.getElementById('authCodeModal'); if (m) m.remove();
      const fm = document.getElementById('fallbackAuthModal'); if (fm) fm.remove();
    } catch (e) { /* ignore */ }
  }

  // show modal with large auth code (non-closable while authorization is pending) and auto-copy '/auth CODE'
  function showAuthModal(code) {
    try {
      // ensure any existing modal is updated
      let m = document.getElementById('authCodeModal');
      if (!m) {
        m = document.createElement('div');
        m.id = 'authCodeModal';
        m.className = 'auth-modal';
        m.innerHTML = `<div class="auth-modal-inner"><h3>Код авторизации</h3><div id="authCodeLarge" class="auth-code-large"></div><div id="authCopiedNote" style="text-align:center;margin-top:8px;color:var(--text-secondary);">Код будет автоматически скопирован в буфер обмена.</div></div>`;
        document.body.appendChild(m);

        // add emergency clear button (hidden initially) so user can recover from stuck modal
        try {
          const inner = m.querySelector('.auth-modal-inner') || m;
          const clearBtn = document.createElement('button');
          clearBtn.id = 'forceClearAuthBtn';
          clearBtn.className = 'btn-secondary';
          clearBtn.textContent = 'Сбросить';
          clearBtn.style.display = 'none';
          clearBtn.style.marginTop = '12px';
          clearBtn.addEventListener('click', () => {
            try { localStorage.removeItem('pendingAuthCode'); } catch (e) {}
            try { removeAuthModals(); } catch (e) {}
            try {
              const authBtn = document.getElementById('authBtn');
              if (authBtn) { authBtn.textContent = 'Войти через Telegram'; authBtn.disabled = false; authBtn.dataset.handled = '0'; }
            } catch (e) {}
          });
          inner.appendChild(clearBtn);
          // show this button after a small timeout if auth hasn't completed
          setTimeout(() => { try { if (!window.__authCompleted) { clearBtn.style.display = 'inline-block'; } } catch (e) {} }, 12000);
        } catch (e) { /* ignore emergency button errors */ }
      }
      const display = document.getElementById('authCodeLarge');
      if (display) display.textContent = code;
      // attempt to copy full command to clipboard
      try {
        navigator.clipboard.writeText('/auth ' + code).then(() => {
          showAuthToast('/auth ' + code + ' скопировано');
          const note = document.getElementById('authCopiedNote'); if (note) note.textContent = 'Команда скопирована в буфер обмена.';
        }).catch((err) => {
          console.warn('[auth] auto-copy failed', err);
          const note = document.getElementById('authCopiedNote'); if (note) note.textContent = 'Не удалось автоматически скопировать. Скопируйте вручную: /auth ' + code;
        });
      } catch (e) { console.warn('[auth] clipboard error', e); }
      // mark locked so UI cannot remove it while waiting
      m.style.display = 'flex';
      m.dataset.locked = 'true';
    } catch (e) { console.error('[auth] showAuthModal error', e); }
  }

  // Register auth code on server and return parsed response
  async function registerAuthCode(code) {
    console.log('[auth] registering code on server:', code);
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code: code})
      });
      const data = await response.json();
      console.log('[auth] register response:', data);
      return data;
    } catch (error) {
      console.error('[auth] error registering code:', error);
      return { ok: false, error: (error && error.message) || 'network_error' };
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

          const chatId = extractChatIdFromVerifyResponse(data);
          if (data && data.ok && chatId) {
            console.log('[auth] auth successful, stopping checks and redirecting (chat_id:', chatId, ')');
            clearInterval(checkInterval);
            localStorage.removeItem('pendingAuthCode');
            removeAuthModals();
            showAuthSuccess(chatId);
            window.location.href = '/main.html?chat_id=' + chatId;
            return;
          }

          // If server reports OK but didn't include chat_id, try /me lookup as a fallback
          if (data && data.ok && !chatId) {
            console.log('[auth] server reported ok but did not include chat_id — attempting /me lookup');
            try {
              const meResp = await fetch('/me');
              const meData = await meResp.json();
              if (meData && meData.ok && meData.user && (meData.user.chat_id || meData.user.id)) {
                const foundId = meData.user.chat_id || meData.user.id;
                console.log('[auth] /me returned user with chat id:', foundId);
                clearInterval(checkInterval);
                localStorage.removeItem('pendingAuthCode');
                removeAuthModals();
                showAuthSuccess(foundId);
                window.location.href = '/main.html?chat_id=' + foundId;
                return;
              }
            } catch (meErr) {
              console.warn('[auth] /me lookup failed', meErr);
            }
            console.log('[auth] code verified but no chat_id yet, continuing checks...');
            // continue polling — perhaps chat_id will be available next tick
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
    // mark completed and clear pending code as early as possible to avoid race with fallbacks
    try { window.__authCompleted = true; } catch (e) {}
    try { localStorage.removeItem('pendingAuthCode'); } catch (e) {}
    // Remove any auth modals that were blocking interaction
    removeAuthModals();

    // Extra safety: remove any late-created auth modals for next few seconds (race protection)
    try {
      const selectors = ['#authCodeModal', '#fallbackAuthModal', '.auth-modal'];
      selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
      const observer = new MutationObserver(() => {
        try { selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => { console.log('[auth] observer removing late modal', sel); el.remove(); })); } catch (e) { /* ignore */ }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { try { observer.disconnect(); } catch (e) {} }, 7000);
    } catch (e) { /* best-effort cleanup */ }

    const authSuccessActions = document.getElementById('authSuccessActions');
    const authBtn = document.getElementById('authBtn');
    const authCodeSection = document.getElementById('authCodeSection');
    const goToStoreBtn = document.getElementById('goToStoreBtn');

    if (authSuccessActions) {
      // inject success message only when actually showing success
      let msg = authSuccessActions.querySelector('.success-message');
      if (!msg) {
        msg = document.createElement('p');
        msg.className = 'success-message';
        msg.textContent = 'Авторизация выполнена успешно!';
        authSuccessActions.appendChild(msg);
      }
      authSuccessActions.style.display = 'block';
    }

    if (authBtn) {
      authBtn.textContent = 'Авторизация успешна';
      authBtn.style.background = 'var(--success)';
    }

    if (authCodeSection) {
      authCodeSection.classList.add('hidden');
    }

    // Add click handler for go to store button if we have a chatId
    if (goToStoreBtn) {
      if (chatId) {
        goToStoreBtn.addEventListener('click', () => {
          console.log('[auth] redirecting to store...');
          window.location.href = '/main.html?chat_id=' + chatId;
        });
      } else {
        // If we don't have a chat id yet, disable the button and instruct user to refresh status
        goToStoreBtn.disabled = true;
        goToStoreBtn.textContent = 'Ожидание подтверждения...';
      }
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

        const chatId = extractChatIdFromVerifyResponse(data);
        if (data && data.ok && chatId) {
          console.log('[auth] manual check - auth successful (chat_id:', chatId, ')');
          localStorage.removeItem('pendingAuthCode');
          removeAuthModals();
          showAuthSuccess(chatId);
          return true;
        }
        if (data && data.ok && !chatId) {
          // try /me lookup if verify didn't include chat_id
          try {
            const meResp = await fetch('/me');
            const meData = await meResp.json();
            if (meData && meData.ok && meData.user && (meData.user.chat_id || meData.user.id)) {
              const foundId = meData.user.chat_id || meData.user.id;
              localStorage.removeItem('pendingAuthCode');
              removeAuthModals();
              showAuthSuccess(foundId);
              return true;
            }
          } catch (meErr) {
            console.warn('[auth] manual /me lookup failed', meErr);
          }
          console.log('[auth] manual check - code verified but no chat_id yet');
          return false;
        }
        console.log('[auth] manual check - code not verified yet');
        return false;
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
  // collapse per-plan actions while gifting
  if (giftSection) giftSection.classList.remove('hidden');
  if (selectedPlanActions) selectedPlanActions.classList.remove('open');

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
        if (selectedPlanActions) selectedPlanActions.classList.add('open');
      });

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
  // Attach floating buy button handler (navigate to order/checkout page)
  const floatingBuyBtn = document.getElementById('floatingBuyBtn');
  if (floatingBuyBtn) {
    floatingBuyBtn.addEventListener('click', (ev) => {
      ev.stopPropagation && ev.stopPropagation();
      const mainSelectedPlan = document.querySelector('.plan-card.selected');
      if (!mainSelectedPlan) {
        alert('Выберите тариф для покупки');
        return;
      }
      const days = parseInt(mainSelectedPlan.dataset.days);
      const url = '/order.html?days=' + encodeURIComponent(days) + (pageChatId ? '&chat_id=' + encodeURIComponent(pageChatId) : '');
      window.location.href = url;
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

      // Toggle selection: clicking a selected card will deselect it;
      // clicking another card will select that one and deselect others.
      planCard.addEventListener('click', (e) => {
        // prevent accidental document-level handlers from clearing selection immediately
        e.stopPropagation && e.stopPropagation();
        const alreadySelected = planCard.classList.contains('selected');
        // remove selection from all cards
        document.querySelectorAll('.plan-card').forEach(card => card.classList.remove('selected'));
        if (!alreadySelected) {
          planCard.classList.add('selected');
        }

        const actions = document.getElementById('selectedPlanActions');
        const info = document.getElementById('selectedPlanInfo');
          if (!alreadySelected) {
            if (actions) actions.classList.add('open');
            if (info) info.textContent = `${plan.label} — ${plan.price} руб.`;
            showFloatingBuyButton();
          } else {
            if (actions) actions.classList.remove('open');
            if (info) info.textContent = '';
            hideFloatingBuyButton();
          }
      });

      plansGrid.appendChild(planCard);
    });
    // Ensure floating button visibility matches current selection state
    updateFloatingBuyVisibility();
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


      planCard.addEventListener('click', (e) => {
        e.stopPropagation && e.stopPropagation();
        const alreadySelected = planCard.classList.contains('selected');
        document.querySelectorAll('.plan-card').forEach(card => card.classList.remove('selected'));
        if (!alreadySelected) planCard.classList.add('selected');

        const actions = document.getElementById('selectedPlanActions');
        const info = document.getElementById('selectedPlanInfo');
        if (!alreadySelected) {
          if (actions) actions.classList.add('open');
          if (info) info.textContent = `${plan.label} — ${plan.price} руб.`;
          showFloatingBuyButton();
        } else {
          if (actions) actions.classList.remove('open');
          if (info) info.textContent = '';
          hideFloatingBuyButton();
        }
      });

      additionalGrid.appendChild(planCard);
    });

    console.log('[store] additional plans rendered successfully');
  }

  /* Floating buy button helpers and global click-to-deselect handler */
  function showFloatingBuyButton() {
    const el = document.getElementById('floatingBuyBtn');
    if (!el) return;
    el.classList.add('visible');
    el.setAttribute('aria-hidden', 'false');
    const backdrop = document.getElementById('selectionBackdrop');
    if (backdrop) backdrop.classList.remove('hidden');
  }

  function hideFloatingBuyButton() {
    const el = document.getElementById('floatingBuyBtn');
    if (!el) return;
    el.classList.remove('visible');
    el.setAttribute('aria-hidden', 'true');
    const backdrop = document.getElementById('selectionBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
  }

  function updateFloatingBuyVisibility() {
    const selected = document.querySelector('.plan-card.selected') || document.querySelector('.plan.selected');
    if (selected) showFloatingBuyButton(); else hideFloatingBuyButton();
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
    // Sidebar toggle for small screens
    try {
      const appShell = document.querySelector('.app-shell');
      const sidebarToggle = document.querySelector('.sidebar-toggle');
      const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
      if (sidebarToggle && appShell) {
        sidebarToggle.addEventListener('click', () => {
          const opened = appShell.classList.toggle('sidebar-open');
          sidebarToggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
          document.body.style.overflow = opened ? 'hidden' : '';
        });
      }
      if (sidebarBackdrop && appShell) {
        sidebarBackdrop.addEventListener('click', () => {
          appShell.classList.remove('sidebar-open');
          sidebarToggle && sidebarToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          appShell && appShell.classList.remove('sidebar-open');
          sidebarToggle && sidebarToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    } catch (e) { /* ignore mobile sidebar if DOM differs */ }
    // Use a dedicated backdrop for deselecting plans to avoid global click-handler reflows
    const selectionBackdrop = document.getElementById('selectionBackdrop');
    if (selectionBackdrop) {
      selectionBackdrop.addEventListener('click', () => {
        const selected = document.querySelector('.plan-card.selected');
        if (selected) {
          document.querySelectorAll('.plan-card').forEach(card => card.classList.remove('selected'));
          const actions = document.getElementById('selectedPlanActions');
          if (actions) actions.classList.remove('open');
          const info = document.getElementById('selectedPlanInfo');
          if (info) info.textContent = '';
          hideFloatingBuyButton();
        }
      });
    }
    console.log('[app] initialization complete');
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Create a force auth button and diagnostic helpers on the auth page
  if (window.location.pathname.includes('webapp.html')) {
    try {
      // create force-auth button (very high z-index) to bypass overlays
      if (!document.getElementById('forceAuthBtn')) {
        const fa = document.createElement('button');
        fa.id = 'forceAuthBtn';
        fa.className = 'force-auth';
        fa.textContent = 'Войти (резерв)';
        fa.style.position = 'fixed';
        fa.style.left = '50%';
        fa.style.bottom = '18px';
        fa.style.transform = 'translateX(-50%)';
        fa.style.zIndex = '2147483647';
        fa.style.padding = '12px 18px';
        fa.style.borderRadius = '12px';
        fa.style.background = 'linear-gradient(90deg,var(--accent),var(--accent-strong))';
        fa.style.color = '#fff';
        fa.style.border = 'none';
        fa.style.boxShadow = '0 8px 30px rgba(0,0,0,0.45)';
        fa.addEventListener('click', (ev) => {
          ev.stopPropagation && ev.stopPropagation();
          ev.preventDefault && ev.preventDefault();
          console.log('[auth] forceAuthBtn clicked');
          handleAuthBtnClick(ev);
          // also run diagnostics
          logAuthClickDiagnostics(ev);
        });
        document.body.appendChild(fa);
      }
    } catch (e) { console.error('[auth] failed to create forceAuthBtn', e); }

    // diagnostics: log what element is on top of auth button
    function logAuthClickDiagnostics(e) {
      try {
        const authBtn = document.getElementById('authBtn');
        if (!authBtn) return;
        const rect = authBtn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const topEl = document.elementFromPoint(cx, cy);
        console.log('[auth] diagnostics: elementFromPoint at auth center ->', topEl);
        showAuthToast(topEl ? `${topEl.tagName}${topEl.id ? '#'+topEl.id : ''}${topEl.className ? ' .' + topEl.className : ''}` : 'none');
      } catch (err) { /* ignore */ }
    }
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
  console.log('- floatingBuyBtn:', !!document.getElementById('floatingBuyBtn'));
  console.log('- showMoreBtn:', !!document.getElementById('showMoreBtn'));
  console.log('- additionalPlansGrid:', !!document.getElementById('additionalPlansGrid'));
  };

  console.log('[app] script loaded');
})();
