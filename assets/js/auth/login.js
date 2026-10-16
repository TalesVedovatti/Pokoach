        function login() {
            const user = document.getElementById("username").value;
            const pass = document.getElementById("password").value;

            // Credenciais exemplo (modifique conforme necessário)
            const validUser = "ash";
            const validPass = "pikachu123";

            if (user === validUser && pass === validPass) {
                window.location.href = "teambuild.html";
            } else {
                document.getElementById("error-msg").style.display = "block";
            }
        }
        function createAccount() {
            window.location.href = "createLogin.html";
        }


// Associa os botões aos comportamentos da página.
document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("createAccountButton").addEventListener("click", createAccount);
