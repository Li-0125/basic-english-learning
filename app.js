const STORAGE_KEY = "daylight-english-progress";
const defaultState = {
  completedTasks: [],
  words: 12,
  lessons: 1,
  plan: { hours: 0.5, vocabulary: 10, speaking: true, review: true },
  profile: { id: "学习者", avatar: "", identifier: "", level: "beginner" },
  theme: "minimal",
  checkins: {},
  daily: null,
  review: null,
  speaking: { mode: "word", sentenceIndex: 0, wordIndex: 0 }
};

const everydayWords = [
  ["hello", "həˈləʊ", "int. 你好", "Hello, my name is Lily.", "你好，我叫 Lily。"],
  ["name", "neɪm", "n. 名字", "My name is Lily.", "我的名字是 Lily。"],
  ["student", "ˈstjuːdənt", "n. 学生", "I am a student.", "我是一名学生。"],
  ["friend", "frend", "n. 朋友", "She is my friend.", "她是我的朋友。"],
  ["family", "ˈfæməli", "n. 家庭", "I love my family.", "我爱我的家人。"],
  ["school", "skuːl", "n. 学校", "My school is near here.", "我的学校在这附近。"],
  ["college", "ˈkɒlɪdʒ", "n. 大学；学院", "I study at college.", "我在大学学习。"],
  ["teacher", "ˈtiːtʃə", "n. 老师", "My teacher is kind.", "我的老师很友善。"],
  ["class", "klɑːs", "n. 班级；课", "Our class starts at eight.", "我们的课八点开始。"],
  ["morning", "ˈmɔːnɪŋ", "n. 早晨", "Good morning, everyone.", "大家早上好。"],
  ["today", "təˈdeɪ", "adv. 今天", "Today is a new day.", "今天是新的一天。"],
  ["please", "pliːz", "int. 请", "Please speak slowly.", "请说慢一点。"],
  ["thank", "θæŋk", "v. 感谢", "Thank you for your help.", "谢谢你的帮助。"],
  ["sorry", "ˈsɒri", "adj. 抱歉的", "Sorry, I am late.", "抱歉，我迟到了。"],
  ["water", "ˈwɔːtə", "n. 水", "I would like some water.", "我想要一些水。"],
  ["food", "fuːd", "n. 食物", "The food is good.", "食物很好。"],
  ["help", "help", "v. 帮助", "Can you help me?", "你能帮助我吗？"],
  ["learn", "lɜːn", "v. 学习", "I learn English every day.", "我每天学习英语。"],
  ["speak", "spiːk", "v. 说；讲", "I can speak English.", "我会说英语。"],
  ["listen", "ˈlɪsn", "v. 听", "Listen to the sentence.", "听这个句子。"],
  ["happy", "ˈhæpi", "adj. 开心的", "I am happy today.", "我今天很开心。"],
  ["good", "ɡʊd", "adj. 好的", "That is a good idea.", "那是一个好主意。"],
  ["ready", "ˈredi", "adj. 准备好的", "I am ready to learn.", "我准备好学习了。"],
  ["practice", "ˈpræktɪs", "v. 练习", "Practice makes progress.", "练习带来进步。"]
].map(([word, phonetic, meaning, example, translation]) => ({ word, phonetic, meaning, example, translation, source: "日常高频", group: "daily" }));

const exampleOverrides = {
  brook: { example: "A small brook runs through the village.", translation: "一条小溪流经这个村庄。" }
};

const sentenceLevels = [
  { english: "Hello, my name is Lily.", chinese: "你好，我叫 Lily。", level: "启蒙主题 · 自我介绍", audience: "beginner" },
  { english: "I am a student from China.", chinese: "我是一名来自中国的学生。", level: "启蒙主题 · 身份信息", audience: "beginner" },
  { english: "I like reading stories after school.", chinese: "我喜欢放学后读故事。", level: "国内初中课标主题 · 校园生活", audience: "beginner" },
  { english: "Could you please speak more slowly?", chinese: "你可以说得更慢一点吗？", level: "US K-12 主题 · 礼貌交流", audience: "beginner" },
  { english: "I would like to practice English every day.", chinese: "我想每天练习英语。", level: "高中课标主题 · 学习习惯", audience: "highschool" },
  { english: "Reading widely helps us understand different cultures.", chinese: "广泛阅读能帮助我们理解不同文化。", level: "高中课标主题 · 文化意识", audience: "highschool" },
  { english: "We should balance study, exercise, and enough sleep.", chinese: "我们应当平衡学习、锻炼和充足睡眠。", level: "高中课标主题 · 健康生活", audience: "highschool" },
  { english: "Scientific discoveries often begin with careful observation.", chinese: "科学发现往往始于细致的观察。", level: "US K-12 主题 · 科学探究", audience: "highschool" },
  { english: "Learning a language takes time, reflection, and regular practice.", chinese: "学习一门语言需要时间、反思和规律练习。", level: "高中课标主题 · 学习策略", audience: "highschool" }
];

const fallbackPhraseExercises = [
  { phrase: "as a result of", answer: "result", meaning: "作为……的结果" },
  { phrase: "according to", answer: "according", meaning: "根据；按照" },
  { phrase: "in addition to", answer: "addition", meaning: "除……之外" },
  { phrase: "be familiar with", answer: "familiar", meaning: "熟悉" },
  { phrase: "take into account", answer: "account", meaning: "把……考虑进去" }
];

