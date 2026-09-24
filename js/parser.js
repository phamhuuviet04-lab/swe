/**
 * Parser Module cho ứng dụng Ôn tập Từ vựng Tiếng Nhật (jpd)
 * Chịu trách nhiệm bóc tách dữ liệu văn bản thô thành danh sách câu hỏi có cấu trúc.
 */

const LESSON_PARTS = {
    "1": { "1": "私の名前・国・仕事", "2": "私の誕生日", "3": "私の趣味" },
    "2": { "1": "どこですか", "2": "いくらですか", "3": "レストラン" },
    "3": { "1": "何時までですか", "2": "私のスケジュール", "3": "どんな毎日？" },
    "4": { "1": "どこ？", "2": "どんなところ？", "3": "季節・料理" },
    "5": { "1": "週末", "2": "休みの後で", "3": "今度の休みに" },
    "6": { "1": "一緒に行きませんか", "2": "どちらがいいですか。", "3": "約束" },
    "7": { "1": "道がわかりません", "2": "パーティーの準備", "3": "みんなで楽しいパーティー" },
    "8": { "1": "家族・友達", "2": "こんな人", "3": "プレゼント" },
    "9": { "1": "いろいろな趣味", "2": "できること・できないこと", "3": "楽しい週末" },
    "10": { "1": "私の集合", "2": "いろいろな注意", "3": "動物園で" },
    "11": { "1": "今の生活", "2": "私・前の私", "3": "友達と" },
    "12": { "1": "体の調子", "2": "アドバイス", "3": "病院で" },
    "13": { "1": "私の経験から", "2": "おすすめします", "3": "教えてください" },
    "14": { "1": "初めて見た！初めて聞いた！", "2": "ルール・マナー", "3": "私の意見" },
    "15": { "1": "これ、知ってる？", "2": "雑誌を見て町へ", "3": "町を歩いて" }
};

// Mảng chứa các câu lỗi để chẩn đoán khi cần
window.__parseFailed = [];

/**
 * Phân tích dữ liệu văn bản thô thành danh sách câu hỏi
 * @param {string} text - Văn bản chứa các câu hỏi thô
 * @returns {Array<Object>} Danh sách câu hỏi đã chuẩn hóa
 */
function parseRawText(text) {
    const safeText = '\n' + (text || '');

    // Tách block + giữ lại số câu
    const splitRegex = /\n\s*(?:Câu|Cau)\s*(\d+)/gi;
    const questionNumbers = [];
    let m;
    while ((m = splitRegex.exec(safeText)) !== null) {
        questionNumbers.push(parseInt(m[1]));
    }

    const blocks = safeText.split(/\n\s*(?:Câu|Cau)\s*\d+/i).filter(b => b.trim());
    const questions = [];
    window.__parseFailed = [];

    blocks.forEach((block, blockIndex) => {
        const qNum = questionNumbers[blockIndex] || ('?#' + blockIndex);
        const lines = block.split('\n').map(l => l.trim()).filter(l => l && !l.includes('────'));
        let questionText = "";
        const options = [];
        const correctOptionsText = [];
        
        let fallbackAnswers = [];
        const ansLineStr = lines.find(l => l.match(/Đáp án:\s*([A-Z,\s]+)/i));
        if (ansLineStr) {
            const matchAns = ansLineStr.match(/Đáp án:\s*([A-Z,\s]+)/i);
            if (matchAns && matchAns[1]) {
                fallbackAnswers = matchAns[1].split(',').map(s => s.trim().toUpperCase());
            }
        }

        let parsingOptions = false;
        let currentOptionStr = "";
        let currentOptionLetter = "";
        let isCurrentCorrect = false;
        const optionRegex = /^([A-Z])\s*[\.\)]\s*(.*)/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/Đáp án:/i) || line.match(/^\[MULTI-SELECT\]/i) || line.match(/^\[TRUE\/FALSE\]/i)) continue;

            const match = line.match(optionRegex);
            if (match) {
                parsingOptions = true;
                if (currentOptionStr) {
                    let cleanOpt = currentOptionStr.replace(/✓/g, '').trim();
                    options.push(cleanOpt);
                    if (isCurrentCorrect || fallbackAnswers.includes(currentOptionLetter)) correctOptionsText.push(cleanOpt);
                }
                currentOptionLetter = match[1].toUpperCase();
                currentOptionStr = match[2];
                isCurrentCorrect = line.includes('✓');
            } else {
                if (!parsingOptions) {
                    questionText += (questionText ? "\n" : "") + line;
                } else {
                    currentOptionStr += " " + line;
                    if (line.includes('✓')) isCurrentCorrect = true;
                }
            }
        }

        if (currentOptionStr) {
            let cleanOpt = currentOptionStr.replace(/✓/g, '').trim();
            options.push(cleanOpt);
            if (isCurrentCorrect || fallbackAnswers.includes(currentOptionLetter)) correctOptionsText.push(cleanOpt);
        }

        const uniqueCorrect = [...new Set(correctOptionsText)];

        if (options.length > 1 && uniqueCorrect.length > 0) {
            // Trích xuất Bài và Phần ví dụ [BÀI 4 - PHẦN 1: どこ？] hoặc [BÀI 4 - PHẦN 1] hoặc [BÀI 4]
            let lesson = 'all';
            let part = 'all';
            let partTitle = '';

            const tagMatch = questionText.match(/\[BÀI\s*(\d+)(?:\s*-\s*PHẦN\s*(\d+)(?::\s*([^\]]+))?)?\]/i);
            if (tagMatch) {
                lesson = tagMatch[1];
                if (tagMatch[2]) part = tagMatch[2];
                if (tagMatch[3]) partTitle = tagMatch[3].trim();
            } else {
                const lMatch = questionText.match(/\[BÀI\s*(\d+)\]/i);
                if (lMatch) lesson = lMatch[1];
                const pMatch = questionText.match(/\[(?:PHẦN|P)\s*(\d+)\]/i);
                if (pMatch) part = pMatch[1];
            }

            if (!partTitle && LESSON_PARTS[lesson]?.[part]) {
                partTitle = LESSON_PARTS[lesson][part];
            }

            // Xóa tag khỏi text hiển thị câu hỏi
            const cleanQuestion = questionText
                .replace(/\s*\[BÀI\s*\d+(?:\s*-\s*PHẦN\s*\d+)?(?::\s*[^\]]+)?\]/gi, '')
                .replace(/\s*\[(?:PHẦN|P)\s*\d+\]/gi, '')
                .trim();

            questions.push({
                id: questions.length,
                question: cleanQuestion,
                lesson: lesson,
                part: part,
                partTitle: partTitle,
                type: uniqueCorrect.length > 1 ? 'checkbox' : 'radio',
                options: options,
                correct: uniqueCorrect,
                explanation: ansLineStr ? ("" + ansLineStr) : "Đáp án đúng đã được đánh dấu."
            });
        } else {
            const reason = options.length <= 1 ? 'Không tìm thấy options' : 'Không tìm thấy đáp án đúng';
            window.__parseFailed.push({ q: qNum, reason: reason, content: questionText.substring(0, 80) });
        }
    });

    // In chẩn đoán ra console
    console.group('%c🔧 Parser Diagnostics', 'color: orange; font-weight: bold; font-size: 14px');
    console.log(`✅ Parse thành công: ${questions.length} câu`);
    console.log(`❌ Bị bỏ qua: ${window.__parseFailed.length} câu`);
    if (window.__parseFailed.length > 0) {
        console.log('Các câu bị lỗi:');
        console.table(window.__parseFailed);
    }
    console.groupEnd();

    return questions;
}
