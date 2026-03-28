// quiz.js — CivExit Idea Validation Survey
//
// Required Supabase table (run in Supabase SQL editor):
//
// create table quiz_responses (
//   id bigint generated always as identity primary key,
//   age_group text,
//   panic_response text,
//   first_item text,
//   simulation_prepares text,
//   simulation_effectiveness text,
//   trusted_ally text,
//   child_simulation text,
//   created_at timestamp with time zone default now()
// );
//
// Also enable RLS and add a policy so anon can INSERT and SELECT:
// alter table quiz_responses enable row level security;
// create policy "Allow anon insert" on quiz_responses for insert to anon with check (true);
// create policy "Allow anon select" on quiz_responses for select to anon using (true);

const QUESTIONS = [
    {
        id: 'age_group',
        number: 1,
        label: 'How old are you?',
        type: 'radio',
        options: ['Under 18', '18–24', '25–34', '35–44', '45–54', '55+']
    },
    {
        id: 'panic_response',
        number: 2,
        label: 'How prepared do you feel to make a critical decision within 10 seconds during a disaster?',
        subtitle: 'You may select more than one.',
        type: 'multi',
        options: [
            "I panic easily and don't know what to do",
            "I can't make decisions under pressure",
            "I try to stay calm, but don't always make the right choice",
            "I keep my composure and act immediately"
        ]
    },
    {
        id: 'first_item',
        number: 3,
        label: 'You have one backpack to fill in 2 minutes. What is the first item you would put in it?',
        type: 'text',
        placeholder: 'e.g. water, documents, phone charger...'
    },
    {
        id: 'simulation_prepares',
        number: 4,
        label: 'Do you think a simulation can prepare you — or someone else — for a real emergency?',
        type: 'radio',
        options: ['Yes', 'No']
    },
    {
        id: 'simulation_effectiveness',
        number: 5,
        label: 'How effective do you think a simulation would be for training survival skills?',
        type: 'radio',
        options: ['Very effective', 'Somewhat effective', 'Not very effective', 'Not effective at all']
    },
    {
        id: 'trusted_ally',
        number: 6,
        label: 'In a chaotic situation, who would you trust the most?',
        type: 'radio',
        options: ['Myself', 'Family', 'Friends', 'Authorities / Emergency Services', 'No one']
    },
    {
        id: 'child_simulation',
        number: 7,
        label: 'Would you let a child play a survival simulation to teach them about emergencies?',
        type: 'radio',
        options: ['Yes', 'No', 'Maybe, with supervision']
    }
];

const CHART_COLORS = [
    '#f59e0b', '#fbbf24', '#d97706', '#b45309',
    '#92400e', '#6b7280', '#9ca3af', '#4b5563',
    '#374151', '#e5e7eb'
];

const CHART_LABELS = {
    age_group:              'Age Distribution',
    panic_response:         'Crisis Decision Readiness',
    first_item:             'First Item Packed',
    simulation_prepares:    'Can a Simulation Prepare You?',
    simulation_effectiveness: 'Simulation Effectiveness',
    trusted_ally:           'Most Trusted in Chaos',
    child_simulation:       'Child Survival Training?'
};

// ─── State ────────────────────────────────────────────────────────────────────

let currentIndex = 0;
const answers = {};
let multiSelected = new Set();

// ─── Supabase ─────────────────────────────────────────────────────────────────

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
    const q = QUESTIONS[currentIndex];
    multiSelected = new Set();

    const pct = Math.round((currentIndex / QUESTIONS.length) * 100);
    document.getElementById('progress-bar').style.width = `${pct}%`;
    document.getElementById('progress-text').textContent = `${q.number} / ${QUESTIONS.length}`;

    const isLast = currentIndex === QUESTIONS.length - 1;
    const nextLabel = isLast ? '[ Submit Survey ]' : '[ Next Question ]';

    const header = `
        <div class="mb-6">
            <span class="text-amber-500 font-mono text-[10px] uppercase tracking-widest">Question ${q.number} of ${QUESTIONS.length}</span>
            <h2 class="text-lg font-bold text-white mt-2 leading-snug">${q.label}</h2>
            ${q.subtitle ? `<p class="text-zinc-500 font-mono text-xs mt-1">${q.subtitle}</p>` : ''}
        </div>
    `;

    const nextBtn = `
        <button id="next-btn" onclick="advance()" disabled
            class="w-full mt-6 py-3 bg-amber-500 text-zinc-950 font-black font-mono text-sm uppercase tracking-widest
                   opacity-30 cursor-not-allowed transition-all">
            ${nextLabel}
        </button>
    `;

    const container = document.getElementById('quiz-container');

    if (q.type === 'radio') {
        container.innerHTML = header + `
            <div class="space-y-3">
                ${q.options.map((opt, i) => `
                    <button onclick="selectRadio(${i})" data-index="${i}"
                        class="option-btn w-full text-left p-4 border border-zinc-700 font-mono text-sm text-zinc-300
                               hover:border-amber-500 hover:bg-amber-500/10 transition-all">
                        <span class="text-amber-500/50 mr-3 text-xs">${String.fromCharCode(65 + i)})</span>${opt}
                    </button>
                `).join('')}
            </div>
            ${nextBtn}
        `;
    } else if (q.type === 'multi') {
        container.innerHTML = header + `
            <div class="space-y-3">
                ${q.options.map((opt, i) => `
                    <button onclick="toggleMulti(${i})" data-index="${i}"
                        class="multi-btn w-full text-left p-4 border border-zinc-700 font-mono text-sm text-zinc-300
                               hover:border-amber-500 transition-all flex items-start gap-3">
                        <span id="check-${i}" class="w-4 h-4 border border-zinc-600 flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px]"></span>
                        <span>${opt}</span>
                    </button>
                `).join('')}
            </div>
            ${nextBtn}
        `;
    } else if (q.type === 'text') {
        container.innerHTML = header + `
            <textarea id="text-answer" rows="3" placeholder="${q.placeholder}"
                class="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 font-mono text-sm p-4 resize-none
                       focus:outline-none focus:border-amber-500 transition-colors placeholder-zinc-600"
                oninput="onTextInput()"></textarea>
            ${nextBtn}
        `;
    }
}