let state = loadState();
let library = [...everydayWords];
let wordFilter = "all";
let visibleWords = 20;
let activeSession = null;
let activePhraseSession = null;
let mediaRecorder = null;
let mediaStream = null;
let recordingChunks = [];
let installPrompt = null;
let studyAdvanceTimer = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const plan = { ...defaultState.plan, ...(saved.plan || {}) };
    if (!Object.hasOwn(saved.plan || {}, "hours") && Number.isFinite(saved.plan?.minutes)) plan.hours = Math.max(0.5, Math.min(12, saved.plan.minutes / 60));
    delete plan.minutes;
    return {
      ...defaultState,
      ...saved,
      plan,
      profile: { ...defaultState.profile, ...(saved.profile || {}) },
      checkins: saved.checkins || {},
      speaking: { ...defaultState.speaking, ...(saved.speaking || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayId(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(id, count) {
  const [year, month, day] = id.split("-").map(Number);
  const date = new Date(year, month - 1, day + count);
  return todayId(date);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function formatStudyTime(hours) {
  return hours < 1 ? `${Math.round(hours * 60)} 分钟` : `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`;
}

function greetingByHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function currentWordPool() {
  const gaokaoWords = library.filter((entry) => entry.group === "gaokao");
  const cetWords = library.filter((entry) => entry.group.startsWith("cet"));
  if (state.profile.level === "highschool") return gaokaoWords.length ? gaokaoWords : library;
  if (state.profile.level === "college") return cetWords.length ? cetWords : library;
  // Start with hand-curated daily words, then introduce shorter high-frequency-looking entries before longer ones.
  return [...everydayWords, ...gaokaoWords.sort((left, right) => left.word.length - right.word.length || left.word.localeCompare(right.word))];
}

function ensureDailyPlan() {
  const today = todayId();
  const needsReset = state.daily?.date !== today || state.daily?.level !== state.profile.level || !state.daily?.items?.every((item) => item.id);
  if (!needsReset) return;
  const available = currentWordPool();
  const start = state.profile.level === "beginner"
    ? Math.min(Math.max(0, state.words - defaultState.words), available.length - 1)
    : Math.abs([...today].reduce((sum, character) => sum + character.charCodeAt(0), 0)) % available.length;
  const items = Array.from({ length: Math.min(state.plan.vocabulary, available.length) }, (_, index) => {
    const source = available[(start + index) % available.length];
    return { ...source, id: `${today}-${index}-${source.word}`, correct: 0, required: 3 };
  });
  state.daily = { date: today, level: state.profile.level, items, vocabularyDone: false, speakingDone: !state.plan.speaking, reviewDone: !isReviewDue(), checked: false, mode: "en-zh", groupIndex: 0, schedule: [], cursor: 0 };
  saveState();
}

function isReviewDue() {
  return Boolean(state.review?.dueDate && state.review.dueDate <= todayId() && !state.review.completed);
}

function calculateStreak() {
  let cursor = new Date();
  let count = 0;
  if (!state.checkins[todayId(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while (state.checkins[todayId(cursor)]) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function checkinIfPlanComplete() {
  if (!state.daily || state.daily.checked) return;
  const finished = state.daily.vocabularyDone && state.daily.speakingDone && state.daily.reviewDone;
  if (!finished) return;
  state.daily.checked = true;
  state.checkins[todayId()] = true;
  saveState();
  showToast("今日计划已完成，打卡成功。" );
}

function updateProgress() {
  ensureDailyPlan();
  const completed = [state.daily.vocabularyDone, state.daily.speakingDone, state.daily.reviewDone, state.daily.checked].filter(Boolean).length;
  const streak = calculateStreak();
  document.querySelector("#progressText").textContent = `${completed} / 4`;
  document.querySelector("#progressBar").style.width = `${completed * 25}%`;
  document.querySelector("#sidebarStreak").textContent = streak;
  document.querySelector("#streakNumber").textContent = streak;
  document.querySelector("#statStreak").textContent = streak;
  document.querySelector("#statWords").textContent = state.words;
  document.querySelector("#statLessons").textContent = state.lessons;
  document.querySelector("#reviewCount").textContent = isReviewDue() ? state.review.words.length : "0";
  document.querySelectorAll(".task-card").forEach((card) => {
    const task = card.dataset.task;
    const done = task === "vocabulary" ? state.daily.vocabularyDone : task === "listening" ? state.daily.speakingDone : task === "review" ? state.daily.reviewDone : state.completedTasks.includes(task);
    card.classList.toggle("completed", done);
    card.querySelector(".task-state").textContent = done ? "已完成" : task === "review" && isReviewDue() ? `${state.review.words.length} 项到期` : "待完成";
  });
  renderReview();
  renderRecords();
}

function updatePlanUI() {
  const { hours, vocabulary, speaking, review } = state.plan;
  document.querySelector("#minutesInput").value = hours;
  document.querySelector("#minutesOutput").value = formatStudyTime(hours);
  document.querySelector("#wordGoalOutput").value = `${vocabulary} 个`;
  document.querySelector("#wordGoalValue").textContent = vocabulary;
  document.querySelector("#speakingToggle").checked = speaking;
  document.querySelector("#reviewToggle").checked = review;
  document.querySelector("#planSummary").textContent = [formatStudyTime(hours), `${vocabulary} 个词`, speaking ? "口语练习" : "词汇巩固"].join(" · ");
  document.querySelector("#vocabularyTaskMeta").textContent = `今日计划 · ${vocabulary} 个新词`;
  document.querySelector("#planPreviewTitle").textContent = `${formatStudyTime(hours)}学习计划`;
  const activities = [`${vocabulary} 个新词`, "一次词组填空"];
  if (speaking) activities.push("一次短句跟读");
  if (review) activities.push(isReviewDue() ? "到期复习" : "复习预习");
  document.querySelector("#planPreviewText").textContent = `${activities.join("、")}。`;
  const courseLabel = state.profile.level === "highschool" ? "高考" : state.profile.level === "college" ? "四六级" : "基础";
  document.querySelector("#heroWordCopy").textContent = `计划学习 ${vocabulary} 个${courseLabel}词汇；每 10 个词一组，随机出现三次，答对才会计入掌握。`;
  document.querySelector("#wordCourseTitle").textContent = state.profile.level === "highschool" ? "高考 3500 词 · 今日背词" : state.profile.level === "college" ? "四六级词汇 · 今日背词" : "基础高频词 · 今日背词";
  document.querySelector("#wordCourseDescription").textContent = `今天计划 ${vocabulary} 个新词，分为 ${Math.ceil(vocabulary / 10)} 组；每个词在组内乱序出现三次。`;
  document.querySelector("#wordCourseGoal").textContent = vocabulary;
  document.querySelector("#wordCourseGroups").textContent = Math.ceil(vocabulary / 10);
}

function updateProfileUI() {
  document.body.dataset.theme = state.theme;
  const firstCharacter = state.profile.id.trim().slice(0, 1).toUpperCase() || "L";
  document.querySelector("#homeGreeting").textContent = `${greetingByHour()}，${state.profile.id || "学习者"}。`;
  ["#sidebarName", "#displayNameInput"].forEach((selector) => document.querySelector(selector).value !== undefined ? document.querySelector(selector).value = state.profile.id : document.querySelector(selector).textContent = state.profile.id);
  document.querySelector("#sidebarName").textContent = state.profile.id;
  document.querySelector("#profileLevel").value = state.profile.level;
  document.querySelectorAll(".level-option").forEach((button) => button.classList.toggle("active", button.dataset.levelChoice === state.profile.level));
  ["#sidebarAvatar", "#topAvatar", "#dialogAvatar"].forEach((selector) => {
    const avatar = document.querySelector(selector);
    avatar.textContent = state.profile.avatar ? "" : firstCharacter;
    avatar.style.backgroundImage = state.profile.avatar ? `url("${state.profile.avatar}")` : "";
  });
  document.querySelectorAll(".theme-option").forEach((button) => button.classList.toggle("active", button.dataset.themeChoice === state.theme));
}

function switchView(viewName) {
  const target = document.querySelector(`#${viewName}-view`);
  if (!target) return;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  target.classList.add("active");
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function beginDailyStudy() {
  ensureDailyPlan();
  activeSession = { type: "daily", items: state.daily.items, mode: state.daily.mode, daily: state.daily };
  prepareDailyGroup();
  refreshStudy();
  switchView("study");
}

function beginReviewStudy() {
  if (!isReviewDue()) {
    showToast("今天没有到期复习。完成今天的新词后，明天会自动安排复习。" );
    return;
  }
  activeSession = { type: "review", items: state.review.words.map((word, index) => ({ ...word, id: word.id || `review-${index}-${word.word}`, correct: 0, required: 1 })), mode: "en-zh", schedule: [] };
  activeSession.schedule = shuffle(activeSession.items.map((item) => item.id));
  activeSession.cursor = 0;
  refreshStudy();
  switchView("study");
}

function phraseExercises() {
  const phraseEntries = library.filter((entry) => entry.group.endsWith("phrase"));
  const source = phraseEntries.length ? phraseEntries : fallbackPhraseExercises;
  return shuffle(source).map((entry) => {
    if (entry.phrase) return entry;
    const words = entry.word.trim().split(/\s+/);
    const answerIndex = words.length > 2 ? 1 : words.length - 1;
    return { phrase: entry.word, answer: words[answerIndex], meaning: entry.meaning };
  });
}

function beginPhrasePractice() {
  activePhraseSession = { items: phraseExercises(), index: 0, answered: false };
  renderPhraseExercise();
  switchView("phrase");
}

function renderPhraseExercise() {
  if (!activePhraseSession?.items[activePhraseSession.index]) {
    activePhraseSession = { items: phraseExercises(), index: 0, answered: false };
  }
  const item = activePhraseSession?.items[activePhraseSession.index];
  if (!item) return finishPhrasePractice();
  const words = item.phrase.split(/\s+/);
  const answerIndex = words.findIndex((word) => word.toLowerCase() === item.answer.toLowerCase());
  document.querySelector("#phraseProgress").textContent = `第 ${activePhraseSession.index + 1} 题`;
  document.querySelector("#phraseMeaning").textContent = item.meaning;
  document.querySelector("#phraseCloze").innerHTML = words.map((word, index) => index === answerIndex ? "<span>______</span>" : escapeHtml(word)).join(" ");
  document.querySelector("#phraseAnswer").value = "";
  document.querySelector("#phraseAnswer").disabled = false;
  document.querySelector("#submitPhrase").hidden = false;
  document.querySelector("#nextPhrase").hidden = true;
  document.querySelector("#phraseFeedback").className = "phrase-feedback";
  document.querySelector("#phraseFeedback").textContent = "输入答案后提交。";
  window.setTimeout(() => document.querySelector("#phraseAnswer").focus(), 0);
}

function submitPhraseAnswer() {
  const item = activePhraseSession?.items[activePhraseSession.index];
  if (!item || activePhraseSession.answered) return;
  const answer = document.querySelector("#phraseAnswer").value.trim().toLowerCase();
  const feedback = document.querySelector("#phraseFeedback");
  if (!answer) {
    feedback.className = "phrase-feedback warning";
    feedback.textContent = "请先输入一个英文单词。";
    return;
  }
  activePhraseSession.answered = true;
  document.querySelector("#phraseAnswer").disabled = true;
  document.querySelector("#submitPhrase").hidden = true;
  document.querySelector("#nextPhrase").hidden = false;
  if (answer === item.answer.toLowerCase()) {
    feedback.className = "phrase-feedback success";
    feedback.textContent = "答对了。这个词组已经记住一次。";
  } else {
    feedback.className = "phrase-feedback error";
    feedback.innerHTML = `还差一点，正确答案是 <strong>${escapeHtml(item.answer)}</strong>。`;
  }
}

function finishPhrasePractice() {
  activePhraseSession = null;
  state.completedTasks = Array.from(new Set([...state.completedTasks, "phrase"]));
  state.lessons += 1;
  saveState();
  updateProgress();
  showToast("今日词组练习完成。");
  switchView("home");
}

function prepareDailyGroup() {
  const batchStart = state.daily.groupIndex * 10;
  const group = state.daily.items.slice(batchStart, batchStart + 10);
  if (!group.length) return;
  if (state.daily.schedule.length && state.daily.cursor < state.daily.schedule.length) return;
  state.daily.schedule = [1, 2, 3].flatMap(() => shuffle(group.map((item) => item.id)));
  state.daily.cursor = 0;
}

function activeItem() {
  if (!activeSession) return null;
  const session = activeSession.type === "daily" ? state.daily : activeSession;
  const itemId = session.schedule[session.cursor];
  return activeSession.items.find((item) => item.id === itemId) || null;
}

function exampleSentence(item) {
  return item.example || exampleOverrides[item.word]?.example || `The word “${item.word}” is used in this sentence.`;
}

function exampleTranslation(item) {
  return item.translation || exampleOverrides[item.word]?.translation || `这个句子展示了“${item.word}”的实际用法。`;
}

function refreshStudy() {
  window.clearTimeout(studyAdvanceTimer);
  const session = activeSession.type === "daily" ? state.daily : activeSession;
  if (session.cursor >= session.schedule.length) {
    if (activeSession.type === "daily") {
      state.daily.groupIndex += 1;
      state.daily.schedule = [];
      state.daily.cursor = 0;
      if (state.daily.groupIndex * 10 >= state.daily.items.length) return finishStudySession();
      prepareDailyGroup();
      return refreshStudy();
    }
    return finishStudySession();
  }
  const item = activeItem();
  const batchStart = activeSession.type === "daily" ? state.daily.groupIndex * 10 : 0;
  const batch = activeSession.type === "daily" ? state.daily.items.slice(batchStart, batchStart + 10) : activeSession.items;
  const batchCorrect = batch.reduce((sum, entry) => sum + Math.min(entry.correct, entry.required), 0);
  const batchRequired = batch.reduce((sum, entry) => sum + entry.required, 0);
  document.querySelector("#studyProgressLabel").textContent = activeSession.type === "daily" ? `第 ${state.daily.groupIndex + 1} 组 · 乱序巩固` : "昨日复习";
  document.querySelector("#studyProgressText").textContent = `${batchCorrect} / ${batchRequired}`;
  document.querySelector("#studyProgressBar").style.width = `${(batchCorrect / batchRequired) * 100}%`;
  document.querySelector("#studyModeButton").textContent = activeSession.mode === "en-zh" ? "英译中" : "中译英";
  document.querySelector("#studyWord").textContent = item.word;
  document.querySelector("#studyPhonetic").textContent = `[${item.phonetic}]`;
  document.querySelector("#studyMeaning").textContent = item.meaning;
  document.querySelector("#studyExample").textContent = exampleSentence(item);
  document.querySelector("#studyExampleTranslation").textContent = exampleTranslation(item);
  document.querySelector("#studyExampleTranslation").hidden = true;
  document.querySelector("#studyRepeatCount").textContent = item.required - item.correct;
  document.querySelector("#previousStudyQuestion").hidden = session.cursor <= 0;
  const isEnglishToChinese = activeSession.mode === "en-zh";
  document.querySelector(".word-study-card").classList.toggle("zh-en", !isEnglishToChinese);
  document.querySelector("#studyMeaning").classList.toggle("study-answer-hidden", isEnglishToChinese);
  document.querySelector("#studyWord").classList.toggle("study-answer-hidden", !isEnglishToChinese);
  document.querySelector("#studyPhoneticBlock").classList.toggle("study-answer-hidden", !isEnglishToChinese);
  document.querySelector("#studyExampleBlock").classList.toggle("study-answer-hidden", !isEnglishToChinese);
  const answers = buildOptions(item, activeSession.mode);
  document.querySelector("#quizPrompt").hidden = !isEnglishToChinese;
  document.querySelector("#quizPrompt").textContent = `“${item.word}” 的意思是？`;
  document.querySelector("#quizOptions").innerHTML = answers.map((answer, index) => `<button class="quiz-option" data-correct="${answer.correct}"><span class="option-letter">${"ABCD"[index]}</span><span>${escapeHtml(answer.label)}</span></button>`).join("");
  document.querySelector("#quizFeedback").className = "quiz-feedback";
  document.querySelector("#quizFeedback").textContent = "选择一个答案开始练习。";
  document.querySelectorAll(".quiz-option").forEach((button) => button.addEventListener("click", () => answerQuestion(button.dataset.correct === "true", button)));
  if (isEnglishToChinese) speak(item.word);
}

function buildOptions(item, mode) {
  const label = mode === "en-zh" ? item.meaning : item.word;
  const wrongs = shuffle(library.filter((entry) => entry.word !== item.word)).slice(0, 3).map((entry) => ({ label: mode === "en-zh" ? entry.meaning : entry.word, correct: false }));
  return shuffle([{ label, correct: true }, ...wrongs]);
}

function answerQuestion(isCorrect, selected) {
  const feedback = document.querySelector("#quizFeedback");
  document.querySelectorAll(".quiz-option").forEach((button) => button.disabled = true);
  if (isCorrect) {
    selected.classList.add("correct");
    activeItem().correct += 1;
    feedback.className = "quiz-feedback good";
    feedback.textContent = "答对了，记住一次。继续巩固这个单词。";
  } else {
    selected.classList.add("incorrect");
    const correctOption = document.querySelector(".quiz-option[data-correct='true']");
    if (correctOption) correctOption.classList.add("correct", "revealed-answer");
    feedback.className = "quiz-feedback bad";
    feedback.textContent = "选错了，绿框标出的是正确答案。";
    if (activeSession.type === "daily") state.daily.schedule.push(activeItem().id);
  }
  if (activeSession.type === "daily") {
    state.daily.mode = activeSession.mode;
    state.daily.cursor += 1;
  } else {
    activeSession.cursor += 1;
  }
  saveState();
  studyAdvanceTimer = window.setTimeout(refreshStudy, isCorrect ? 850 : 1800);
}

function previousStudyQuestion() {
  if (!activeSession) return;
  window.clearTimeout(studyAdvanceTimer);
  const session = activeSession.type === "daily" ? state.daily : activeSession;
  if (session.cursor <= 0) return;
  session.cursor -= 1;
  saveState();
  refreshStudy();
}

function finishStudySession() {
  if (activeSession.type === "daily") {
    state.daily.vocabularyDone = true;
    state.words += state.daily.items.length;
    state.review = { dueDate: addDays(todayId(), 1), words: state.daily.items.map(({ correct, required, ...word }) => word), completed: false };
    showToast("今日新词完成。明天会自动安排复习。" );
  } else {
    state.review.completed = true;
    state.daily.reviewDone = true;
    showToast("复习完成，记忆会更牢固。" );
  }
  activeSession = null;
  checkinIfPlanComplete();
  saveState();
  updateProgress();
  switchView("home");
}

function renderReview() {
  const isDue = isReviewDue();
  const words = isDue ? state.review.words : [];
  document.querySelector("#reviewIntro").textContent = isDue ? "这些词来自昨天完成的新词计划。每个词答对一次即可完成复习。" : "完成今天的新词后，系统会在明天把它们自动放到这里。";
  document.querySelector("#reviewAccuracy").textContent = isDue ? "待开始" : "--";
  document.querySelector("#reviewInterval").textContent = isDue ? "1 天" : "明天";
  document.querySelector("#reviewList").innerHTML = words.length ? words.slice(0, 8).map((word) => `<div class="review-item"><span class="word-chip">${escapeHtml(word.word)}</span><div><strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.meaning)}</span></div><span class="review-due">今天</span></div>`).join("") : `<p class="panel-note">暂无到期内容。学习完成的新词将在第二天出现在这里。</p>`;
  document.querySelector("#reviewButton").disabled = !isDue;
  document.querySelector("#reviewButton").textContent = isDue ? "开始复习 →" : "暂无复习任务";
}

function renderWords() {
  const query = document.querySelector("#wordSearch").value.trim().toLowerCase();
  const matches = library.filter((entry) => (wordFilter === "all" || entry.group === wordFilter) && (!query || `${entry.word} ${entry.meaning}`.toLowerCase().includes(query)));
  const shown = matches.slice(0, visibleWords);
  document.querySelector("#wordList").innerHTML = shown.map((entry, index) => `<article class="word-entry"><button class="entry-play" data-word-index="${index}" title="播放 ${escapeHtml(entry.word)}" aria-label="播放 ${escapeHtml(entry.word)}">▶</button><div class="word-entry-main"><strong>${escapeHtml(entry.word)}</strong><span class="phonetic">[${escapeHtml(entry.phonetic)}]</span><span class="meaning">${escapeHtml(entry.meaning)}</span></div><span class="source-badge ${entry.group === "gaokao" ? "gaokao" : ""}">${escapeHtml(entry.source)}</span></article>`).join("");
  document.querySelectorAll(".entry-play").forEach((button) => button.addEventListener("click", () => speak(shown[Number(button.dataset.wordIndex)].word)));
  document.querySelector("#wordbookStatus").textContent = matches.length ? `显示 ${shown.length} / ${matches.length} 个匹配词条` : "没有找到匹配的词条。";
  document.querySelector("#loadMoreWords").hidden = shown.length >= matches.length;
}

async function loadWordbook() {
  try {
    const response = await fetch("data/gaokao-3500.json");
    if (!response.ok) throw new Error("词库加载失败");
    const gaokaoWords = await response.json();
    const cetResponse = await fetch("data/cet-vocabulary.json");
    if (!cetResponse.ok) throw new Error("四六级词库加载失败");
    const cetWords = await cetResponse.json();
    const dailySet = new Set(everydayWords.map((entry) => entry.word));
    library = [...everydayWords, ...gaokaoWords.filter((entry) => !dailySet.has(entry.word)).map((entry) => ({ ...entry, group: "gaokao", example: "", translation: "" })), ...cetWords];
    document.querySelector("#libraryCount").textContent = library.length.toLocaleString("zh-CN");
    document.querySelector("#wordbookStatus").textContent = "词库已加载。";
  } catch {
    document.querySelector("#libraryCount").textContent = everydayWords.length;
    document.querySelector("#wordbookStatus").textContent = "词库暂未完整加载，当前显示可用词条。请通过本地预览地址打开应用。";
  }
  if (state.profile.level === "highschool" && state.daily?.items?.some((item) => item.group !== "gaokao")) state.daily = null;
  ensureDailyPlan();
  renderWords();
}

function englishVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find((voice) => /^en-US$/i.test(voice.lang)) || voices.find((voice) => /^en/i.test(voice.lang));
}

function speak(text) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return showToast("当前浏览器不支持语音播放。请使用 Chrome、Safari 或 Edge 打开应用。");
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = englishVoice();
  utterance.lang = voice?.lang || "en-US";
  utterance.voice = voice || null;
  utterance.rate = 0.82;
  utterance.onerror = () => showToast("发音没有成功播放。请检查手机媒体音量，并再次点击播放。");
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);
  window.setTimeout(() => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 120);
}

function setupInstall() {
  const button = document.querySelector("#installApp");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    button.hidden = true;
    showToast("应用已安装到手机桌面。");
  });
  button.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      button.hidden = true;
      return;
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    showToast(isIos ? "请在 Safari 中点“分享”，再选择“添加到主屏幕”。" : "请在浏览器菜单中选择“安装应用”或“添加到主屏幕”。");
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

function speakingTarget() {
  if (state.speaking.mode === "word") {
    const candidates = state.daily?.items || currentWordPool();
    const word = candidates[state.speaking.wordIndex % candidates.length];
    const level = state.profile.level === "highschool" ? "高考 3500 词" : state.profile.level === "college" ? "四六级词汇" : "日常高频";
    return { english: word.word, chinese: word.meaning, level: `${level} · 美式发音` };
  }
  const sentences = sentenceLevels.filter((sentence) => sentence.audience === state.profile.level || (state.profile.level === "college" && sentence.audience === "highschool"));
  return sentences[state.speaking.sentenceIndex % sentences.length];
}

function updateSpeakingUI() {
  const target = speakingTarget();
  document.querySelector("#speakingTargetLabel").textContent = state.speaking.mode === "word" ? "TODAY'S WORD" : "TODAY'S SENTENCE";
  document.querySelector("#speakingLevel").textContent = target.level;
  document.querySelector("#targetSentence").textContent = target.english;
  document.querySelector("#targetTranslation").textContent = target.chinese;
  document.querySelectorAll(".speaking-tab").forEach((tab) => { const active = tab.dataset.speakingMode === state.speaking.mode; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); });
}

function setRecordingUI(recording) {
  document.querySelector("#recordRing").classList.toggle("recording", recording);
  document.querySelector("#recordIcon").textContent = recording ? "■" : "●";
  document.querySelector("#recordTitle").textContent = recording ? "正在录音" : "准备好了吗？";
  document.querySelector("#recordHelp").textContent = recording ? "再说一遍目标内容，完成后点击停止。" : "点击下方按钮后，浏览器会请求麦克风权限。";
  document.querySelector("#recordButton").innerHTML = recording ? "<span>■</span>停止并保存" : "<span>●</span>开始录音";
}

async function toggleRecording() {
  if (mediaRecorder?.state === "recording") return mediaRecorder.stop();
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return showToast("当前浏览器不支持录音，请使用支持 MediaRecorder 的安卓浏览器，并通过 HTTPS 打开。" );
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = (event) => event.data.size && recordingChunks.push(event.data);
    mediaRecorder.onstop = () => {
      const audio = document.querySelector("#recordingAudio");
      audio.src = URL.createObjectURL(new Blob(recordingChunks, { type: mediaRecorder.mimeType }));
      audio.hidden = false;
      mediaStream.getTracks().forEach((track) => track.stop());
      setRecordingUI(false);
      showToast("录音已保存，可以回放自己的表达。" );
    };
    mediaRecorder.start();
    setRecordingUI(true);
  } catch {
    showToast("未获得麦克风权限，请在浏览器地址栏中允许麦克风后重试。" );
  }
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function setRecognitionMessage(message, tone = "") {
  const result = document.querySelector("#recognitionResult");
  result.className = `score-box ${tone}`;
  result.innerHTML = `<span class="score-label">智能跟读评分</span>${message}<small>当前为浏览器语音识别的即时匹配分</small>`;
}

function evaluateSpeech(transcript) {
  const targetWords = normalizeText(speakingTarget().english).split(" ").filter(Boolean);
  const spokenWords = new Set(normalizeText(transcript).split(" ").filter(Boolean));
  const matched = targetWords.filter((word) => spokenWords.has(word));
  const score = Math.round((matched.length / targetWords.length) * 100);
  setRecognitionMessage(`<strong>${score} / 100</strong><span>识别到：${escapeHtml(transcript)} · 匹配 ${matched.length}/${targetWords.length} 个关键词</span>`, score >= 75 ? "success" : "warning");
  if (score >= 75) {
    state.daily.speakingDone = true;
    state.completedTasks = Array.from(new Set([...state.completedTasks, "listening"]));
    checkinIfPlanComplete();
    saveState();
    updateProgress();
  }
}

function startRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return setRecognitionMessage("当前浏览器不支持语音识别。你仍可使用录音回放练习；自动评分需要浏览器支持 SpeechRecognition。", "warning");
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  setRecognitionMessage("正在听，请朗读上方目标内容...", "");
  recognition.onresult = (event) => evaluateSpeech(event.results[0][0].transcript);
  recognition.onerror = (event) => setRecognitionMessage(`未能完成识别：${escapeHtml(event.error)}。请检查麦克风权限后重试。`, "warning");
  recognition.start();
}

function renderRecords() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  document.querySelector("#calendarTitle").textContent = `${year} 年 ${month + 1} 月打卡`;
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const monthCheckins = Object.keys(state.checkins).filter((id) => id.startsWith(monthPrefix)).length;
  document.querySelector("#calendarSummary").textContent = `${monthCheckins} 天`;
  const grid = Array.from({ length: firstOffset }, () => `<span class="calendar-day empty"></span>`);
  for (let day = 1; day <= days; day += 1) {
    const id = `${monthPrefix}${String(day).padStart(2, "0")}`;
    const classes = ["calendar-day", state.checkins[id] ? "checked" : "", id === todayId() ? "today" : ""].filter(Boolean).join(" ");
    grid.push(`<span class="${classes}">${day}</span>`);
  }
  document.querySelector("#calendarGrid").innerHTML = grid.join("");
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const bars = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const checked = Boolean(state.checkins[todayId(date)]);
    return `<div><i style="height:${checked ? 68 : 4}%"></i><span>${"一二三四五六日"[index]}</span></div>`;
  });
  const weekCount = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return state.checkins[todayId(date)] ? 1 : 0; }).reduce((sum, value) => sum + value, 0);
  document.querySelector("#activityBars").innerHTML = bars.join("");
  document.querySelector("#weekSummary").textContent = `${weekCount} / 7 天`;
  document.querySelector("#recordNote").textContent = monthCheckins ? "每一次完成，都会成为长期学习的一部分。" : "完成今日计划后，这里会出现你的第一枚打卡。";
}

