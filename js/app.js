/**
 * Main Application Module cho ứng dụng Ôn tập Từ vựng Tiếng Nhật (jpd)
 * Quản lý trạng thái học, giao diện quiz, giao diện danh sách, lưu trữ cục bộ và phím tắt.
 */

// ==========================================
// TRẠNG THÁI ỨNG DỤNG (STATE)
// ==========================================
let allQuestions = [];
let selectedLesson = 'all'; // 'all', '4', '5', '6', '7'
let selectedPart = 'all'; // 'all', '1', '2', '3'

const STORAGE_KEY_MARKED = 'markedQuestions_jp_v2';
const STORAGE_KEY_LAST = 'lastMarkedQuestionId_jp_v2';
const STORAGE_KEY_MODE = 'quizMode_jp_v2';

let markedQuestions = JSON.parse(localStorage.getItem(STORAGE_KEY_MARKED) || '[]');
const savedLastMarkedId = localStorage.getItem(STORAGE_KEY_LAST);
let lastMarkedQuestionId = savedLastMarkedId !== null ? Number(savedLastMarkedId) : null;
let currentQuizMode = localStorage.getItem(STORAGE_KEY_MODE) || 'jp-vi';

let reviewQueue = [];
let currentQuestion = null;
let focusedListIndex = 0;

// Tham chiếu phần tử UI (sẽ khởi tạo khi DOM sẵn sàng)
let ui = {};

// ==========================================
// HÀM TIỆN ÍCH & LỌC CÂU HỎI
// ==========================================
function getFilteredQuestions() {
    return allQuestions.filter(q => {
        const matchLesson = (selectedLesson === 'all' || q.lesson === selectedLesson);
        const matchPart = (selectedPart === 'all' || q.part === selectedPart);
        return matchLesson && matchPart;
    });
}

function updateQuizModeUI() {
    document.querySelectorAll('.quiz-mode-btn').forEach(btn => {
        const mode = btn.getAttribute('data-mode');
        if (mode === currentQuizMode) {
            btn.className = "quiz-mode-btn px-3 py-1.5 text-xs md:text-sm font-bold rounded-md transition bg-blue-600 text-white shadow-sm";
        } else {
            btn.className = "quiz-mode-btn px-3 py-1.5 text-xs md:text-sm font-bold rounded-md transition text-gray-600 hover:text-blue-600 hover:bg-blue-50";
        }
    });
}

function updateQuestionDisplay() {
    if (!currentQuestion) return;
    const hideFurigana = document.getElementById('toggle-furigana')?.checked;

    if (currentQuestion.direction === 'jp-vi') {
        ui.question.innerText = hideFurigana 
            ? currentQuestion.prompt.replace(/\s*\([^)]+\)/g, '') 
            : currentQuestion.prompt;
    } else {
        ui.question.innerText = currentQuestion.prompt;
    }

    if (currentQuestion.direction === 'vi-jp') {
        document.querySelectorAll('#options-container label').forEach((lbl, idx) => {
            const span = lbl.querySelector('.option-text');
            const rawOpt = currentQuestion.options[idx];
            if (span && rawOpt) {
                span.innerText = hideFurigana 
                    ? rawOpt.replace(/\s*\([^)]+\)/g, '') 
                    : rawOpt;
            }
        });
    }
}

// ==========================================
// QUẢN LÝ TIẾN ĐỘ ĐÃ HỌC (MARKED QUESTIONS)
// ==========================================
function updateLastMarkedQuestion(id) {
    if (id === null || id === undefined || Number.isNaN(Number(id))) return;
    lastMarkedQuestionId = Number(id);
    localStorage.setItem(STORAGE_KEY_LAST, String(lastMarkedQuestionId));
}

function clearLastMarkedQuestion() {
    lastMarkedQuestionId = null;
    localStorage.removeItem(STORAGE_KEY_LAST);
}

function getMostRecentMarkedQuestionId() {
    let latestIndex = -1;
    let latestId = null;
    allQuestions.forEach((q, idx) => {
        if (markedQuestions.includes(q.id) && idx > latestIndex) {
            latestIndex = idx;
            latestId = q.id;
        }
    });
    return latestId;
}