// ─── Interaction handlers ─────────────────────────────────────────────────────

function selectRadio(index) {
    const q = QUESTIONS[currentIndex];
    answers[q.id] = q.options[index];

    document.querySelectorAll('.option-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', i === index);
    });
    setNextEnabled(true);
};

function toggleMulti(index) {
    const q = QUESTIONS[currentIndex];

    if (multiSelected.has(index)) {
        multiSelected.delete(index);
        document.querySelectorAll('.multi-btn')[index].classList.remove('selected');
        const box = document.getElementById(`check-${index}`);
        box.innerHTML = '';
        box.classList.remove('bg-amber-500', 'border-amber-500', 'text-zinc-950');
        box.classList.add('border-zinc-600');
    } else {
        multiSelected.add(index);
        document.querySelectorAll('.multi-btn')[index].classList.add('selected');
        const box = document.getElementById(`check-${index}`);
        box.innerHTML = '✓';
        box.classList.add('bg-amber-500', 'border-amber-500', 'text-zinc-950');
        box.classList.remove('border-zinc-600');
    }

    answers[q.id] = Array.from(multiSelected).map(i => q.options[i]).join(' | ');
    setNextEnabled(multiSelected.size > 0);
};

function onTextInput() {
    const val = document.getElementById('text-answer')?.value?.trim() ?? '';
    if (val) answers[QUESTIONS[currentIndex].id] = val;
    setNextEnabled(val.length > 0);
};

function setNextEnabled(enabled) {
    const btn = document.getElementById('next-btn');
    if (!btn) return;
    btn.disabled = !enabled;
    btn.classList.toggle('opacity-30', !enabled);
    btn.classList.toggle('cursor-not-allowed', !enabled);
    btn.classList.toggle('hover:bg-amber-400', enabled);
    btn.classList.toggle('cursor-pointer', enabled);
}

