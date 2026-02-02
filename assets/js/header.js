/* =========================================================
   Header interactions (dropdown)
   ========================================================= */
(function(){
  const dropdown = document.querySelector('[data-dropdown="pesquisas"]');
  if(!dropdown) return;

  const toggle = dropdown.querySelector('[data-dropdown-toggle]');
  const panel  = dropdown.querySelector('[data-dropdown-panel]');

  const closeAll = () => dropdown.classList.remove('is-open');

  toggle?.addEventListener('click', (e) => {
    e.preventDefault();
    dropdown.classList.toggle('is-open');
  });

  // fecha ao clicar fora
  document.addEventListener('click', (e) => {
    const target = e.target;
    if(!(target instanceof Element)) return;
    if(!dropdown.contains(target)) closeAll();
  });

  // fecha com ESC
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeAll();
  });

  // Se tiver links no panel, fecha ao clicar
  panel?.addEventListener('click', (e) => {
    const target = e.target;
    if(!(target instanceof Element)) return;
    if(target.closest('a')) closeAll();
  });
})();
