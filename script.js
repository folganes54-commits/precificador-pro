function saveUser(u) {
  localStorage.setItem('pp_user', JSON.stringify(u));
}
function getUser() {
  return JSON.parse(localStorage.getItem('pp_user'));
}

function mostrarLogin() {
  document.getElementById('login-box').classList.remove('hidden');
}
function esconderLogin() {
  document.getElementById('login-box').classList.add('hidden');
}
function mostrarRegister() {
  document.getElementById('register-box').classList.remove('hidden');
}
function esconderRegister() {
  document.getElementById('register-box').classList.add('hidden');
}

function login() {
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  const u = getUser();
  if (u && u.email === email && u.senha === senha) {
    alert('Login bem-sucedido');
    esconderLogin();
  } else {
    alert('Credenciais inválidas');
  }
}

function register() {
  const email = document.getElementById('reg-email').value;
  const senha = document.getElementById('reg-senha').value;
  const u = { email, senha, pro: false, uso: 0 };
  saveUser(u);
  alert('Conta criada!');
  esconderRegister();
}

function calcular() {
  const u = getUser();
  if (!u) {
    alert('Você precisa criar uma conta ou fazer login para usar.');
    return;
  }

  if (!u.pro && u.uso >= 5) {
    document.getElementById('modal-limite').classList.remove('hidden');
    return;
  }

  const custo = +document.getElementById('custo').value;
  const margem = +document.getElementById('margem').value;
  const resultado = custo + (custo * (margem / 100));
  document.getElementById('resultado').innerText = 'Preço final: R$ ' + resultado.toFixed(2);

  if (!u.pro) {
    u.uso++;
    saveUser(u);
  }
}