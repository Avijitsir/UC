// --- Firebase Configuration ---
// আপনার ফায়ারবেস কনফিগারেশন এখানে বসান
const firebaseConfig = {
    apiKey: "AIzaSyDwGzTPmFg-gjoYtNWNJM47p22NfBugYFA",
    authDomain: "mock-test-1eea6.firebaseapp.com",
    databaseURL: "https://mock-test-1eea6-default-rtdb.firebaseio.com",
    projectId: "mock-test-1eea6",
    storageBucket: "mock-test-1eea6.firebaseapp.com",
    messagingSenderId: "111849173136",
    appId: "1:111849173136:web:8b211f58d854119e88a815",
    measurementId: "G-5RLWPTP8YD"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- DOM Elements ---
const quizIdInput = document.getElementById('quiz-id-input');
const quizTitleInput = document.getElementById('quiz-title-input');
const loadQuizBtn = document.getElementById('load-quiz-btn');
const questionSubjectSelect = document.getElementById('question-subject-select');

// Single Add Inputs
const questionTextInput = document.getElementById('question-text-input');
const option1Input = document.getElementById('option1-input');
const option2Input = document.getElementById('option2-input');
const option3Input = document.getElementById('option3-input');
const option4Input = document.getElementById('option4-input');
const correctOptionSelect = document.getElementById('correct-option-select');

// Buttons
const addQuestionBtn = document.getElementById('add-question-btn');
const updateQuestionBtn = document.getElementById('update-question-btn');
const saveQuizBtn = document.getElementById('save-quiz-btn');
const processBulkBtn = document.getElementById('process-bulk-btn');

// Lists & Bulk
const questionsContainer = document.getElementById('questions-container');
const bulkInputTextarea = document.getElementById('bulk-input-textarea');
const statusMessage = document.getElementById('status-message');
const shareLinkBox = document.getElementById('share-link-box');
const generatedLinkInput = document.getElementById('generated-link');

// State
let currentQuizQuestions = [];
let editingIndex = -1;

// --- Event Listeners ---
addQuestionBtn.addEventListener('click', addSingleQuestion);
updateQuestionBtn.addEventListener('click', updateSingleQuestion);
processBulkBtn.addEventListener('click', processBulkInput);
saveQuizBtn.addEventListener('click', saveToFirebase);
loadQuizBtn.addEventListener('click', loadFromFirebase);

// --- 1. Single Question Logic ---
function getFormData() {
    const subj = questionSubjectSelect.value;
    const qText = questionTextInput.value.trim();
    const o1 = option1Input.value.trim();
    const o2 = option2Input.value.trim();
    const o3 = option3Input.value.trim();
    const o4 = option4Input.value.trim();
    const correctIdx = correctOptionSelect.value;

    if (!qText || !o1 || !o2 || !o3 || !o4 || !correctIdx) {
        showStatus("সব তথ্য পূরণ করুন!", "error");
        return null;
    }

    const opts = [o1, o2, o3, o4];
    return {
        subject: subj,
        question: qText,
        options: opts,
        answer: opts[parseInt(correctIdx)] // Storing actual answer text
    };
}

function addSingleQuestion() {
    const data = getFormData();
    if (!data) return;
    currentQuizQuestions.push(data);
    renderList();
    clearForm();
    showStatus("প্রশ্ন যোগ হয়েছে!", "success");
}

function editQuestion(index) {
    const q = currentQuizQuestions[index];
    
    questionSubjectSelect.value = q.subject || "General Knowledge";
    questionTextInput.value = q.question;
    option1Input.value = q.options[0];
    option2Input.value = q.options[1];
    option3Input.value = q.options[2];
    option4Input.value = q.options[3];
    
    // Find correct index
    const cIdx = q.options.indexOf(q.answer);
    correctOptionSelect.value = cIdx > -1 ? cIdx : "";

    editingIndex = index;
    addQuestionBtn.style.display = 'none';
    updateQuestionBtn.style.display = 'block';
    document.getElementById('question-form').scrollIntoView({behavior: "smooth"});
}

function updateSingleQuestion() {
    const data = getFormData();
    if (!data) return;
    currentQuizQuestions[editingIndex] = data;
    editingIndex = -1;
    addQuestionBtn.style.display = 'block';
    updateQuestionBtn.style.display = 'none';
    renderList();
    clearForm();
    showStatus("আপডেট হয়েছে!", "success");
}

function deleteQuestion(index) {
    if (confirm("মুছে ফেলতে চান?")) {
        currentQuizQuestions.splice(index, 1);
        renderList();
    }
}

function clearForm() {
    questionTextInput.value = '';
    option1Input.value = '';
    option2Input.value = '';
    option3Input.value = '';
    option4Input.value = '';
    correctOptionSelect.value = '';
}

// --- 2. Bulk Add Logic (Updated Format) ---
function processBulkInput() {
    const rawText = bulkInputTextarea.value.trim();
    const selectedSubject = questionSubjectSelect.value; // Use global selector for bulk

    if (!rawText) {
        showStatus("বক্স খালি!", "error");
        return;
    }

    // Split by double newline (Empty line separator)
    const blocks = rawText.split(/\n\s*\n/);
    let addedCount = 0;
    let errorCount = 0;

    blocks.forEach((block, idx) => {
        // Split block into lines and remove empty ones
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l !== "");
        
        // We expect: Q, Opt1, Opt2, Opt3, Opt4, Answer: ... (At least 6 lines)
        if (lines.length >= 6) {
            const qText = lines[0];
            const opts = [lines[1], lines[2], lines[3], lines[4]];
            
            // Find answer line (starts with "Answer:")
            const ansLine = lines.find(l => l.toLowerCase().startsWith("answer:"));
            
            if (ansLine) {
                // Extract answer text (remove "Answer:" prefix)
                const ansText = ansLine.replace(/^answer:\s*/i, "").trim();
                
                // Verify answer exists in options
                if (opts.includes(ansText)) {
                    currentQuizQuestions.push({
                        subject: selectedSubject,
                        question: qText,
                        options: opts,
                        answer: ansText
                    });
                    addedCount++;
                } else {
                    console.warn(`Block ${idx+1}: Answer '${ansText}' not found in options.`);
                    errorCount++;
                }
            } else {
                console.warn(`Block ${idx+1}: 'Answer:' line missing.`);
                errorCount++;
            }
        } else {
            console.warn(`Block ${idx+1}: Not enough lines.`);
            errorCount++;
        }
    });

    if (addedCount > 0) {
        renderList();
        bulkInputTextarea.value = '';
        showStatus(`${addedCount} টি প্রশ্ন (${selectedSubject}) যোগ হয়েছে। ${errorCount > 0 ? errorCount + ' টি এরর।' : ''}`, "success");
    } else {
        showStatus("কোনো প্রশ্ন যোগ করা যায়নি। ফরম্যাট চেক করুন।", "error");
    }
}