function syncLastMarkedQuestionFromSelection() {
    const latestId = getMostRecentMarkedQuestionId();
    if (latestId !== null) {
        updateLastMarkedQuestion(latestId);
        return;
    }

    // Giữ lại lịch sử câu gần nhất đã chọn trước đó, ngay cả khi danh sách hiện tại đang rỗng.
    if (lastMarkedQuestionId === null) {
        clearLastMarkedQuestion();
    }
}

function getTargetLastQuestionId() {
    const latestCurrentId = getMostRecentMarkedQuestionId();
    if (latestCurrentId !== null) return latestCurrentId;

    if (lastMarkedQuestionId !== null && allQuestions.some(q => q.id === lastMarkedQuestionId)) {
        return lastMarkedQuestionId;
    }

    return null;
}

function updateFocus() {
    const listItems = document.querySelectorAll('#questions-list-container > div');
    listItems.forEach((item, idx) => {
        if (idx === focusedListIndex) {
            item.classList.add('ring-4', 'ring-blue-400', 'border-blue-400', 'bg-blue-50');
            item.classList.remove('border', 'bg-gray-50');
        } else {
            item.classList.remove('ring-4', 'ring-blue-400', 'border-blue-400', 'bg-blue-50');
            item.classList.add('border', 'bg-gray-50');
        }
    });
}