function openAccount(tab = "profile") {
  const dialog = document.querySelector("#accountDialog");
  if (!dialog.open) dialog.showModal();
  document.querySelectorAll(".account-tab").forEach((button) => button.classList.toggle("active", button.dataset.accountTab === tab));
  document.querySelectorAll(".account-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.accountPanel === tab));
}

function setupEvents() {
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((item) => item.addEventListener("click", () => switchView(item.dataset.view)));
  document.querySelectorAll("[data-view]").forEach((item) => { if (!item.matches(".nav-item, .mobile-nav-item")) item.addEventListener("click", () => switchView(item.dataset.view)); });
  document.querySelector("#startLesson").addEventListener("click", beginDailyStudy);
  document.querySelector("#startWordCourse").addEventListener("click", beginDailyStudy);
  document.querySelectorAll(".task-card").forEach((card) => card.addEventListener("click", () => { const task = card.dataset.task; if (task === "vocabulary") beginDailyStudy(); else if (task === "phrase") beginPhrasePractice(); else if (task === "listening") switchView("speaking"); else if (task === "review") switchView("review"); else { state.completedTasks = Array.from(new Set([...state.completedTasks, task])); state.lessons += 1; saveState(); updateProgress(); } }));
  document.querySelector("#exitStudy").addEventListener("click", () => { activeSession = null; switchView("home"); });
  document.querySelector("#studyPlay").addEventListener("click", () => speak(activeItem()?.word || ""));
  document.querySelector("#previousStudyQuestion").addEventListener("click", previousStudyQuestion);
  document.querySelector("#studyExampleBlock").addEventListener("click", () => { document.querySelector("#studyExampleTranslation").hidden = false; });
  document.querySelector("#studyModeButton").addEventListener("click", () => { activeSession.mode = activeSession.mode === "en-zh" ? "zh-en" : "en-zh"; refreshStudy(); });
  document.querySelector("#exitPhrase").addEventListener("click", () => { activePhraseSession = null; switchView("home"); });
  document.querySelector("#submitPhrase").addEventListener("click", submitPhraseAnswer);
  document.querySelector("#nextPhrase").addEventListener("click", () => { activePhraseSession.index += 1; activePhraseSession.answered = false; renderPhraseExercise(); });
  document.querySelector("#phraseAnswer").addEventListener("keydown", (event) => { if (event.key === "Enter") submitPhraseAnswer(); });
  document.querySelector("#reviewButton").addEventListener("click", beginReviewStudy);
  document.querySelector("#minutesInput").addEventListener("input", (event) => { state.plan.hours = Number(event.target.value); updatePlanUI(); });
  document.querySelectorAll(".stepper-button").forEach((button) => button.addEventListener("click", () => { state.plan.vocabulary = Math.min(300, Math.max(10, state.plan.vocabulary + Number(button.dataset.step))); updatePlanUI(); }));
  document.querySelector("#speakingToggle").addEventListener("change", (event) => { state.plan.speaking = event.target.checked; state.daily.speakingDone = !event.target.checked; updatePlanUI(); });
  document.querySelector("#reviewToggle").addEventListener("change", (event) => { state.plan.review = event.target.checked; state.daily.reviewDone = !event.target.checked || !isReviewDue(); updatePlanUI(); });
  document.querySelector("#savePlan").addEventListener("click", () => { state.daily = null; ensureDailyPlan(); saveState(); updatePlanUI(); updateProgress(); showToast("每日计划已保存。背词将按每 10 个一组随机安排。" ); switchView("courses"); });
  document.querySelector("#wordSearch").addEventListener("input", () => { visibleWords = 20; renderWords(); });
  document.querySelectorAll(".filter-button").forEach((button) => button.addEventListener("click", () => { wordFilter = button.dataset.filter; visibleWords = 20; document.querySelectorAll(".filter-button").forEach((item) => item.classList.toggle("active", item === button)); renderWords(); }));
  document.querySelector("#loadMoreWords").addEventListener("click", () => { visibleWords += 20; renderWords(); });
  document.querySelectorAll(".speaking-tab").forEach((tab) => tab.addEventListener("click", () => { state.speaking.mode = tab.dataset.speakingMode; saveState(); updateSpeakingUI(); }));
  document.querySelector("#playSentence").addEventListener("click", () => speak(speakingTarget().english));
  document.querySelector("#changeSentence").addEventListener("click", () => { if (state.speaking.mode === "word") state.speaking.wordIndex += 1; else state.speaking.sentenceIndex += 1; saveState(); updateSpeakingUI(); });
  document.querySelector("#recordButton").addEventListener("click", toggleRecording);
  document.querySelector("#followButton").addEventListener("click", startRecognition);
  document.querySelector("#profileButton").addEventListener("click", () => openAccount("profile"));
  document.querySelector("#topAvatar").addEventListener("click", () => openAccount("profile"));
  document.querySelectorAll(".account-tab").forEach((tab) => tab.addEventListener("click", () => openAccount(tab.dataset.accountTab)));
  document.querySelector("#saveProfile").addEventListener("click", () => { const id = document.querySelector("#displayNameInput").value.trim(); if (!id) return showToast("请先填写学习 ID。" ); state.profile.id = id; state.profile.level = document.querySelector("#profileLevel").value; state.daily = null; ensureDailyPlan(); saveState(); updateProfileUI(); updatePlanUI(); updateSpeakingUI(); showToast("个人资料和学习阶段已保存。" ); });
  document.querySelector("#avatarInput").addEventListener("change", (event) => { const [file] = event.target.files; if (!file) return; if (file.size > 1024 * 1024) return showToast("头像图片请控制在 1 MB 以内。" ); const reader = new FileReader(); reader.onload = () => { state.profile.avatar = reader.result; saveState(); updateProfileUI(); }; reader.readAsDataURL(file); });
  document.querySelectorAll(".level-option").forEach((button) => button.addEventListener("click", () => { state.profile.level = button.dataset.levelChoice; updateProfileUI(); }));
  document.querySelector("#localLogin").addEventListener("click", () => { const identifier = document.querySelector("#loginIdentifier").value.trim(); const valid = /^1\d{10}$/.test(identifier) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier); if (!valid) return showToast("请输入有效的手机号或邮箱。" ); state.profile.identifier = identifier; if (state.profile.id === "学习者") state.profile.id = identifier.includes("@") ? identifier.split("@")[0] : `学习者${identifier.slice(-4)}`; state.daily = null; ensureDailyPlan(); saveState(); updateProfileUI(); updatePlanUI(); updateSpeakingUI(); document.querySelector("#accountDialog").close(); showToast(`${state.profile.level === "highschool" ? "高中" : state.profile.level === "college" ? "大学生" : "初学"}学习路径已创建。` ); });
  document.querySelectorAll(".third-party-button").forEach((button) => button.addEventListener("click", () => showToast(`${button.dataset.provider} 登录需要配置服务端应用凭证。`)));
  document.querySelectorAll(".theme-option").forEach((button) => button.addEventListener("click", () => { state.theme = button.dataset.themeChoice; saveState(); updateProfileUI(); }));
}

setupEvents();
setupInstall();
registerServiceWorker();
ensureDailyPlan();
updateProfileUI();
updatePlanUI();
updateProgress();
updateSpeakingUI();
loadWordbook();
