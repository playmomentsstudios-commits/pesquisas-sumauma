const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = document.getElementById("emailInput").value;
  const password = document.getElementById("passwordInput").value;

  const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
  });

  if (error) {
      const box = document.getElementById("loginError");
      box.hidden = false;
      box.textContent = error.message;
      return;
  }

  location.reload();

});
