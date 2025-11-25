function save(u){localStorage.setItem('user',JSON.stringify(u));}
function get(){return JSON.parse(localStorage.getItem('user'));}

function login(){
  const e=document.getElementById('email').value;
  const s=document.getElementById('senha').value;
  const u=get();
  if(u && u.email===e && u.senha===s){location='app.html';}
  else alert('Credenciais inválidas');
}

function register(){
  const u={email:document.getElementById('email').value,senha:document.getElementById('senha').value,pro:false,uso:0};
  save(u);
  alert('Conta criada!');
  location='login.html';
}

function calcular(){
  let u=get();
  if(!u) return alert('Faça login');

  if(!u.pro && u.uso>=5){
    document.getElementById('limiteMsg').classList.remove('hidden');
    return;
  }

  const c=+document.getElementById('custo').value;
  const m=+document.getElementById('margem').value;
  const r=c+(c*(m/100));
  document.getElementById('resultado').innerText='Preço final: R$ '+r.toFixed(2);

  if(!u.pro){
    u.uso++;
    save(u);
  }
}