function activateListItem(index, moveToNext = true) {
    const listItems = document.querySelectorAll('#questions-list-container > div');
    if (!listItems[index]) return;

    focusedListIndex = index;
    updateFocus();

    const cb = listItems[index].querySelector('.mark-checkbox');
    if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
    }

    if (moveToNext && index < listItems.length - 1) {
        focusedListIndex = index + 1;
        updateFocus();
        listItems[focusedListIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function scrollToLastLearned() {
    const targetId = getTargetLastQuestionId();
    if (targetId === null) {
        alert('Bạn chưa đánh dấu câu nào là đã học!');
        return;
    }

    const target = document.querySelector(`[data-qid="${targetId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-4', 'ring-amber-400', 'border-amber-400');
    setTimeout(() => {
        target.classList.remove('ring-4', 'ring-amber-400', 'border-amber-400');
    }, 2000);
}

function updateSelectAllButtonState() {
    const btn = document.getElementById('select-all-btn');
    if (!btn) return;
    const filtered = getFilteredQuestions();
    const allSelected = filtered.length > 0 && filtered.every(q => markedQuestions.includes(q.id));
    btn.disabled = allSelected;
    btn.classList.toggle('opacity-50', allSelected);
    btn.classList.toggle('cursor-not-allowed', allSelected);
}

// ==========================================
// MÀN HÌNH DANH SÁCH (LIST VIEW)
// ==========================================
function renderListScreen() {
    const filtered = getFilteredQuestions();
    ui.totalQuestions.innerText = filtered.length;
    const markedInFilter = markedQuestions.filter(id => filtered.some(q => q.id === id));
    ui.selectedCount.innerText = markedInFilter.length;
    const container = document.getElementById('questions-list-container');
    container.innerHTML = '';
    
    filtered.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = "p-4 border rounded-lg bg-gray-50 shadow-sm transition-all";
        qDiv.setAttribute('data-qid', q.id);
        
        const isMarked = markedQuestions.includes(q.id);
        
        const header = document.createElement('div');
        header.className = "flex justify-between items-start gap-4 mb-3";
        header.innerHTML = `
            <div class="flex items-start gap-3 flex-1">
                <span class="inline-flex items-center justify-center min-w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm shadow-sm">
                    ${index + 1}
                </span>
                <div class="flex-1">
                    <span class="inline-block text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 mb-1">Bài ${q.lesson}${q.partTitle ? ` • Phần ${q.part}: ${q.partTitle}` : (q.part !== 'all' ? ` • Phần ${q.part}` : '')}</span>
                    <h3 class="font-bold text-gray-800 whitespace-pre-wrap">${q.question}</h3>
                </div>
            </div>
            <label class="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border rounded shadow-sm hover:bg-blue-50 transition">
                <input type="checkbox" class="mark-checkbox w-4 h-4 accent-blue-600" data-id="${q.id}" ${isMarked ? 'checked' : ''}>
                <span class="text-sm font-bold text-gray-700">Đã học</span>
            </label>
        `;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = "space-y-2";
        q.options.forEach(opt => {
            const isCorrect = q.correct.includes(opt);
            const optDiv = document.createElement('div');
            optDiv.className = `p-3 rounded-lg ${isCorrect ? 'bg-green-100 font-bold border border-green-400 text-green-800' : 'bg-white border border-gray-200 text-gray-600'}`;
            optDiv.innerHTML = `${isCorrect ? '✅ ' : '⬜ '}${opt}`;
            optionsDiv.appendChild(optDiv);
        });
        
        qDiv.appendChild(header);
        qDiv.appendChild(optionsDiv);
        qDiv.addEventListener('click', (event) => {
            if (event.target.closest('.mark-checkbox')) return;
            const itemIndex = Array.from(container.children).indexOf(qDiv);
            focusedListIndex = itemIndex;
            updateFocus();
            const cb = qDiv.querySelector('.mark-checkbox');
            if (cb) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change'));
            }
        });
        container.appendChild(qDiv);
    });
    
    document.querySelectorAll('.mark-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            if (e.target.checked) {
                if (!markedQuestions.includes(id)) markedQuestions.push(id);
                updateLastMarkedQuestion(id);
            } else {
                markedQuestions = markedQuestions.filter(mId => mId !== id);
                syncLastMarkedQuestionFromSelection();
            }
            localStorage.setItem(STORAGE_KEY_MARKED, JSON.stringify(markedQuestions));
            ui.selectedCount.innerText = markedQuestions.length;
            updateSelectAllButtonState();
        });
    });

    updateSelectAllButtonState();
    focusedListIndex = 0;
    updateFocus();
}

// ==========================================
// CHỨC NĂNG HỌC & TẠO CÂU HỎI (QUIZ)
// ==========================================
function getJapaneseDistractors(baseQ, candidatePool, count = 3) {
    const isDifferent = item => 
        item.question !== baseQ.question && 
        item.correct[0] !== baseQ.correct[0];

    let pool = candidatePool.filter(isDifferent);

    if (pool.length < count) {
        const sameLesson = allQuestions.filter(item => item.lesson === baseQ.lesson && isDifferent(item));
        pool = [...pool, ...sameLesson];
    }

    if (pool.length < count) {
        const any = allQuestions.filter(isDifferent);
        pool = [...pool, ...any];
    }

    const seen = new Set();
    const uniquePool = [];
    for (const item of pool) {
        if (!seen.has(item.question)) {
            seen.add(item.question);
            uniquePool.push(item);
        }
    }

    uniquePool.sort(() => Math.random() - 0.5);
    return uniquePool.slice(0, count).map(item => item.question);
}

function createQuizItem(baseQ, direction, candidatePool) {
    if (direction === 'vi-jp') {
        const distractors = getJapaneseDistractors(baseQ, candidatePool, 3);
        const options = [baseQ.question, ...distractors].sort(() => Math.random() - 0.5);
        return {
            id: baseQ.id,
            direction: 'vi-jp',
            prompt: baseQ.correct[0],
            options: options,
            correct: [baseQ.question],
            lesson: baseQ.lesson,
            part: baseQ.part,
            partTitle: baseQ.partTitle,
            type: 'radio',
            correctJapanese: baseQ.question,
            correctVietnamese: baseQ.correct[0],
            baseQ: baseQ
        };
    } else {
        return {
            id: baseQ.id,
            direction: 'jp-vi',
            prompt: baseQ.question,
            options: [...baseQ.options].sort(() => Math.random() - 0.5),
            correct: [...baseQ.correct],
            lesson: baseQ.lesson,
            part: baseQ.part,
            partTitle: baseQ.partTitle,
            type: baseQ.type,
            correctJapanese: baseQ.question,
            correctVietnamese: baseQ.correct[0],
            baseQ: baseQ
        };
    }
}

function startQuiz() {
    const filtered = getFilteredQuestions();
    let questionsToLearn = filtered;
    if (markedQuestions.length > 0) {
        const markedInFilter = filtered.filter(q => markedQuestions.includes(q.id));
        if (markedInFilter.length > 0) {
            questionsToLearn = markedInFilter;
        }
    }

    if (questionsToLearn.length === 0) {
        ui.listScreen.classList.add('hidden');
        ui.quizScreen.classList.remove('hidden');
        ui.question.innerHTML = "Không có câu hỏi nào trong mục này.";
        ui.options.innerHTML = "";
        ui.skipBtn.style.display = "none";
        ui.progress.style.display = "none";
        if (ui.directionBadge) ui.directionBadge.style.display = "none";
        if (ui.qTypeBadge) ui.qTypeBadge.style.display = "none";
        ui.feedback.classList.add('hidden');
        ui.nextBtn.classList.add('hidden');
        return;
    }

    const candidatePool = filtered.length >= 4 ? filtered : allQuestions;

    const items = questionsToLearn.map(baseQ => {
        let dir = currentQuizMode;
        if (dir === 'mix') {
            dir = Math.random() < 0.5 ? 'jp-vi' : 'vi-jp';
        }
        return createQuizItem(baseQ, dir, candidatePool);
    });

    reviewQueue = items.sort(() => Math.random() - 0.5);
    
    ui.listScreen.classList.add('hidden');
    ui.quizScreen.classList.remove('hidden');
    
    ui.options.innerHTML = "";
    ui.feedback.classList.add('hidden');
    ui.nextBtn.classList.add('hidden');
    ui.skipBtn.style.display = "";
    ui.skipBtn.classList.remove('hidden');
    ui.progress.style.display = "";
    if (ui.directionBadge) ui.directionBadge.style.display = "";
    if (ui.qTypeBadge) ui.qTypeBadge.style.display = "";
    
    loadNextQuestion();
}

function loadNextQuestion() {
    if (reviewQueue.length === 0) {
        ui.question.innerHTML = "🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ bài ôn tập.";
        ui.options.innerHTML = "";
        ui.skipBtn.style.display = "none";
        ui.progress.style.display = "none";
        if (ui.directionBadge) ui.directionBadge.style.display = "none";
        if (ui.qTypeBadge) ui.qTypeBadge.style.display = "none";
        return;
    }

    currentQuestion = reviewQueue[0];
    ui.progress.innerText = `Còn ${reviewQueue.length} câu`;
    
    const lessonBadge = document.getElementById('lesson-badge');
    if (lessonBadge) {
        const partInfo = currentQuestion.partTitle 
            ? ` • Phần ${currentQuestion.part}: ${currentQuestion.partTitle}` 
            : (currentQuestion.part !== 'all' ? ` • Phần ${currentQuestion.part}` : '');
        lessonBadge.innerText = `Bài ${currentQuestion.lesson}${partInfo}`;
    }

    if (ui.directionBadge) {
        ui.directionBadge.style.display = "";
        if (currentQuestion.direction === 'vi-jp') {
            ui.directionBadge.className = "text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full inline-flex items-center gap-1 border border-emerald-300";
            ui.directionBadge.innerHTML = "<span>🇻🇳 ➔ 🇯🇵</span><span>Chọn từ tiếng Nhật tương ứng</span>";
        } else {
            ui.directionBadge.className = "text-xs font-bold px-3 py-1 bg-blue-100 text-blue-800 rounded-full inline-flex items-center gap-1 border border-blue-200";
            ui.directionBadge.innerHTML = "<span>🇯🇵 ➔ 🇻🇳</span><span>Chọn nghĩa tiếng Việt của từ này</span>";
        }
    }

    if (currentQuestion.type === 'checkbox') {
        ui.qTypeBadge.classList.remove('hidden');
        ui.qTypeBadge.innerText = `CHỌN ${currentQuestion.correct.length} ĐÁP ÁN`;
    } else {
        ui.qTypeBadge.classList.add('hidden');
    }
    
    ui.options.innerHTML = "";
    const hideFurigana = document.getElementById('toggle-furigana')?.checked;

    currentQuestion.options.forEach((opt, index) => {
        const label = document.createElement('label');
        label.className = "flex items-start p-4 border-2 border-gray-100 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition";
        const inputType = currentQuestion.type;
        const inputClass = inputType === 'radio' ? 'rounded-full' : 'rounded';

        const displayOptText = (currentQuestion.direction === 'vi-jp' && hideFurigana)
            ? opt.replace(/\s*\([^)]+\)/g, '')
            : opt;

        label.innerHTML = `
            <input type="${inputType}" name="answer" value="${opt.replace(/"/g, '&quot;')}" class="mt-1 mr-4 w-5 h-5 cursor-pointer accent-blue-600 ${inputClass}">
            <span class="text-gray-700 font-medium">
                <span class="inline-flex items-center justify-center w-6 h-6 mr-2 text-xs font-bold text-gray-500 bg-gray-200 rounded shadow-sm">${index + 1}</span>
                <span class="option-text">${displayOptText}</span>
            </span>
        `;
        ui.options.appendChild(label);
    });

    updateQuestionDisplay();

    // Tự động kiểm tra đáp án khi người dùng chọn
    document.querySelectorAll('input[name="answer"]').forEach(input => {
        input.addEventListener('change', () => {
            const selectedCount = document.querySelectorAll('input[name="answer"]:checked').length;
            if (currentQuestion.type === 'radio') {
                checkAnswer();
            } else if (currentQuestion.type === 'checkbox') {
                if (selectedCount === currentQuestion.correct.length) {
                    checkAnswer();
                }
            }
        });
    });

    ui.feedback.classList.add('hidden');
    ui.nextBtn.classList.add('hidden');
    ui.skipBtn.classList.remove('hidden');
}

function checkAnswer() {
    const selectedNodes = document.querySelectorAll('input[name="answer"]:checked');
    const selected = Array.from(selectedNodes).map(el => el.value);
    
    const isCorrect = selected.length === currentQuestion.correct.length && 
                      selected.every(val => currentQuestion.correct.includes(val));

    ui.skipBtn.classList.add('hidden');
    ui.feedback.classList.remove('hidden');
    ui.nextBtn.classList.remove('hidden');

    document.querySelectorAll('input[name="answer"]').forEach(inp => inp.disabled = true);
    selectedNodes.forEach(node => {
        node.parentElement.classList.add('bg-gray-100');
    });

    if (isCorrect) {
        ui.feedback.className = "mt-6 p-5 rounded-lg bg-green-50 text-green-800 border-2 border-green-200";
        ui.feedbackTitle.innerText = "✅ Chính xác!";
        ui.feedbackText.innerHTML = `
            <div class="mt-1 flex items-baseline gap-2 flex-wrap">
                <span class="text-xl font-bold text-green-900">${currentQuestion.correctJapanese}</span>
                <span class="text-gray-400">•</span>
                <span class="text-base font-semibold text-green-800">${currentQuestion.correctVietnamese}</span>
            </div>
            <p class="text-xs text-green-600 mt-2 font-normal">Tuyệt vời, câu này sẽ không lặp lại nữa.</p>
        `;
        reviewQueue.shift(); 
    } else {
        ui.feedback.className = "mt-6 p-5 rounded-lg bg-red-50 text-red-800 border-2 border-red-200";
        ui.feedbackTitle.innerText = "❌ Sai rồi! Đáp án đúng:";
        ui.feedbackText.innerHTML = `
            <div class="mt-2 p-3 bg-white rounded-lg border border-red-200 shadow-sm">
                <div class="text-xl font-bold text-red-900 mb-1">${currentQuestion.correctJapanese}</div>
                <div class="text-sm font-semibold text-gray-700">Nghĩa: <span class="text-red-700 font-bold">${currentQuestion.correctVietnamese}</span></div>
            </div>
            <p class="text-xs text-red-600 mt-2 font-normal">Câu này sẽ lặp lại ở cuối danh sách để bạn luyện tập.</p>
        `;
        
        const failedItem = reviewQueue.shift();
        reviewQueue.push(failedItem);
    }
}

function handleNextAction() {
    if (!ui.feedback.classList.contains('hidden')) {
        ui.nextBtn.click();
    } else if (!ui.skipBtn.classList.contains('hidden')) {
        ui.skipBtn.click();
    }
}

// ==========================================
// TABS & BỘ LỌC BÀI HỌC / PHẦN
// ==========================================
function updateLessonCounts() {
    document.querySelectorAll('.lesson-tab').forEach(tab => {
        const les = tab.getAttribute('data-lesson');
        let count;
        if (les === 'all') {
            count = allQuestions.length;
        } else {
            count = allQuestions.filter(q => q.lesson === les).length;
        }
        const label = les === 'all' ? 'Tất cả' : `Bài ${les}`;
        tab.textContent = `${label} (${count})`;
    });
}

function renderPartTabs() {
    const container = document.getElementById('part-tabs');
    if (!container) return;
    container.innerHTML = '';

    const parts = ['all', '1', '2', '3'];
    parts.forEach(p => {
        let label = '';
        let count = 0;
        if (p === 'all') {
            label = 'Tất cả phần';
            count = allQuestions.filter(q => selectedLesson === 'all' || q.lesson === selectedLesson).length;
        } else {
            const title = (selectedLesson !== 'all' && LESSON_PARTS[selectedLesson]?.[p])
                ? `: ${LESSON_PARTS[selectedLesson][p]}`
                : '';
            label = `Phần ${p}${title}`;
            count = allQuestions.filter(q => (selectedLesson === 'all' || q.lesson === selectedLesson) && q.part === p).length;
        }

        const btn = document.createElement('button');
        btn.setAttribute('data-part', p);
        const isActive = selectedPart === p;
        btn.className = `part-tab px-3.5 py-1.5 rounded-full font-semibold text-xs md:text-sm shadow-sm transition border-2 ${
            isActive 
                ? 'border-emerald-600 bg-emerald-600 text-white shadow' 
                : 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
        }`;
        btn.textContent = `${label} (${count})`;

        btn.addEventListener('click', () => {
            selectedPart = p;
            renderPartTabs();
            if (!ui.listScreen.classList.contains('hidden')) {
                renderListScreen();
            } else {
                startQuiz();
            }
        });

        container.appendChild(btn);
    });
}

// ==========================================
// KHỞI TẠO ỨNG DỤNG & SỰ KIỆN
// ==========================================
function initApp() {
    // 1. Ánh xạ các phần tử giao diện
    ui = {
        loadingScreen: document.getElementById('loading-screen'),
        quizScreen: document.getElementById('quiz-screen'),
        listScreen: document.getElementById('list-screen'),
        totalQuestions: document.getElementById('total-questions'),
        selectedCount: document.getElementById('selected-count'),
        navList: document.getElementById('nav-list'),
        navQuiz: document.getElementById('nav-quiz'),
        progress: document.getElementById('progress'),
        qTypeBadge: document.getElementById('question-type-badge'),
        directionBadge: document.getElementById('direction-badge'),
        question: document.getElementById('question-text'),
        options: document.getElementById('options-container'),
        skipBtn: document.getElementById('skip-btn'),
        feedback: document.getElementById('feedback'),
        feedbackTitle: document.getElementById('feedback-title'),
        feedbackText: document.getElementById('feedback-text'),
        nextBtn: document.getElementById('next-btn'),
    };

    // 2. Nạp dữ liệu từ window.RAW_DATABASE hoặc thẻ <script id="database">
    const rawData = window.RAW_DATABASE || document.getElementById('database')?.textContent || '';
    allQuestions = parseRawText(rawData);
    
    if (allQuestions.length === 0) {
        ui.loadingScreen.innerText = "❌ Lỗi: Không tìm thấy dữ liệu câu hỏi. Hãy kiểm tra lại file code!";
        return;
    }

    // 3. Sự kiện chuyển đổi màn hình Quiz / Danh sách
    ui.navQuiz.addEventListener('click', () => {
        ui.navQuiz.className = "px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md transition";
        ui.navList.className = "px-6 py-2 bg-white text-blue-600 rounded-lg font-bold shadow-md hover:bg-blue-50 transition";
        startQuiz();
    });

    ui.navList.addEventListener('click', () => {
        ui.navList.className = "px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md transition";
        ui.navQuiz.className = "px-6 py-2 bg-white text-blue-600 rounded-lg font-bold shadow-md hover:bg-blue-50 transition";
        ui.quizScreen.classList.add('hidden');
        ui.listScreen.classList.remove('hidden');
        renderListScreen();
    });

    // 4. Sự kiện chọn chế độ hỏi (Nhật-Việt, Việt-Nhật, Trộn)
    document.querySelectorAll('.quiz-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            if (mode && mode !== currentQuizMode) {
                currentQuizMode = mode;
                localStorage.setItem(STORAGE_KEY_MODE, currentQuizMode);
                updateQuizModeUI();
                startQuiz();
            }
        });
    });

    // 5. Sự kiện Furigana
    document.getElementById('toggle-furigana')?.addEventListener('change', () => {
        updateQuestionDisplay();
    });

    // 6. Sự kiện các nút chức năng trong Quiz
    ui.nextBtn.onclick = () => loadNextQuestion();
    ui.skipBtn.onclick = () => {
        const skippedItem = reviewQueue.shift();
        reviewQueue.push(skippedItem);
        loadNextQuestion();
    };

    // 7. Sự kiện các tab bài học
    document.querySelectorAll('.lesson-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            selectedLesson = tab.getAttribute('data-lesson');
            selectedPart = 'all';
            document.querySelectorAll('.lesson-tab').forEach(t => {
                if (t.getAttribute('data-lesson') === selectedLesson) {
                    t.className = 'lesson-tab px-4 py-1.5 rounded-full font-bold text-sm shadow-sm transition border-2 border-indigo-500 bg-indigo-500 text-white';
                } else {
                    t.className = 'lesson-tab px-4 py-1.5 rounded-full font-bold text-sm shadow-sm transition border-2 border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50';
                }
            });
            updateLessonCounts();
            renderPartTabs();
            if (!ui.listScreen.classList.contains('hidden')) {
                renderListScreen();
            } else {
                startQuiz();
            }
        });
    });

    // 8. Sự kiện các nút hành động trong Màn hình danh sách
    document.getElementById('scroll-last-btn')?.addEventListener('click', () => {
        scrollToLastLearned();
    });

    document.getElementById('select-all-btn')?.addEventListener('click', () => {
        const filtered = getFilteredQuestions();
        if (filtered.length === 0) return;
        filtered.forEach(q => {
            if (!markedQuestions.includes(q.id)) markedQuestions.push(q.id);
        });
        updateLastMarkedQuestion(filtered[filtered.length - 1]?.id ?? null);
        localStorage.setItem(STORAGE_KEY_MARKED, JSON.stringify(markedQuestions));
        renderListScreen();
    });

    document.getElementById('clear-all-btn')?.addEventListener('click', () => {
        const filtered = getFilteredQuestions();
        const filteredIds = filtered.map(q => q.id);
        const previousLastQuestionId = getTargetLastQuestionId();
        markedQuestions = markedQuestions.filter(id => !filteredIds.includes(id));
        if (previousLastQuestionId !== null) {
            updateLastMarkedQuestion(previousLastQuestionId);
        } else {
            clearLastMarkedQuestion();
        }
        localStorage.setItem(STORAGE_KEY_MARKED, JSON.stringify(markedQuestions));
        renderListScreen();
    });

    // 9. Nút cuộn về đầu trang
    const backToTopBtn = document.getElementById('back-to-top-btn');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (!ui.listScreen.classList.contains('hidden')) {
                if (window.scrollY > 300) {
                    backToTopBtn.classList.remove('hidden');
                } else {
                    backToTopBtn.classList.add('hidden');
                }
            } else {
                backToTopBtn.classList.add('hidden');
            }
        });
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 10. Xử lý chuột phụ (Back / Forward side buttons)
    document.addEventListener('mousedown', (e) => {
        if (e.button === 3) {
            e.preventDefault();
            ui.skipBtn.click();
            return;
        }
        if (e.button === 4 || e.button === 5) {
            e.preventDefault();
            handleNextAction();
        }
    });

    // 11. Xử lý phím tắt
    document.addEventListener('keydown', (e) => {
        // Trong màn hình danh sách
        if (!ui.listScreen.classList.contains('hidden')) {
            const listItems = document.querySelectorAll('#questions-list-container > div');
            if (listItems.length === 0) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                activateListItem(focusedListIndex, true);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (focusedListIndex < listItems.length - 1) {
                    focusedListIndex++;
                    updateFocus();
                    listItems[focusedListIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (focusedListIndex > 0) {
                    focusedListIndex--;
                    updateFocus();
                    listItems[focusedListIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            return;
        }

        // Trong màn hình Quiz
        if (!ui.quizScreen.classList.contains('hidden')) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                handleNextAction();
            }

            if (e.key >= '1' && e.key <= '9') {
                if (ui.feedback.classList.contains('hidden')) {
                    const index = parseInt(e.key) - 1;
                    const inputs = document.querySelectorAll('input[name="answer"]');
                    if (index >= 0 && index < inputs.length) {
                        const input = inputs[index];
                        if (input.type === 'radio') {
                            input.checked = true;
                            input.dispatchEvent(new Event('change'));
                        } else if (input.type === 'checkbox') {
                            input.checked = !input.checked;
                            input.dispatchEvent(new Event('change'));
                        }
                    }
                }
            }
        }
    });

    // 12. Cập nhật giao diện ban đầu và bắt đầu học
    updateQuizModeUI();
    updateLessonCounts();
    renderPartTabs();
    ui.loadingScreen.classList.add('hidden');
    startQuiz();
}

// Chạy ứng dụng khi DOM tải xong
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
