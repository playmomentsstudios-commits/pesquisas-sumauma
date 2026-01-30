document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Aqui entra Supabase Auth depois
  console.log("Login:", email, password);

  alert("Login em processamento...");
});

document.getElementById("recoverPassword").addEventListener("click", function(e) {
  e.preventDefault();
  alert("Fluxo de recuperação de senha será integrado ao Supabase.");
});
