    document.getElementById('start-simulation').addEventListener('click', () => {
    document.getElementById('hero').classList.add('opacity-0', 'transition-opacity', 'duration-1000');
    
    setTimeout(() => {
        document.getElementById('hero').style.display = 'none';
        const simContainer = document.getElementById('simulation-container');
        simContainer.classList.remove('hidden');
    }, 1000);
});