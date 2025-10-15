(function(){
  // Simple order/checkout flow
  const PLANS = [
    {days:7, label:'7 дней', price:179},
    {days:30, label:'30 дней', price:358},
    {days:0, label:'Навсегда', price:4441},
    {days:1, label:'1 День', price:115},
    {days:14, label:'14 Дней', price:266},
    {days:60, label:'60 Дней', price:745},
    {days:180, label:'180 Дней', price:2451}
  ];

  const PROVIDERS = [
    { id: 'card', name: 'Карта', desc: 'Быстрая оплата картой' },
    { id: 'qiwi', name: 'QIWI', desc: 'Оплата через QIWI' },
    { id: 'yoomoney', name: 'YooMoney', desc: 'Оплата через YooMoney' }
  ];

  function findPlan(days){
    return PLANS.find(p => Number(p.days) === Number(days)) || {days: days, label: (days === '0' || Number(days)===0) ? 'Навсегда' : (days + ' дней'), price: 0};
  }

  function $(id){ return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const days = params.get('days');
    const chatId = params.get('chat_id') || null;

    const plan = findPlan(days);
    $('planSummary').textContent = `${plan.label} — ${plan.price} руб.`;

    const optSelf = $('optSelf');
    const optGift = $('optGift');
    const giftForm = $('giftForm');
    const recipientInput = $('recipientInput');
    const continueToPay = $('continueToPay');
    const providersArea = $('providersArea');
    const providersList = $('providersList');
    const providersBack = $('providersBack');
    const successOverlay = $('successOverlay');
    const successInfo = $('successInfo');
    const goBackToStore = $('goBackToStore');
    const notAuthNotice = $('notAuthNotice');

    let mode = 'self'; // 'self' | 'gift'

    function ensureAuth() {
      if (!chatId) {
        notAuthNotice.classList.remove('hidden');
        return false;
      } else {
        notAuthNotice.classList.add('hidden');
        return true;
      }
    }

    function showProviders() {
      providersList.innerHTML = '';
      providersArea.classList.remove('hidden');
      providersArea.classList.remove('hidden');
      PROVIDERS.forEach((p) => {
        const el = document.createElement('div');
        el.className = 'provider';
        el.innerHTML = `<h4>${p.name}</h4><p style="font-size:12px;color:var(--muted)">${p.desc}</p>`;
        el.addEventListener('click', () => selectProvider(p));
        providersList.appendChild(el);
        setTimeout(() => el.classList.add('show'), 80);
      });
    }

    async function selectProvider(provider){
      if (mode === 'self') {
        if (!ensureAuth()) return;
        try {
          const res = await fetch('/purchase', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ chat_id: chatId, days: Number(days), provider: provider.id })
          });
          const j = await res.json();
          if (j.ok) {
            successInfo.innerHTML = `<p>Лицензия: <strong>${j.license?.key || '—'}</strong></p><p>Период: ${j.license?.days===0 ? 'Навсегда' : (j.license?.days + ' дней') || plan.label}</p><p>Цена: ${j.license?.price || plan.price} руб.</p>`;
            successOverlay.classList.remove('hidden');
            setTimeout(()=> document.querySelector('.success-card')?.classList.add('show'), 10);
          } else {
            alert('Ошибка: ' + (j.error || 'неизвестная ошибка'));
          }
        } catch(e){ alert('Ошибка сети'); }
      } else {
        // gift
        if (!ensureAuth()) return;
        const recipient = recipientInput.value.trim();
        if (!recipient) { alert('Введите получателя'); return; }
        try {
          const res = await fetch('/gift', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ from_chat_id: chatId, to_username: recipient, days: Number(days), provider: provider.id })
          });
          const j = await res.json();
          if (j.ok) {
            successInfo.innerHTML = `<p>Подарок отправлен: <strong>${recipient}</strong></p><p>Период: ${Number(days)===0 ? 'Навсегда' : (days + ' дней')}</p>`;
            successOverlay.classList.remove('hidden');
            setTimeout(()=> document.querySelector('.success-card')?.classList.add('show'), 10);
          } else {
            alert('Ошибка: ' + (j.error || 'неизвестная ошибка'));
          }
        } catch(e){ alert('Ошибка сети'); }
      }
    }

    optSelf.addEventListener('click', () => {
      mode = 'self';
      giftForm.classList.add('hidden');
      providersArea.classList.remove('hidden');
      showProviders();
    });

    optGift.addEventListener('click', () => {
      mode = 'gift';
      giftForm.classList.remove('hidden');
      providersArea.classList.add('hidden');
    });

    continueToPay.addEventListener('click', () => {
      if (!recipientInput.value.trim()) { alert('Введите получателя'); return; }
      providersArea.classList.remove('hidden');
      showProviders();
    });

    providersBack && providersBack.addEventListener('click', () => {
      providersArea.classList.add('hidden');
    });

    goBackToStore && goBackToStore.addEventListener('click', () => {
      window.location.href = '/main.html' + (chatId ? ('?chat_id=' + encodeURIComponent(chatId)) : '');
    });

  });
})();
