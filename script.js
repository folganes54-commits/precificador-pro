// ----------------- Helpers e constantes -----------------
const $ = id => document.getElementById(id);
const money = v => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const STORAGE_KEY = 'calc_history_v1';
const USER_KEY = 'pp_user';
const FREE_LIMIT = 5;
const MP_LINK = 'https://mpago.la/1gvGe7R'; // seu link do Mercado Pago

function safeNum(value){
  const n = parseFloat(String(value).replace(',','.'));
  return isNaN(n) ? 0 : n;
}
function getField(id){
  const el = $(id);
  return el ? safeNum(el.value) : 0;
}

// ----------------- cálculo original (sem alterações) -----------------
function calcularCore(){
  const custo = getField('custo');
  const variavel = getField('variavel');
  const frete = getField('frete');
  const margem = getField('margem');
  const impostos = getField('impostos');
  const comissao = getField('comissao');
  const quant = Math.max(1, Math.round(getField('quant')));

  const custoUnit = custo + variavel + frete;
  let precoUnit = custoUnit * (1 + margem/100);
  precoUnit *= (1 + impostos/100);
  precoUnit *= (1 + comissao/100);

  const receita = precoUnit * quant;
  const lucroTotal = (precoUnit - custoUnit) * quant;

  return { precoUnit, custoUnit, receita, lucroTotal, quant };
}

function renderResultado(obj){
  $('preco').textContent = money(obj.precoUnit);
  $('detalhes').textContent = `Custo total por unidade: ${money(obj.custoUnit)} • Lucro unitário: ${money(obj.precoUnit - obj.custoUnit)} • Margem real: ${((obj.precoUnit - obj.custoUnit)/obj.precoUnit*100).toFixed(1)}%`;
}

