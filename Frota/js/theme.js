function toggleTheme() {
    document.documentElement.classList.toggle('theme-light');
    const isLight = document.documentElement.classList.contains('theme-light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Inicializa o tema no carregamento da página
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.add('theme-light');
    }
});

// Executa imediatamente para evitar o "flash" de tema (caso o script seja lido antes do DOMContentLoaded)
if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('theme-light');
}