function advance() {
    // Capture text answer on advance
    if (QUESTIONS[currentIndex].type === 'text') {
        const val = document.getElementById('text-answer')?.value?.trim();
        if (val) answers[QUESTIONS[currentIndex].id] = val;
    }

    currentIndex++;

    if (currentIndex < QUESTIONS.length) {
        render();
    } else {
        submitAndShowResults();
    }
};

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submitAndShowResults() {
    // Show submitting state
    document.getElementById('progress-area').innerHTML = `
        <div class="flex items-center gap-3 font-mono text-xs text-amber-500 uppercase tracking-widest animate-pulse">
            <span class="w-2 h-2 bg-amber-500 rounded-full"></span>
            Transmitting to secure database...
        </div>
    `;
    document.getElementById('quiz-container').innerHTML = `
        <div class="py-8 text-center">
            <div class="w-full h-[2px] bg-zinc-800 overflow-hidden">
                <div class="h-full bg-amber-500 animate-pulse" style="width:100%"></div>
            </div>
        </div>
    `;

    // Insert into Supabase
    try {
        const { error } = await _supabase.from('quiz_responses').insert([{
            age_group:               answers.age_group               ?? null,
            panic_response:          answers.panic_response          ?? null,
            first_item:              answers.first_item              ?? null,
            simulation_prepares:     answers.simulation_prepares     ?? null,
            simulation_effectiveness: answers.simulation_effectiveness ?? null,
            trusted_ally:            answers.trusted_ally            ?? null,
            child_simulation:        answers.child_simulation        ?? null,
        }]);
        if (error) console.error('Supabase insert error:', error);
    } catch (e) {
        console.error('Submit error:', e);
    }

    // Show success card
    document.getElementById('quiz-wrapper').innerHTML = `
        <div class="text-center py-8">
            <div class="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg class="w-7 h-7 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <h2 class="text-2xl font-black uppercase text-white mb-2">Response Logged</h2>
            <p class="text-zinc-500 font-mono text-xs leading-relaxed max-w-sm mx-auto">
                Your data has been transmitted to the global survival intelligence database.
            </p>
            <p class="text-amber-500 font-mono text-[10px] uppercase tracking-widest mt-5 animate-pulse">
                [ Loading collective intelligence... ]
            </p>
        </div>
    `;

    // Load charts, then reveal results phase
    await loadAndRenderCharts();

    document.getElementById('quiz-phase').classList.add('hidden');
    document.getElementById('results-phase').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Charts ───────────────────────────────────────────────────────────────────

async function loadAndRenderCharts() {
    let data = [];
    try {
        const { data: rows, error } = await _supabase.from('quiz_responses').select('*');
        if (error) { console.error('Fetch error:', error); }
        else { data = rows ?? []; }
    } catch (e) {
        console.error('Chart fetch error:', e);
    }

    document.getElementById('total-responses').innerHTML = `
        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
        ${data.length} total response${data.length !== 1 ? 's' : ''} logged
    `;

    const chartsGrid = document.getElementById('charts-grid');
    chartsGrid.innerHTML = '';

    QUESTIONS.forEach(q => {
        const counts = {};

        data.forEach(row => {
            let val = row[q.id];
            if (!val) return;

            if (q.type === 'multi') {
                val.split(' | ').forEach(item => {
                    item = item.trim();
                    if (item) counts[item] = (counts[item] || 0) + 1;
                });
            } else {
                if (q.id === 'first_item') val = normalizeFirstItem(val);
                val = val.toString().trim();
                if (val) counts[val] = (counts[val] || 0) + 1;
            }
        });

        const top10 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (top10.length === 0) return;

        const labels = top10.map(([k]) => k);
        const values = top10.map(([, v]) => v);
        const total  = values.reduce((a, b) => a + b, 0);

        const card = document.createElement('div');
        card.className = 'bg-zinc-900/50 border border-zinc-800 p-5 hover:border-amber-500/30 transition-all';

        card.innerHTML = `
            <h3 class="font-mono text-[10px] text-amber-500 uppercase tracking-[0.2em] mb-4 border-b border-zinc-800 pb-2 flex justify-between">
                <span>${CHART_LABELS[q.id]}</span>
                <span class="text-zinc-600">Q${q.number}</span>
            </h3>
            <div class="relative mx-auto" style="height:200px; max-width:200px;">
                <canvas id="chart-${q.id}"></canvas>
            </div>
            <ul class="mt-5 space-y-1.5">
                ${top10.map(([label, count], i) => `
                    <li class="flex justify-between items-center font-mono text-[10px]">
                        <span class="flex items-center gap-2 min-w-0">
                            <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
                            <span class="text-zinc-400 truncate" title="${label}">${label}</span>
                        </span>
                        <span class="text-amber-500 font-bold ml-3 flex-shrink-0">${count} <span class="text-zinc-600">(${Math.round(count/total*100)}%)</span></span>
                    </li>
                `).join('')}
            </ul>
        `;

        chartsGrid.appendChild(card);

        new Chart(document.getElementById(`chart-${q.id}`).getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: CHART_COLORS.slice(0, labels.length),
                    borderColor: '#09090b',
                    borderWidth: 2,
                    hoverBorderColor: '#f59e0b',
                    hoverBorderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#18181b',
                        borderColor: '#3f3f46',
                        borderWidth: 1,
                        titleColor: '#f59e0b',
                        bodyColor: '#a1a1aa',
                        titleFont: { family: 'Space Mono', size: 10 },
                        bodyFont: { family: 'Space Mono', size: 10 },
                        callbacks: {
                            label: ctx => ` ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)`
                        }
                    }
                },
                cutout: '62%',
                animation: { animateRotate: true, duration: 900 }
            }
        });
    });
}

function normalizeFirstItem(val) {
    const low = val.toLowerCase().trim();
    if (low.includes('water') || low.includes('вода') || low.includes('шише') || low.includes('бутилка')) return 'Water';
    if (low.includes('food') || low.includes('храна') || low.includes('conserv') || low.includes('кутия')) return 'Food';
    if (low.includes('document') || low.includes('passport') || low.includes('паспорт') || low.includes('документ') || low.includes('id card')) return 'Documents / ID';
    if (low.includes('phone') || low.includes('телефон') || low.includes('charger') || low.includes('зарядно')) return 'Phone / Charger';
    if (low.includes('knife') || low.includes('нож') || low.includes('tool') || low.includes('брадва')) return 'Tools / Knife';
    if (low.includes('medic') || low.includes('first aid') || low.includes('аптечка') || low.includes('лекарств')) return 'First Aid Kit';
    if (low.includes('cloth') || low.includes('jacket') || low.includes('blanket') || low.includes('дреха') || low.includes('яке')) return 'Clothes / Blanket';
    if (low.includes('money') || low.includes('cash') || low.includes('пари')) return 'Money / Cash';
    if (low.includes('flashlight') || low.includes('torch') || low.includes('фенер')) return 'Flashlight';
    if (low.includes('backpack') || low.includes('раница') || low.includes('bag')) return 'Backpack / Bag';
    return val.length > 22 ? val.substring(0, 20) + '…' : val;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', render);
