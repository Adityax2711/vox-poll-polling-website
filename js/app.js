
let state = {
    user: {
        name: null,
        gender: null,
        age: null,
        isVerified: false
    },
    demographics: {
        Male: 0,
        Female: 0,
        Other: 0
    },
    polls: []
};

function loadData() {
    const saved = localStorage.getItem('voxPollState');
    if (saved) {
        state = JSON.parse(saved);
       
        state.user.isVerified = false; 
    }
}

function saveData() {
    localStorage.setItem('voxPollState', JSON.stringify(state));
}

// Chart Instances
let defaultBarChart = null;
let defaultDoughnutChart = null;


const ui = {
    // Screens
    onboardingScreen: document.getElementById('onboarding'),
    dashboardScreen: document.getElementById('dashboard'),
    
    // Forms & Modals
    onboardingForm: document.getElementById('onboarding-form'),
    ageAlertModal: document.getElementById('age-alert-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    
    // Dashboard Elements
    displayName: document.getElementById('display-name'),
    userAvatar: document.getElementById('user-avatar'),
    
    // KPIs
    kpiTotalPolls: document.getElementById('kpi-total-polls'),
    kpiActivePolls: document.getElementById('kpi-active-polls'),
    kpiTotalVotes: document.getElementById('kpi-total-votes'),
    kpiEngagement: document.getElementById('kpi-engagement'),
    
    // Polls & Demographics
    pollsContainer: document.getElementById('polls-container'),
    demoMale: document.getElementById('demo-male'),
    demoFemale: document.getElementById('demo-female'),
    demoOther: document.getElementById('demo-other'),
    
    // Create Poll
    newPollBtn: document.getElementById('new-poll-btn'),
    navCreatePoll: document.getElementById('nav-create-poll'),
    createPollModal: document.getElementById('create-poll-modal'),
    closeCreatePollBtn: document.getElementById('close-create-poll'),
    createPollForm: document.getElementById('create-poll-form'),
    addOptionBtn: document.getElementById('add-option-btn'),
    optionsGroup: document.getElementById('options-group'),

    // Manage Polls
    navManagePolls: document.getElementById('nav-manage-polls'),
    managePollsModal: document.getElementById('manage-polls-modal'),
    closeManagePollsBtn: document.getElementById('close-manage-polls'),
    managePollsContainer: document.getElementById('manage-polls-container')
};


document.addEventListener('DOMContentLoaded', () => {
    // Load persisted state if exists
    loadData();
    
    // Attach Event Listeners
    setupEventListeners();
});


function setupEventListeners() {
    // Onboarding Form Submit
    ui.onboardingForm.addEventListener('submit', handleOnboarding);
    
    // Alert Modal
    ui.closeModalBtn.addEventListener('click', () => {
        ui.ageAlertModal.classList.remove('visible');
    });
    
    // Create Poll Actions
    ui.newPollBtn.addEventListener('click', openCreatePollModal);
    ui.navCreatePoll.addEventListener('click', (e) => { e.preventDefault(); openCreatePollModal(); });
    ui.closeCreatePollBtn.addEventListener('click', closeCreatePollModal);
    
    // Manage Polls Actions
    ui.navManagePolls.addEventListener('click', (e) => { e.preventDefault(); openManagePollsModal(); });
    ui.closeManagePollsBtn.addEventListener('click', closeManagePollsModal);
    
    // Add dynamic option
    ui.addOptionBtn.addEventListener('click', addPollOptionInput);
    
    // Submit new poll
    ui.createPollForm.addEventListener('submit', handleCreatePoll);
}


function handleOnboarding(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const genderSelect = document.getElementById('gender');
    const gender = genderSelect.options[genderSelect.selectedIndex].value;
    const age = parseInt(document.getElementById('age').value);
    
    // Age Validation
    if (age < 18) {
        ui.ageAlertModal.classList.add('visible');
        return;
    }
    
    // Update State
    state.user.name = fullName;
    state.user.gender = gender;
    state.user.age = age;
    state.user.isVerified = true;
    

    if (state.demographics[gender] !== undefined) {
        state.demographics[gender]++;
    }
    
  
    saveData();

    transitionToDashboard();
}

function transitionToDashboard() {

    ui.onboardingScreen.classList.remove('active');
  
    ui.displayName.textContent = state.user.name;
    ui.userAvatar.textContent = state.user.name.charAt(0).toUpperCase();
    
    updateDashboardUI();
    
    
    setTimeout(() => {
        ui.dashboardScreen.classList.add('active');
        initCharts(); // Initialize charts after container is visible
    }, 300);
}

function updateDashboardUI() {
    // 1. Calculate KPIs
    const totalPolls = state.polls.length;
    const activePolls = state.polls.filter(p => p.status === 'active').length;
    const totalVotes = state.polls.reduce((sum, p) => sum + p.totalVotes, 0);
    const engagementRatio = totalPolls > 0 ? Math.round((activePolls / totalPolls) * 100) : 0;
    
    ui.kpiTotalPolls.textContent = totalPolls;
    ui.kpiActivePolls.textContent = activePolls;
    ui.kpiTotalVotes.textContent = totalVotes;
    ui.kpiEngagement.textContent = `${engagementRatio}%`;
    
  
    ui.demoMale.textContent = state.demographics.Male;
    ui.demoFemale.textContent = state.demographics.Female;
    ui.demoOther.textContent = state.demographics.Other;
   
    renderPollsList();
    
    
    updateCharts();
}

function renderPollsList() {
    ui.pollsContainer.innerHTML = '';
    
    const activePolls = state.polls.filter(p => p.status === 'active');
    
    if (activePolls.length === 0) {
        ui.pollsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No active polls available.</p>';
        return;
    }
    
    activePolls.forEach(poll => {
        // Init userVotes if not exists
        poll.userVotes = poll.userVotes || {};
        const currentUserVotedOption = poll.userVotes[state.user.name];
        const hasVoted = !!currentUserVotedOption;
        
        const pollEl = document.createElement('div');
        pollEl.className = `poll-item ${hasVoted ? 'voted' : ''}`;
        
        let optionsHTML = '';
        poll.options.forEach(opt => {
            const percent = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
            const isSelected = currentUserVotedOption === opt.id;

            optionsHTML += `
                <button class="poll-option-btn ${hasVoted && isSelected ? 'selected' : ''}" 
                        onclick="castVote(${poll.id}, '${opt.id}')" 
                        ${hasVoted ? 'disabled' : ''}>
                    <div class="vote-bar" style="width: ${hasVoted ? percent : 0}%"></div>
                    <span class="option-text">${opt.text}</span>
                    <span class="option-percent">${percent}%</span>
                </button>
            `;
        });
        
        pollEl.innerHTML = `
            <div class="poll-question">${poll.question}</div>
            <div class="poll-options">
                ${optionsHTML}
            </div>
            <div class="poll-meta">
                <span>${poll.totalVotes} votes</span>
                <span>${hasVoted ? 'You voted' : 'Voting open'}</span>
            </div>
        `;
        
        ui.pollsContainer.appendChild(pollEl);
    });
}

window.castVote = function(pollId, optionId) {
    const poll = state.polls.find(p => p.id === pollId);
    if (!poll || poll.status !== 'active') return;
    
    
    poll.userVotes = poll.userVotes || {};
    if (poll.userVotes[state.user.name]) return;
    
    const option = poll.options.find(o => o.id === optionId);
    if (option) {
        option.votes++;
        poll.totalVotes++;
        
        poll.userVotes[state.user.name] = optionId;
        
        saveData(); 
        
        setTimeout(() => {
            updateDashboardUI();
        }, 150);
    }
};

function openCreatePollModal() { ui.createPollModal.classList.add('visible'); }
function closeCreatePollModal() { ui.createPollModal.classList.remove('visible'); }

function addPollOptionInput() {
    const currentOptions = ui.optionsGroup.querySelectorAll('.poll-option-input').length;
    if (currentOptions >= 6) { alert("Maximum 6 options allowed."); return; }
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'poll-option-input';
    input.placeholder = `Option ${currentOptions + 1}`;
    input.required = true;
    
    ui.optionsGroup.appendChild(input);
}

function handleCreatePoll(e) {
    e.preventDefault();
    
    const question = document.getElementById('pollQuestion').value.trim();
    const optionInputs = document.querySelectorAll('.poll-option-input');
    
    const options = Array.from(optionInputs).map((input, idx) => ({
        id: `opt${idx+1}`,
        text: input.value.trim(),
        votes: 0
    })).filter(opt => opt.text !== "");
    
    if (options.length < 2) {
        alert("Please provide at least 2 valid options.");
        return;
    }
    
    const newPoll = {
        id: Date.now(),
        question: question,
        options: options,
        totalVotes: 0,
        userVotes: {},
        status: "active"
    };
    
    
    state.polls.unshift(newPoll); 
    
    saveData(); 
    

    e.target.reset();
    closeCreatePollModal();
    

    const extraInputs = document.querySelectorAll('.poll-option-input');
    for (let i = 2; i < extraInputs.length; i++) extraInputs[i].remove();
    
    // Update view
    updateDashboardUI();
}

function openManagePollsModal() {
    renderManagePolls();
    ui.managePollsModal.classList.add('visible');
}

function closeManagePollsModal() {
    ui.managePollsModal.classList.remove('visible');
}

function renderManagePolls() {
    ui.managePollsContainer.innerHTML = '';
    
    if (state.polls.length === 0) {
        ui.managePollsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No polls created yet.</p>';
        return;
    }
    
    state.polls.forEach(poll => {
        const item = document.createElement('div');
        item.className = 'manage-poll-item';
        
        const isActive = poll.status === 'active';
        
        item.innerHTML = `
            <div class="manage-poll-info">
                <h4>${poll.question} <span class="status-badge ${isActive ? 'status-active' : 'status-closed'}">${isActive ? 'Active' : 'Closed'}</span></h4>
                <p>Total Votes: ${poll.totalVotes}</p>
            </div>
            <button class="btn btn-small ${isActive ? 'btn-outline' : 'btn-primary'}" onclick="togglePollStatus(${poll.id})">
                ${isActive ? 'Deactivate' : 'Activate'}
            </button>
        `;
        ui.managePollsContainer.appendChild(item);
    });
}

window.togglePollStatus = function(pollId) {
    const poll = state.polls.find(p => p.id === pollId);
    if (!poll) return;
    
    poll.status = poll.status === 'active' ? 'closed' : 'active';
    saveData();
    
    renderManagePolls(); 
    updateDashboardUI(); 
};


function initCharts() {
    
    Chart.defaults.color = '#8b92a5';
    Chart.defaults.font.family = 'Inter';
    
    const bgColors = ['#ffb822', '#20c997', '#8e54e9', '#ea868f', '#3366ff'];
    const borderColors = ['rgba(255, 184, 34, 0.8)', 'rgba(32, 201, 151, 0.8)', 'rgba(142, 84, 233, 0.8)'];

    
    const barCtx = document.getElementById('barChart').getContext('2d');
    
    defaultBarChart = new Chart(barCtx, {
        type: 'bar',
        data: getBarChartData(bgColors),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(21, 26, 40, 0.9)', titleColor: '#fff', padding: 10, cornerRadius: 8 }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(38, 44, 64, 0.5)' } },
                x: { grid: { display: false } }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
        }
    });
    
    
    const donutCtx = document.getElementById('doughnutChart').getContext('2d');
    
    defaultDoughnutChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: getDoughnutChartData(),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }
            },
            animation: { animateScale: true }
        }
    });
}