function renderSimulacoes(precoUnit = 0, custoUnit = 0){
  const tbody = document.querySelector('#simulTable tbody');
  tbody.innerHTML = '';
  const baseQs = [1,5,10,20,50];
  const current = Math.max(1, Math.round(getField('quant')));
  if(!baseQs.includes(current)) baseQs.unshift(current);
  baseQs.forEach(q=>{
    const receita = precoUnit * q;
    const lucro = (precoUnit - custoUnit) * q;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${q}</td><td>${money(precoUnit)}</td><td>${money(receita)}</td><td>${money(lucro)}</td>`;
    tbody.appendChild(tr);
  });
}

// ----------------- histórico (localStorage) -----------------
function loadHist(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch(e){ console.error(e); return []; } }
function saveHist(h){ localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); }
function renderHist(){
  const tbody = document.querySelector('#histTable tbody');
  const hist = loadHist();
  tbody.innerHTML = '';
  hist.forEach(item=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(item.data).toLocaleString()}</td>
      <td>${item.nome}</td>
      <td>${money(item.precoUnit)}</td>
      <td>${item.quant}</td>
      <td>${money(item.receita)}</td>
      <td>${money(item.lucroTotal)}</td>
      <td>
        <button class="smallbtn" onclick="editar(${item.id})">Editar</button>
        <button class="smallbtn" onclick="remover(${item.id})">Remover</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ----------------- AÇÕES originais -----------------
function onCalcular(){
  try{
    // Antes de calcular, checar usuário e limite
    const user = getUser();
    if(!user){
      alert('Você precisa criar uma conta ou fazer login para usar a calculadora.');
      showRegister();
      return;
    }

    if(!user.pro && user.uso >= FREE_LIMIT){
      // abrir modal de limite
      openModalLimite();
      return;
    }

    const res = calcularCore();
    renderResultado(res);
    renderSimulacoes(res.precoUnit, res.custoUnit);

    // incrementar uso se não PRO
    if(!user.pro){
      user.uso = (user.uso || 0) + 1;
      saveUser(user);
      updateUserUI();
      // se atingiu limite, mostrar modal
      if(user.uso >= FREE_LIMIT){
        openModalLimite();
      }
    }
  }catch(e){
    console.error('Erro em onCalcular:', e);
    alert('Erro ao calcular — veja o console (F12).');
  }
}

function onSalvar(){
  try{
    const user = getUser();
    if(!user){
      alert('Você precisa criar uma conta para salvar cenários.');
      showRegister();
      return;
    }

    const nome = $('nome').value || 'Sem nome';
    const res = calcularCore();
    const item = {
      id: Date.now(),
      data: new Date().toISOString(),
      nome,
      precoUnit: res.precoUnit,
      custoUnit: res.custoUnit,
      quant: res.quant,
      receita: res.receita,
      lucroTotal: res.lucroTotal
    };
    const hist = loadHist();
    hist.unshift(item);
    saveHist(hist);
    renderHist();
    alert('Cenário salvo!');
  }catch(e){
    console.error('Erro em onSalvar:', e);
    alert('Não foi possível salvar. Veja o console (F12).');
  }
}

function onCopiar(){
  try{
    const res = calcularCore();
    const text = `Preço unitário sugerido: ${money(res.precoUnit)} — Lucro total (q=${res.quant}): ${money(res.lucroTotal)}`;
    navigator.clipboard.writeText(text).then(()=>alert('Copiado: ' + text), ()=>{ prompt('Copie manualmente:', text); });
  }catch(e){
    console.error(e);
    alert('Erro ao copiar. Veja o console (F12).');
  }
}

function onExport(){
  try{
    const hist = loadHist();
    if(!hist.length) return alert('Histórico vazio.');
    const rows = [['Data','Nome','Preço Unit','Custo Unit','Quantidade','Receita','Lucro Total']];
    hist.forEach(i => rows.push([i.data,i.nome,i.precoUnit,i.custoUnit,i.quant,i.receita,i.lucroTotal]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'historico_precos.csv'; a.click(); a.remove(); URL.revokeObjectURL(url);
  }catch(e){ console.error(e); alert('Erro ao exportar. Veja o console (F12).'); }
}

function onLimparHistorico(){
  if(!confirm('Limpar todo o histórico?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHist();
}

function editar(id){
  const hist = loadHist();
  const item = hist.find(h=>h.id===id);
  if(!item) return alert('Item não encontrado');
  $('nome').value = item.nome;
  $('custo').value = item.custoUnit || '';
  $('variavel').value = '';
  $('frete').value = '';
  $('margem').value = '';
  $('impostos').value = '';
  $('comissao').value = '';
  $('quant').value = item.quant;
  $('precoVenda').value = item.precoUnit;
  onCalcular();
}

function remover(id){
  if(!confirm('Remover este cenário?')) return;
  let hist = loadHist();
  hist = hist.filter(h=>h.id!==id);
  saveHist(hist);
  renderHist();
}

// ----------------- USUÁRIO: login / cadastro / localStorage -----------------
function getUser(){
  try{ return JSON.parse(localStorage.getItem(USER_KEY)); }catch(e){ return null; }
}
function saveUser(u){
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}
function showLogin(){ $('modalLogin').classList.remove('hidden'); }
function hideLogin(){ $('modalLogin').classList.add('hidden'); }
function showRegister(){ $('modalRegister').classList.remove('hidden'); }
function hideRegister(){ $('modalRegister').classList.add('hidden'); }

function doRegister(){
  const email = $('regEmail').value && $('regEmail').value.trim();
  const senha = $('regSenha').value && $('regSenha').value.trim();
  if(!email || !senha) return alert('Preencha email e senha.');
  const u = { email, senha, pro: false, uso: 0 };
  saveUser(u);
  alert('Conta criada! Faça login para começar.');
  hideRegister();
  updateUserUI();
}

function doLogin(){
  const email = $('loginEmail').value && $('loginEmail').value.trim();
  const senha = $('loginSenha').value && $('loginSenha').value.trim();
  const u = getUser();
  if(u && u.email === email && u.senha === senha){
    alert('Login bem-sucedido');
    hideLogin();
    updateUserUI();
  } else {
    alert('Credenciais inválidas');
  }
}

function logout(){
  // removemos dados locais do usuário da interface (mas mantemos no storage para persistência)
  $('userInfo').classList.add('hidden');
  $('btnLogin').classList.remove('hidden');
  $('btnRegister').classList.remove('hidden');
  $('btnLogout').classList.add('hidden');
  // não removemos o user do localStorage para não perder histórico salvo
  // opcional: localStorage.removeItem(USER_KEY);
}

function updateUserUI(){
  const u = getUser();
  if(u){
    $('userInfo').textContent = `${u.email} ${u.pro ? '(PRO)' : `(FREE ${u.uso || 0}/${FREE_LIMIT})`}`;
    $('userInfo').classList.remove('hidden');
    $('btnLogin').classList.add('hidden');
    $('btnRegister').classList.add('hidden');
    $('btnLogout').classList.remove('hidden');
  } else {
    $('userInfo').classList.add('hidden');
    $('btnLogin').classList.remove('hidden');
    $('btnRegister').classList.remove('hidden');
    $('btnLogout').classList.add('hidden');
  }
}

// ----------------- Modal limite e pagamento -----------------
function openModalLimite(){ $('modalLimite').classList.remove('hidden'); }
function closeModalLimite(){ $('modalLimite').classList.add('hidden'); }
function openPagamento(){
  // abre o link de pagamento em nova aba
  window.open(MP_LINK, '_blank');
  alert('Abra o link de pagamento em outra guia. Após pagar, volte aqui — o Mercado Pago pode redirecionar automaticamente para ?activate=1.');
}

// Ativação por parâmetro URL (ex: https://site.vercel.app/?activate=1)
function tryActivateFromUrl(){
  try{
    const params = new URLSearchParams(location.search);
    if(params.get('activate') === '1'){
      const u = getUser();
      if(u){
        u.pro = true;
        u.uso = 0;
        saveUser(u);
        updateUserUI();
        alert('Pagamento detectado — conta ativada como PRO.');
      } else {
        // se não houver usuário, pedimos para criar conta
        alert('Pagamento detectado, mas parece que você não tem uma conta neste navegador. Crie uma conta com o mesmo email e reabra a URL de ativação.');
        showRegister();
      }
    }
  }catch(e){/*ignore*/}
}

// ----------------- inicialização -----------------
try{
  renderHist();
  onCalcular();
  updateUserUI();
  tryActivateFromUrl();
}catch(e){
  console.error('Erro ao inicializar a calculadora:', e);
}
