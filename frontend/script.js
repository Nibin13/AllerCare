// ---------- MODULE NAVIGATION ----------
function showModule(moduleId) {
    // 1. Hide all modules and the dashboard
    const modules = document.querySelectorAll('.module');
    const dashboard = document.getElementById('dashboard');
    const header = document.getElementById('main-header');
    
    modules.forEach(mod => mod.style.display = 'none');
    dashboard.style.display = 'none';

    // 2. Show the selected module
    if (moduleId === 'dashboard') {
        dashboard.style.display = 'flex';
        header.style.display = 'block'; // Show header on dashboard
    } else {
        const selected = document.getElementById(moduleId);
        if (selected) {
            header.style.display = 'none'; // Hide header for full-screen module experience
            selected.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

// ---------- AUTHENTICATION (LOGIN & REGISTER) ----------

function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || "Invalid Credentials") });
        }
        return res.json();
    })
    .then(data => {
        // 1. Save data
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('userName', data.name);

        // 2. Debugging: Log to console to verify data is saved before moving on
        console.log("Session saved:", localStorage.getItem('userId'));

        // 3. IMPORTANT: Use window.location.replace instead of reload
        // This clears the 'login' state from the history and forces a fresh load
        window.location.replace("index.html"); 
    })
    .catch(error => {
        console.error("Login failed:", error);
        alert("Login Error: " + error.message);
    });
}

function register(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === 'Registration successful') {
            alert("Registration successful! Please login.");
            toggleAuth('login-card'); // Switch view to login
        } else {
            alert(data.error || "Registration failed.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Connection error. Is the backend running?');
    });
}

function logout() {
    localStorage.clear();
    alert("Logged out successfully!");
    window.location.reload();
}

function displayUser() {
    const userName = localStorage.getItem('userName');
    const welcomeContainer = document.getElementById('userWelcome');

    if (userName && welcomeContainer) {
        welcomeContainer.innerHTML = `
            <span><i class="fas fa-user-circle"></i> Welcome, <strong>${userName}</strong></span>
            <button onclick="logout()" class="logout-btn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        `;
    }
}

// ---------- AUTOCOMPLETE LOGIC ----------

function loadSuggestions() {
    fetch('http://127.0.0.1:5000/get_products')
        .then(res => res.json())
        .then(products => {
            const dataList = document.getElementById('productSuggestions');
            if (dataList) {
                dataList.innerHTML = '';
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product;
                    dataList.appendChild(option);
                });
            }
        })
        .catch(err => console.error("Error loading food suggestions:", err));
}

function loadSkincareSuggestions() {
    fetch('http://127.0.0.1:5000/get_skincare_meta')
        .then(res => res.json())
        .then(data => {
            const labelList = document.getElementById('labelSuggestions');
            const brandList = document.getElementById('brandSuggestions');
            
            if (labelList && brandList) {
                labelList.innerHTML = '';
                brandList.innerHTML = '';
                data.labels.forEach(l => {
                    let opt = document.createElement('option'); opt.value = l;
                    labelList.appendChild(opt);
                });
                data.brands.forEach(b => {
                    let opt = document.createElement('option'); opt.value = b;
                    brandList.appendChild(opt);
                });
            }
        })
        .catch(err => console.error("Error loading skincare metadata:", err));
}

// ---------- PREDICTION LOGIC ----------

function analyzeFood() {
    const productInput = document.getElementById('foodIngredients').value;
    const resultDisplay = document.getElementById('foodResult');
    const userId = localStorage.getItem('userId');

    if (!productInput.trim()) {
        alert("Please enter a product name to analyze.");
        return;
    }

    resultDisplay.innerHTML = '<div class="note"><i class="fas fa-spinner fa-spin"></i> Analyzing Ingredients...</div>';

    fetch('http://127.0.0.1:5000/predict_food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: productInput, user_id: userId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.risk_level) {
            let riskColor = data.risk_level === 'High' ? '#e74c3c' : (['Medium', 'Moderate'].includes(data.risk_level) ? '#f39c12' : '#2ecc71');
            resultDisplay.innerHTML = `
                <div class="result-card" style="border-top-color: ${riskColor}; animation: fadeIn 0.5s ease;">
                    <h3 style="color: ${riskColor};"><i class="fas fa-exclamation-triangle"></i> ${data.status}</h3>
                    <p><strong>Risk Level:</strong> ${data.risk_level}</p>
                    <p><strong>Detected Allergens:</strong> ${data.allergens || 'None'}</p>
                    <p><strong>💡 Solution:</strong> ${data.solutions || 'N/A'}</p>
                    <div class="note"><strong>🩺 Advice:</strong><br> ${data.medical_advice.replace(/\n/g, '<br>')}</div>
                </div>`;
        } else {
            resultDisplay.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
        }
    })
    .catch(err => resultDisplay.innerHTML = `<p style="color:orange;">Server connection failed.</p>`);
}

