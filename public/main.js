(async function(){
  // fetch me: prefer chat_id from URL, fallback to Telegram WebApp initDataUnsafe
  const params = new URLSearchParams(window.location.search);
  let pageChatId = params.get('chat_id') || null;
  async function loadMe(){
    const chatId = pageChatId || ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : null);
    if (!chatId) {
      document.getElementById('subInfo').textContent = 'Неавторизован — нажмите Войти в Web App';
      return;
    }
    try{
      const r = await fetch('/me?chat_id='+encodeURIComponent(chatId));
      const j = await r.json();
      if (j.ok){
        const u = j.user || {};
        document.getElementById('mainName').textContent = u.first_name || u.username || 'Пользователь';
        document.getElementById('mainUsername').textContent = u.username ? '@'+u.username : '';
        if (u.avatar) { document.getElementById('mainAvatar').src = u.avatar; document.getElementById('mainAvatar').classList.remove('hidden'); }
        const info = j.active ? (j.daysRemaining ? j.daysRemaining+' дней' : 'Навсегда') : 'Нет подписки';
        document.getElementById('subInfo').textContent = 'Подписка: '+info;
        // store for buy/gift actions
        pageChatId = chatId;
      }
    }catch(e){ console.error('loadMe error', e); }
  }
  loadMe();

  document.getElementById('buyMain').addEventListener('click', ()=>{ const q = pageChatId ? ('?chat_id='+encodeURIComponent(pageChatId)) : ''; location.href = '/webapp.html'+q; });
  // Simple direct approach - no complex initialization

  // Simple direct approach
  console.log('[gift] starting simple initialization...');

  // Wait a bit for DOM to be ready
  setTimeout(() => {
    const giftBtn = document.getElementById('giftMain');
    const giftArea = document.getElementById('giftArea');

    console.log('[gift] direct elements check:');
    console.log('giftBtn found:', !!giftBtn);
    console.log('giftArea found:', !!giftArea);

    if (giftBtn && giftArea) {
      console.log('[gift] adding simple click handler');
      giftBtn.onclick = (e) => {
        console.log('[gift] SIMPLE CLICK WORKS!');
        e.preventDefault();

        // Hide main screen
        const screen = document.querySelector('.screen');
        if (screen) {
          screen.style.display = 'none';
        }

        // Show gift area
        giftArea.style.display = 'block';
        console.log('[gift] gift area should be visible');
      };

      console.log('[gift] handler attached successfully');
    } else {
      console.error('[gift] elements not found!');
    }
  }, 100);

  // Also try immediate approach
  const giftBtn = document.getElementById('giftMain');
  const giftArea = document.getElementById('giftArea');

  if (giftBtn && giftArea) {
    console.log('[gift] immediate setup successful');
    giftBtn.onclick = (e) => {
      console.log('[gift] IMMEDIATE CLICK WORKS!');
      e.preventDefault();

      const screen = document.querySelector('.screen');
      if (screen) {
        screen.style.display = 'none';
      }

      giftArea.style.display = 'block';
    };
  }

  // Debug function
  window.debugGiftButton = function() {
    console.log('[gift] debug - elements:');
    console.log('giftBtn:', document.getElementById('giftMain'));
    console.log('giftArea:', document.getElementById('giftArea'));
  };

  const PLANS = [{days:7,label:'7 дней',price:179},{days:30,label:'30 дней',price:358},{days:0,label:'Навсегда',price:4491}];

  if (giftBtn) {
    console.log('[gift] attaching click handler to giftBtn');
    giftBtn.addEventListener('click', (e)=>{
      console.log('[gift] CLICK DETECTED on gift button!');
      e.preventDefault();

      // Simple version first - just show gift area
      if (giftArea) {
        console.log('[gift] showing gift area directly');
        giftArea.style.display = 'block';

        const screen = document.querySelector('.screen');
        if (screen) {
          screen.style.display = 'none';
        }

        console.log('[gift] gift area should be visible now');
      } else {
        console.error('[gift] giftArea not found!');
      }
    });
  } else {
    console.error('[gift] giftBtn not found!');
  }

  function showGiftArea() {
    console.log('[gift] showing gift area');
    // Show gift area
    giftArea.style.display = 'block';
    giftArea.style.opacity = '0';
    giftArea.style.transform = 'translateY(20px)';

    // Force reflow
    giftArea.offsetHeight;

    // Animate in
    giftArea.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    giftArea.style.opacity = '1';
    giftArea.style.transform = 'translateY(0)';

    console.log('[gift] gift area should be visible now');
  }

  if (giftNick) {
    giftNick.addEventListener('keydown', async (e)=>{ if (e.key==='Enter'){
      const to = giftNick.value.trim(); if (!to) return;
      // show steps: prefill From and To display (basic)
      const from = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user : { id: 'demo', first_name: 'Вы', username: '' };
      document.getElementById('giftFromName').textContent = from.first_name || from.username || 'Вы';
      document.getElementById('giftToName').textContent = to;
      console.log('[gift] recipient entered:', to);
      if (giftSteps) giftSteps.classList.remove('hidden');
      // populate plans as small tiles
      if (giftPlans) {
        giftPlans.innerHTML = '';
        PLANS.forEach(p=>{
          const el = document.createElement('div'); el.className='plan'; el.innerHTML = `<div class="plan-inner"><h3>${p.label}</h3><p>${p.price} руб.</p></div>`;
          el.addEventListener('click', ()=>{ document.querySelectorAll('#giftPlans .plan').forEach(x=>x.classList.remove('selected')); el.classList.add('selected'); el.dataset.days = p.days; });
          giftPlans.appendChild(el);
        });
      }
    }});
  }

  if (cancelGift) {
    console.log('[gift] attaching click handler to cancelGift');
    cancelGift.addEventListener('click', ()=>{
      console.log('[gift] CANCEL CLICK DETECTED!');

      if (giftArea) {
        console.log('[gift] hiding gift area');
        giftArea.style.display = 'none';
      }

      const screen = document.querySelector('.screen');
      if (screen) {
        console.log('[gift] showing main screen');
        screen.style.display = 'block';
      }

      console.log('[gift] cancel should be complete');
    });
  } else {
    console.error('[gift] cancelGift not found!');
  }

  function showMainScreen() {
    console.log('[gift] showing main screen');
    const screen = document.querySelector('.screen');
    if (screen) {
      screen.style.display = 'block';
      screen.style.opacity = '0';
      screen.style.transition = 'opacity 0.3s ease';

      // Force reflow
      screen.offsetHeight;

      screen.style.opacity = '1';
      console.log('[gift] main screen should be visible now');
    }
  }

  if (sendGift) {
    sendGift.addEventListener('click', async ()=>{
      const sel = document.querySelector('#giftPlans .plan.selected'); if (!sel){ alert('Выберите тариф'); return; }
      const days = parseInt(sel.dataset.days);
      const to = giftNick ? giftNick.value.trim() : '';
      const from = pageChatId || ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : null);
      try{ const res = await fetch('/gift',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ from_chat_id: from, to_username: to, days })}); const j = await res.json(); if (j.ok){ alert('Подарок отправлен'); window.location.reload(); } else alert('Ошибка: '+(j.error||'unknown')); }catch(e){ alert('Сетевая ошибка'); }
    });
  }
})();