function updateCharts() {
    if (!defaultBarChart || !defaultDoughnutChart) return;
    
    const bgColors = ['#ffb822', '#20c997', '#8e54e9', '#ea868f', '#3366ff'];
    
    defaultBarChart.data = getBarChartData(bgColors);
    defaultBarChart.update();
    
    defaultDoughnutChart.data = getDoughnutChartData();
    defaultDoughnutChart.update();
}

function getBarChartData(bgColors) {
    const labels = state.polls.map(p => p.question.length > 20 ? p.question.substring(0, 17) + "..." : p.question);
    const data = state.polls.map(p => p.totalVotes);
    
    return {
        labels: labels,
        datasets: [{
            label: 'Total Votes',
            data: data,
            backgroundColor: bgColors.map(c => c + '33'), // 20% opacity
            borderColor: bgColors,
            borderWidth: 2,
            borderRadius: 6,
            barPercentage: 0.6
        }]
    };
}

function getDoughnutChartData() {
    const active = state.polls.filter(p => p.status === 'active').length;
    const closed = state.polls.filter(p => p.status === 'closed').length;
    
    return {
        labels: ['Active Polls', 'Closed Polls'],
        datasets: [{
            data: [active, closed],
            backgroundColor: ['#20c997', '#ea868f'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };
}