function analyzeSkincareV2() {
    const label = document.getElementById('skinLabel').value;
    const brand = document.getElementById('skinBrand').value;
    const resultDisplay = document.getElementById('skincareResult');

    if (!label || !brand) {
        alert("Please enter both Label and Brand.");
        return;
    }

    resultDisplay.innerHTML = '<div class="note"><i class="fas fa-spinner fa-spin"></i> Analyzing Brand Profile...</div>';

    fetch('http://127.0.0.1:5000/predict_skincare_v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label, brand: brand })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            resultDisplay.innerHTML = `<p style="color:red;">${data.error}</p>`;
            return;
        }
        let riskColor = data.risk_level === 'High' ? '#e74c3c' : (['Medium', 'Moderate'].includes(data.risk_level) ? '#f39c12' : '#2ecc71');
        resultDisplay.innerHTML = `
            <div class="result-card" style="border-top-color: ${riskColor}; animation: fadeIn 0.5s ease;">
                <h3 style="color: ${riskColor};"><i class="fas fa-pump-medical"></i> ${data.status}</h3>
                <p><strong>⚠️ Risk:</strong> ${data.risk_level} (${data.severity}/5)</p>
                <p><strong>🔍 Allergens:</strong> ${data.allergens}</p>
                <p><strong>🧪 High-Risk:</strong> ${data.most_allergic}</p>
                <div class="note"><strong>🩺 Advice:</strong><br>${data.medical_advice}</div>
            </div>`;
    })
    .catch(err => resultDisplay.innerHTML = `<p style="color:orange;">Server connection failed.</p>`);
}

function analyzeMedicineV2() {
    const medName = document.getElementById('medicineInput').value;
    const resultDisplay = document.getElementById('medicineResult');

    if (!medName.trim()) {
        alert("Please enter a medicine name.");
        return;
    }

    resultDisplay.innerHTML = '<div class="note"><i class="fas fa-spinner fa-spin"></i> Searching Database...</div>';

    fetch('http://127.0.0.1:5000/predict_medicine_v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine: medName })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            resultDisplay.innerHTML = `<p style="color:red;">${data.error}</p>`;
            return;
        }
        let riskColor = data.risk_level === 'High' ? '#e74c3c' : (['Moderate', 'Medium'].includes(data.risk_level) ? '#f39c12' : '#2ecc71');
        resultDisplay.innerHTML = `
            <div class="result-card" style="border-top-color: ${riskColor}; animation: fadeIn 0.5s ease;">
                <h3 style="color: ${riskColor};"><i class="fas fa-shield-virus"></i> ${data.status}</h3>
                <p><strong>⚠️ Risk Level:</strong> ${data.risk_level}</p>
                <p><strong>🔍 Known Allergens:</strong> ${data.allergens}</p>
                <div class="note"><strong>🩺 Advice:</strong><br>${data.medical_advice}</div>
            </div>`;
    })
    .catch(err => resultDisplay.innerHTML = `<p style="color:orange;">Server connection failed.</p>`);
}

// ---------- INITIALIZATION ----------
window.onload = function() {
    // Only load data if the user is already logged in
    if (localStorage.getItem('userId')) {
        displayUser();
        if (document.getElementById('productSuggestions')) loadSuggestions();
        if (document.getElementById('labelSuggestions')) loadSkincareSuggestions();
    }
};