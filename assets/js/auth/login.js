const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorElement = document.getElementById('error-msg');
async function login() {
  errorElement.style.display = 'none';
  try {
    const response = await fetch('/api/login', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: usernameInput.value.trim(), password: passwordInput.value})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha no login.');
    window.location.assign('/teambuild.html');
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.style.display = 'block';
  }
}
document.getElementById('loginButton').addEventListener('click', login);
document.getElementById('createAccountButton').addEventListener('click', () => window.location.assign('/createLogin.html'));
passwordInput.addEventListener('keydown', event => {if (event.key === 'Enter') login();});
