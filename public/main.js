(async function(){
  // fetch me (try initDataUnsafe fallback)
  async function loadMe(){
    const chatId = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : null;
    if (!chatId) return;
    try{ const r = await fetch('/me?chat_id='+encodeURIComponent(chatId)); const j = await r.json(); if (j.ok){ const u = j.user; document.getElementById('mainName').textContent = u.first_name || u.username || 'Пользователь'; document.getElementById('mainUsername').textContent = u.username ? '@'+u.username : ''; if (u.avatar) { document.getElementById('mainAvatar').src = u.avatar; document.getElementById('mainAvatar').classList.remove('hidden'); } const info = j.active ? (j.daysRemaining ? j.daysRemaining+' дней' : 'Навсегда') : 'Нет подписки'; document.getElementById('subInfo').textContent = 'Подписка: '+info; } }catch(e){}
  }
  loadMe();

  document.getElementById('buyMain').addEventListener('click', ()=>{ location.href = '/webapp.html'; });
  document.getElementById('giftMain').addEventListener('click', async ()=>{
    const to = prompt('Кому подарить? Введите @username или chat_id');
    const days = parseInt(prompt('На сколько дней подарить? Введите число дней (0 — навсегда)','30'))||30;
    if (!to) return;
    const from = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : null;
    try{
      const res = await fetch('/gift', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ from_chat_id: from, to_username: to, days }) });
      const j = await res.json(); if (j.ok) alert('Подарок отправлен!'); else alert('Ошибка: '+(j.error||'unknown'));
    }catch(e){ alert('Сетeвая ошибка'); }
  });
})();