// --- 3. Render List ---
function renderList() {
    questionsContainer.innerHTML = '';
    document.getElementById('questions-list-header').innerText = `৩. প্রশ্ন তালিকা (${currentQuizQuestions.length})`;

    currentQuizQuestions.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'q-card';
        
        let optsHtml = '';
        q.options.forEach(o => {
            const cls = (o === q.answer) ? 'class="correct"' : '';
            optsHtml += `<li ${cls}>${o}</li>`;
        });

        div.innerHTML = `
            <div class="q-header">
                <span class="subject-tag">${q.subject}</span>
                <div class="card-actions">
                    <span class="action-btn btn-edit" onclick="editQuestion(${i})"><span class="material-icons" style="font-size:16px;">edit</span></span>
                    <span class="action-btn btn-delete" onclick="deleteQuestion(${i})"><span class="material-icons" style="font-size:16px;">delete</span></span>
                </div>
            </div>
            <span class="q-text">Q${i+1}. ${q.question}</span>
            <ul class="q-options">${optsHtml}</ul>
        `;
        questionsContainer.appendChild(div);
    });
}

// --- 4. Firebase Operations ---
function saveToFirebase() {
    const id = quizIdInput.value.trim();
    const title = quizTitleInput.value.trim();

    if (!id || !title || currentQuizQuestions.length === 0) {
        showStatus("ID, Title এবং প্রশ্ন আবশ্যক!", "error");
        return;
    }

    showStatus("সেভ হচ্ছে...", "success");
    
    // Save quiz data
    database.ref('quizzes/' + id).set({
        title: title,
        questions: currentQuizQuestions
    }).then(() => {
        showStatus("সফল! কুইজ সেভ হয়েছে।", "success");
        generateLink(id);
    }).catch(e => showStatus("Error: " + e.message, "error"));
}

function loadFromFirebase() {
    const id = quizIdInput.value.trim();
    if (!id) { showStatus("Quiz ID দিন", "error"); return; }

    shareLinkBox.style.display = 'none';
    showStatus("লোড হচ্ছে...", "success");

    database.ref('quizzes/' + id).once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            quizTitleInput.value = data.title;
            currentQuizQuestions = data.questions || [];
            renderList();
            showStatus("ডেটা লোড হয়েছে!", "success");
        } else {
            showStatus("কুইজ পাওয়া যায়নি।", "error");
        }
    });
}

function generateLink(id) {
    const baseUrl = window.location.href.replace('admin.html', 'index.html');
    const link = `${baseUrl.split('?')[0]}?id=${id}`;
    generatedLinkInput.value = link;
    shareLinkBox.style.display = 'block';
    shareLinkBox.scrollIntoView({behavior:"smooth"});
}

function copyToClipboard() {
    generatedLinkInput.select();
    generatedLinkInput.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("লিংক কপি হয়েছে!");
}

function showStatus(msg, type) {
    statusMessage.innerText = msg;
    statusMessage.className = type;
    statusMessage.style.display = 'block';
    setTimeout(() => statusMessage.style.display = 'none', 3000);
}