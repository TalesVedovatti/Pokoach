        function createAccount() {
            const user = document.getElementById("username").value;
            const pass = document.getElementById("password").value;
            const ingamename = document.getElementById("ingamename").value;

            window.location.href = "index.html";
        }


// Associa o botão de cadastro ao comportamento da página.
document.getElementById("createAccountButton").addEventListener("click", createAccount);
