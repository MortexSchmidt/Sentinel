(async function(){
  // fetch me (try initDataUnsafe fallback)
  async function loadMe(){
    const chatId = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : null;
    if (!chatId) return;
    try{ const r = await fetch('/me?chat_id='+encodeURIComponent(chatId)); const j = await r.json(); if (j.ok){ const u = j.user; document.getElementById('mainName').textContent = u.first_name || u.username || 'Пользователь'; document.getElementById('mainUsername').textContent = u.username ? '@'+u.username : ''; if (u.avatar) { document.getElementById('mainAvatar').src = u.avatar; document.getElementById('mainAvatar').classList.remove('hidden'); } const info = j.active ? (j.daysRemaining ? j.daysRemaining+' дней' : 'Навсегда') : 'Нет подписки'; document.getElementById('subInfo').textContent = 'Подписка: '+info; } }catch(e){}
  }
  loadMe();

  document.getElementById('buyMain').addEventListener('click', ()=>{ location.href = '/webapp.html'; });
  // inline gift flow
  const giftBtn = document.getElementById('giftMain');
  const giftArea = document.getElementById('giftArea');
  const giftNick = document.getElementById('giftNick');
  const giftSteps = document.getElementById('giftSteps');
  const giftPlans = document.getElementById('giftPlans');
  const sendGift = document.getElementById('sendGift');
  const cancelGift = document.getElementById('cancelGift');

  const PLANS = [{days:7,label:'7 дней',price:179},{days:30,label:'30 дней',price:358},{days:0,label:'Навсегда',price:4491}];

  giftBtn.addEventListener('click', ()=>{
    // animate main content out
    document.querySelector('.screen').style.transition = 'opacity .36s ease, transform .36s ease';
    document.querySelector('.screen').style.opacity = '0';
    document.querySelector('.screen').style.transform = 'translateY(-12px)';
    setTimeout(()=>{ document.querySelector('.screen').classList.add('hidden'); giftArea.classList.remove('hidden'); giftArea.style.opacity='0'; giftArea.style.transform='scale(.98)'; setTimeout(()=>{ giftArea.style.transition='opacity .36s ease, transform .36s ease'; giftArea.style.opacity='1'; giftArea.style.transform='scale(1)'; },10); },380);
  });

  giftNick.addEventListener('keydown', async (e)=>{ if (e.key==='Enter'){
    const to = giftNick.value.trim(); if (!to) return;
    // show steps: prefill From and To display (basic)
    const from = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user : { id: 'demo', first_name: 'Вы', username: '' };
    document.getElementById('giftFromName').textContent = from.first_name || from.username || 'Вы';
    document.getElementById('giftToName').textContent = to;
    giftSteps.classList.remove('hidden');
    // populate plans as small tiles
    giftPlans.innerHTML = '';
    PLANS.forEach(p=>{
      const el = document.createElement('div'); el.className='plan'; el.innerHTML = `<div class="plan-inner"><h3>${p.label}</h3><p>${p.price} руб.</p></div>`;
      el.addEventListener('click', ()=>{ document.querySelectorAll('#giftPlans .plan').forEach(x=>x.classList.remove('selected')); el.classList.add('selected'); el.dataset.days = p.days; });
      giftPlans.appendChild(el);
    });
  }});

  cancelGift.addEventListener('click', ()=>{ giftArea.classList.add('hidden'); document.querySelector('.screen').classList.remove('hidden'); setTimeout(()=>{ document.querySelector('.screen').style.opacity='1'; document.querySelector('.screen').style.transform='translateY(0)'; },20); });

  sendGift.addEventListener('click', async ()=>{
    const sel = document.querySelector('#giftPlans .plan.selected'); if (!sel){ alert('Выберите тариф'); return; }
    const days = parseInt(sel.dataset.days);
    const to = giftNick.value.trim();
    const from = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : null;
    try{ const res = await fetch('/gift',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ from_chat_id: from, to_username: to, days })}); const j = await res.json(); if (j.ok){ alert('Подарок отправлен'); window.location.reload(); } else alert('Ошибка: '+(j.error||'unknown')); }catch(e){ alert('Сетевая ошибка'); }
  });
})();
