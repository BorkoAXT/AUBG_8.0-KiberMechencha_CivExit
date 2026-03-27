// src/js/quiz.js
const quizData = [
    {
        question: "The power grid drops. It's night, and winter. What is your immediate first priority?",
        choices: [
            { text: "A) Check social media for updates on your phone.", isCorrect: false, type: "panic" },
            { text: "B) Secure insulation (blankets/clothes) and block drafts in one room.", isCorrect: true, type: "calm" },
            { text: "C) Go outside in the dark to look for a generator or neighbors.", isCorrect: false, type: "panic" },
            { text: "D) Start a fire in the living room for warmth.", isCorrect: false, type: "panic" }
        ]
    },
    {
        question: "Your tap water stops flowing. What is the safest way to ensure you have drinking water?",
        choices: [
            { text: "A) Drink from the toilet bowl immediately before it drains.", isCorrect: false, type: "panic" },
            { text: "B) Wait for emergency services to distribute bottled water.", isCorrect: false, type: "panic" },
            { text: "C) Drain the hot water heater and boil before use.", isCorrect: true, type: "calm" },
            { text: "D) Drink rainwater directly from the street gutters.", isCorrect: false, type: "panic" }
        ]
    },
    {
        question: "Cellular networks are completely down. You need to communicate with your family across town.",
        choices: [
            { text: "A) Walk across town immediately, even in the dark.", isCorrect: false, type: "panic" },
            { text: "B) Keep trying to call them, draining your phone battery.", isCorrect: false, type: "panic" },
            { text: "C) Stay put, preserve battery, and wait for daylight to assess the situation.", isCorrect: true, type: "calm" },
            { text: "D) Shout from your balcony.", isCorrect: false, type: "panic" }
        ]
    }
];

let currentQuestionIndex = 0;
let score = 0;
let panicClicks = 0;

const quizContainer = document.getElementById('quiz-container');

const quizWrapper = quizContainer.parentElement; 

function renderQuestion() {
    const currentQ = quizData[currentQuestionIndex];
    
    let html = `
        <h2 class="text-xl font-bold mb-6 text-white">Question ${currentQuestionIndex + 1} of ${quizData.length}:<br/><span class="text-amber-500 font-mono text-sm mt-2 block">${currentQ.question}</span></h2>
        <div class="space-y-3 font-mono text-sm">
    `;

    currentQ.choices.forEach((choice, index) => {
        html += `
            <button onclick="handleAnswer(${choice.isCorrect}, '${choice.type}')" 
                class="w-full text-left p-4 border border-zinc-700 hover:border-amber-500 hover:bg-amber-500/10 transition-colors text-zinc-300">
                ${choice.text}
            </button>
        `;
    });

    html += `</div>`;
    
    quizContainer.innerHTML = html;
    
    const scoreDisplay = document.querySelector('.font-mono.text-xs.text-zinc-500');
    if(scoreDisplay) {
        scoreDisplay.innerText = `Calm Score: ${score}/${quizData.length}`;
    }
}

window.handleAnswer = function(isCorrect, type) {
    if (isCorrect) {
        score++;
    } else {
        panicClicks++;
    }

    currentQuestionIndex++;

    if (currentQuestionIndex < quizData.length) {
        renderQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    const quizResults = {
        calmScore: score,
        panicLevel: panicClicks,
        totalQuestions: quizData.length,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('survival_pre_quiz_results', JSON.stringify(quizResults));

    let feedbackTitle = "";
    let feedbackText = "";
    let meterColor = "";
    let meterWidth = Math.round((score / quizData.length) * 100);

    if (score === quizData.length) {
        feedbackTitle = "STATUS: ICE IN YOUR VEINS";
        feedbackText = "Excellent. You maintained logical processing during high-stress scenarios. But the real blackout is unpredictable.";
        meterColor = "bg-green-500";
    } else if (score > 0) {
        feedbackTitle = "STATUS: ELEVATED PANIC";
        feedbackText = "You hesitated. In a total grid failure, hesitation and panic instincts get you killed. You will heavily rely on the Survival Encyclopedia to make it through.";
        meterColor = "bg-amber-500";
    } else {
        feedbackTitle = "STATUS: TOTAL CORTICAL OVERRIDE (PANIC)";
        feedbackText = "You failed. Your biological panic response overrode all logic. Without the Survival Encyclopedia guiding your every step, you wouldn't last 12 hours.";
        meterColor = "bg-red-500";
    }

    quizWrapper.innerHTML = `
        <div class="mb-8 border-b border-zinc-800 pb-6">
            <span class="text-amber-500 font-mono text-xs uppercase tracking-widest mb-2 block">Phase 1 // Complete</span>
            <h1 class="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">Assessment Logged</h1>
        </div>
        
        <div class="bg-zinc-950 p-6 border border-zinc-800 mb-8">
            <h2 class="text-xl font-bold uppercase text-white mb-2">${feedbackTitle}</h2>
            <p class="text-zinc-400 font-mono text-sm leading-relaxed mb-6">${feedbackText}</p>
            
            <div class="w-full bg-zinc-800 h-4 rounded-sm overflow-hidden mb-2 relative">
                <div class="h-full ${meterColor} transition-all duration-1000 ease-out" style="width: 0%" id="result-meter"></div>
            </div>
            <div class="flex justify-between font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                <span>0% (Panic)</span>
                <span>Calm Rating: ${meterWidth}%</span>
                <span>100% (Stable)</span>
            </div>
        </div>

        <div class="mt-8 flex justify-center pt-6 border-t border-zinc-800">
            <a href="index.html#simulation" class="bg-amber-500 text-zinc-950 px-8 py-4 font-black font-mono text-sm uppercase hover:bg-amber-400 transition-colors flex items-center gap-2">
                Initiate Blackout Simulation <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
        </div>
    `;

    setTimeout(() => {
        document.getElementById('result-meter').style.width = `${meterWidth}%`;
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    const bottomBar = document.querySelector('.mt-8.flex.justify-between');
    if(bottomBar) bottomBar.style.display = 'none'; 

    renderQuestion();
});