// 3. Your modified Event Listener
document.getElementById('start-simulation')?.addEventListener('click', () => {
    document.getElementById('hero').classList.add('opacity-0', 'transition-opacity', 'duration-1000');
    
    // Start fetching data immediately so it's ready when the transition ends
    fetchAndDisplayStats();

    setTimeout(() => {
        document.getElementById('hero').style.display = 'none';
        const simContainer = document.getElementById('simulation-container');
        simContainer.classList.remove('hidden');
    }, 1000);
});