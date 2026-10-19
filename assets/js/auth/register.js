const errorElement = document.getElementById('error-msg');
async function createAccount() {
  errorElement.style.display = 'none';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const ingameName = document.getElementById('ingamename').value.trim();
  try {
    const response = await fetch('/api/register', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username,password,ingameName})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha ao cadastrar.');
    window.location.assign('/index.html');
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.style.display = 'block';
  }
}
document.getElementById('backButton').addEventListener('click', () => window.location.assign('/index.html'));
document.getElementById('createAccountButton').addEventListener('click', createAccount);
