import './index.css';
import { MCQ, QuizState, QuizResult } from './types';
import { parseQuizFromPDF } from './lib/gemini';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

// Create icons using Lucide
const createIcon = (Icon: any, className = "") => {
  const svgWrapper = document.createElement('div');
  svgWrapper.className = `flex items-center justify-center ${className}`;
  // For vanilla, we use the create() method if we want to batch, or just insert SVG strings
  // lucide-react doesn't directly export SVG strings easily for vanilla, 
  // but we can use the library's internal structure or just use simple SVG templates if needed.
  // Actually, we can use the lucide package or just hardcode some paths for essential icons for speed.
  // However, I'll use a helper to render them.
  return `<span class="lucide-icon ${className}" data-lucide="${Icon.name}"></span>`;
};

// State Management
let state: QuizState = QuizState.IDLE;
let mcqs: MCQ[] = [];
let currentQuestionIndex = 0;
let userAnswers: string[] = [];
let timeLeft = 0;
let isProcessing = false;
let quizResult: QuizResult | null = null;
let secretClicks = 0;
let timerInterval: any = null;

const appRoot = document.getElementById('app')!;

function setState(newState: QuizState) {
  state = newState;
  render();
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  isProcessing = true;
  setState(QuizState.PROCESSING);

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const base64 = (reader.result as string).split(',')[1];
      mcqs = await parseQuizFromPDF(base64);
      userAnswers = new Array(mcqs.length).fill('');
      isProcessing = false;
      render(); // Transition happens in render based on mcqs availability during PROCESSING
    } catch (error) {
      console.error(error);
      alert('Failed to process PDF. Make sure it contains questions and answers.');
      isProcessing = false;
      setState(QuizState.IDLE);
    }
  };
  reader.readAsDataURL(file);
}

function startQuiz() {
  currentQuestionIndex = 0;
  timeLeft = 0;
  setState(QuizState.QUIZ);
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft++;
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.textContent = formatTime(timeLeft);
  }, 1000);
}

function finishQuiz() {
  if (timerInterval) clearInterval(timerInterval);
  
  const score = mcqs.reduce((acc, mcq, index) => {
    return acc + (userAnswers[index] === mcq.correctAnswer ? 1 : 0);
  }, 0);

  quizResult = {
    mcqs,
    userAnswers,
    score,
    total: mcqs.length,
    timeSpent: timeLeft
  };

  setState(QuizState.REVIEW);
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FDE047', '#60A5FA', '#BFDBFE']
  });
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function selectAnswer(option: string) {
  userAnswers[currentQuestionIndex] = option;
  render();
}

function downloadResults() {
  if (!quizResult) return;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text('Quiz Results - Gift innit', 20, 20);
  doc.setFontSize(12);
  doc.text(`Score: ${quizResult.score} / ${quizResult.total}`, 20, 30);
  doc.text(`Time Spent: ${formatTime(quizResult.timeSpent)}`, 20, 40);

  quizResult.mcqs.forEach((mcq, i) => {
    const y = 60 + (i * 50);
    if (y > 250) doc.addPage();
    doc.text(`${i + 1}. ${mcq.question}`, 20, y % 280);
    doc.text(`Your Answer: ${quizResult?.userAnswers[i] || 'None'}`, 20, (y + 10) % 280);
    doc.text(`Correct Answer: ${mcq.correctAnswer}`, 20, (y + 20) % 280);
    const isCorrect = quizResult?.userAnswers[i] === mcq.correctAnswer;
    const status = isCorrect ? 'CORRECT' : 'WRONG';
    doc.text(`Status: ${status}`, 20, (y + 30) % 280);
    if (!isCorrect && mcq.explanation) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      const explanationLines = doc.splitTextToSize(`Why it's wrong: ${mcq.explanation}`, 170);
      doc.text(explanationLines, 20, (y + 40) % 280);
      doc.setFontSize(12);
      doc.setTextColor(0);
    }
  });

  doc.save('quiz_results.pdf');
}

function handleGlobalClick(e: MouseEvent) {
  if (e.target === appRoot || (e.target as HTMLElement).id === 'main-container') {
    secretClicks++;
    if (secretClicks === 20) {
      showSecretModal();
      secretClicks = 0;
    }
  }
}

function showSecretModal() {
  const modal = document.createElement('div');
  modal.id = 'secret-modal';
  modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-6 bg-yellow-950/20 backdrop-blur-lg';
  modal.innerHTML = `
    <div class="max-w-md bg-white p-10 rounded-[3rem] shadow-2xl relative border-8 border-yellow-200 animate-in fade-in zoom-in duration-300">
      <div class="absolute -top-10 -right-10 bg-red-400 p-6 rounded-full shadow-lg rotate-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </div>
      <div class="space-y-6 text-center">
        <div class="flex justify-center mb-4">
          <svg style="animation: spin-slow 8s linear infinite;" class="text-yellow-400 w-16 h-16" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V2m0 5.5L15.5 4M12 7.5 8.5 4m3.5 11.5a4.5 4.5 0 1 1-4.5-4.5m4.5 4.5a4.5 4.5 0 1 0 4.5-4.5M12 15.5V22m0-6.5L15.5 20m-3.5-4.5L8.5 20m7-8h5.5m-5.5 0-2.5-3.5m2.5 3.5-2.5 3.5m-11.5-3.5H2m5.5 0 2.5-3.5m-2.5 3.5 2.5 3.5"/></svg>
        </div>
        <h3 class="text-2xl font-serif italic text-slate-800 leading-relaxed">
          "I didn't build it for no reason lol, you're probably the best person I have ever met, I know you would not left click 20 times on this so I am hiding this secret message here, I really hope I could be with you, guess I will never say it, I hope you stumble upon it somehow and read this stupid message which I decided to leave after a lot of deep breathes"
        </h3>
        <div class="pt-6 border-t border-yellow-100 italic font-medium text-slate-400">
          Yours, Satyam
        </div>
        <button id="close-secret" class="mt-6 text-sm font-bold text-yellow-600 hover:text-yellow-700 uppercase tracking-widest cursor-pointer">
          Close Secret
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-secret')?.addEventListener('click', () => {
    modal.remove();
  });
}

function render() {
  appRoot.innerHTML = '';
  
  // Lily Background Layer
  const bg = document.createElement('div');
  bg.className = 'fixed inset-0 pointer-events-none overflow-hidden opacity-10 z-0';
  for (let i = 0; i < 15; i++) {
    const flower = document.createElement('div');
    flower.className = 'absolute text-blue-200';
    flower.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V2m0 5.5L15.5 4M12 7.5 8.5 4m3.5 11.5a4.5 4.5 0 1 1-4.5-4.5m4.5 4.5a4.5 4.5 0 1 0 4.5-4.5M12 15.5V22m0-6.5L15.5 20m-3.5-4.5L8.5 20m7-8h5.5m-5.5 0-2.5-3.5m2.5 3.5-2.5 3.5m-11.5-3.5H2m5.5 0 2.5-3.5m-2.5 3.5 2.5 3.5"/></svg>`;
    flower.style.top = `${Math.random() * 100}%`;
    flower.style.left = `${Math.random() * 100}%`;
    flower.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random() * 1.5})`;
    bg.appendChild(flower);
  }
  appRoot.appendChild(bg);

  // Header
  const header = document.createElement('header');
  header.className = 'fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-10 bg-white/40 backdrop-blur-md z-50 border-b border-white/20 shadow-sm';
  header.innerHTML = `
    <div class="flex items-center gap-2">
      <svg class="text-yellow-400 w-8 h-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V2m0 5.5L15.5 4M12 7.5 8.5 4m3.5 11.5a4.5 4.5 0 1 1-4.5-4.5m4.5 4.5a4.5 4.5 0 1 0 4.5-4.5M12 15.5V22m0-6.5L15.5 20m-3.5-4.5L8.5 20m7-8h5.5m-5.5 0-2.5-3.5m2.5 3.5-2.5 3.5m-11.5-3.5H2m5.5 0 2.5-3.5m-2.5 3.5 2.5 3.5"/></svg>
      <h1 class="text-3xl font-serif italic text-blue-500 tracking-tight">Gift innit</h1>
    </div>
    ${state === QuizState.QUIZ ? `
      <div class="flex items-center gap-6">
        <div class="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full border border-yellow-200 shadow-sm flex items-center space-x-3">
          <span class="text-xs uppercase tracking-widest text-slate-400 font-bold">Timer</span>
          <span id="timer-display" class="text-xl font-mono text-blue-600">${formatTime(timeLeft)}</span>
        </div>
        <button id="finish-btn" class="bg-blue-400 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-500 transition-colors shadow-sm cursor-pointer">
          Finish Quiz
        </button>
      </div>
    ` : ''}
  `;
  appRoot.appendChild(header);
  document.getElementById('finish-btn')?.addEventListener('click', finishQuiz);

  const main = document.createElement('main');
  main.id = 'main-container';
  main.className = 'container mx-auto px-10 pt-28 pb-12 relative z-10 max-w-5xl min-h-screen';
  appRoot.appendChild(main);

  if (state === QuizState.IDLE) {
    renderIdle(main);
  } else if (state === QuizState.PROCESSING) {
    if (isProcessing) {
      renderProcessing(main);
    } else if (mcqs.length > 0) {
      renderReady(main);
    }
  } else if (state === QuizState.QUIZ) {
    renderQuiz(main);
  } else if (state === QuizState.REVIEW) {
    renderReview(main);
  }
}

function renderIdle(container: HTMLElement) {
  container.innerHTML = `
    <div class="flex flex-col items-center text-center space-y-12 mt-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div class="space-y-4">
        <h2 class="text-5xl font-serif italic text-slate-700">
          Elegant Quizzing, <span class="text-blue-500">Perfectly Gifted.</span>
        </h2>
        <p class="text-slate-500 text-xl max-w-xl mx-auto">
          Transform any PDF of MCQs into an interactive experience with a single upload.
        </p>
      </div>

      <label class="group relative cursor-pointer">
        <div class="w-80 h-80 bg-white/60 border-2 border-dashed border-yellow-200 rounded-[50px] flex flex-col items-center justify-center space-y-6 hover:border-blue-300 hover:bg-white/80 transition-all duration-500 shadow-2xl shadow-yellow-100/50">
          <div class="p-6 bg-yellow-50 rounded-full group-hover:bg-blue-50 transition-colors">
            <svg class="w-16 h-16 text-yellow-500 group-hover:text-blue-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div class="text-center">
            <span class="block text-xl font-semibold text-slate-700">Upload PDF</span>
            <span class="text-sm text-slate-400 uppercase tracking-widest font-bold">Max 10MB</span>
          </div>
        </div>
        <input type="file" id="pdf-upload" accept=".pdf" class="hidden" />
      </label>
    </div>
  `;
  document.getElementById('pdf-upload')?.addEventListener('change', handleFileUpload);
}

function renderProcessing(container: HTMLElement) {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center space-y-8 mt-40">
      <div class="relative">
        <div class="absolute inset-0 blur-3xl bg-blue-400/20 animate-pulse rounded-full" />
        <svg class="w-20 h-20 text-blue-400 animate-spin relative" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
      </div>
      <div class="text-center space-y-2">
        <p class="text-2xl font-serif italic text-slate-700 animate-pulse">Unwrapping your quiz...</p>
        <p class="text-slate-400 text-sm font-bold uppercase tracking-widest">Gift innit AI is analyzing document</p>
      </div>
    </div>
  `;
}

function renderReady(container: HTMLElement) {
  container.innerHTML = `
    <div class="flex flex-col items-center space-y-6 mt-40 animate-in zoom-in-95 duration-300">
      <div class="p-12 bg-white/80 backdrop-blur-lg border border-white/60 rounded-[40px] shadow-2xl shadow-yellow-100 text-center space-y-8 max-w-md">
        <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
          <svg class="w-10 h-10 text-green-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="space-y-2">
          <h3 class="text-3xl font-serif italic text-slate-800">Quiz is Ready!</h3>
          <p class="text-slate-500 font-medium">We've generated ${mcqs.length} interactive questions from your PDF.</p>
        </div>
        <button id="start-btn" class="w-full px-8 py-5 bg-blue-500 hover:bg-blue-600 text-white rounded-[2rem] font-bold shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-4 text-xl group cursor-pointer">
          Enter Quiz <svg class="w-6 h-6 group-hover:translate-x-2 transition-transform" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </div>
  `;
  document.getElementById('start-btn')?.addEventListener('click', startQuiz);
}

function renderQuiz(container: HTMLElement) {
  const currentMcq = mcqs[currentQuestionIndex];
  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white/70 backdrop-blur-md p-10 rounded-[40px] shadow-xl border border-white/20 relative">
          <div class="mb-8 flex justify-between items-center">
            <span class="bg-yellow-200 text-yellow-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              Question ${currentQuestionIndex + 1} of ${mcqs.length}
            </span>
            <div class="w-32 h-2 bg-slate-100/50 rounded-full overflow-hidden border border-white/40">
              <div class="h-full bg-blue-400 transition-all duration-500" style="width: ${((currentQuestionIndex + 1) / mcqs.length) * 100}%"></div>
            </div>
          </div>

          <h2 class="text-3xl font-semibold leading-relaxed text-slate-700 mb-10">
            ${currentMcq.question}
          </h2>

          <div class="grid gap-5">
            ${currentMcq.options.map((option, idx) => `
              <button 
                class="answer-option group flex items-center p-6 rounded-3xl border transition-all duration-300 text-left cursor-pointer ${
                  userAnswers[currentQuestionIndex] === option
                    ? 'bg-blue-500 border-blue-600 shadow-lg shadow-blue-200 scale-[1.02]'
                    : 'bg-white border-slate-100 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
                }"
                data-option="${option}"
              >
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center mr-6 font-bold text-xl transition-colors ${
                  userAnswers[currentQuestionIndex] === option ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500'
                }">
                  ${String.fromCharCode(65 + idx)}
                </div>
                <span class="text-xl ${userAnswers[currentQuestionIndex] === option ? 'text-white font-medium' : 'text-slate-600'}">
                  ${option}
                </span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="flex justify-between items-center px-4">
          <button id="prev-btn" ${currentQuestionIndex === 0 ? 'class="hidden"' : 'class="px-8 py-4 rounded-3xl font-bold text-slate-400 hover:bg-white/50 transition-all border border-transparent hover:border-slate-200 cursor-pointer"'}>
            Previous
          </button>
          <div class="flex gap-4 ml-auto">
            ${currentQuestionIndex === mcqs.length - 1 ? `
              <button id="finish-quiz-btn" class="px-12 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 rounded-3xl font-bold shadow-xl shadow-yellow-100 transition-all text-lg cursor-pointer">
                Finish Quiz
              </button>
            ` : `
              <button id="next-btn" ${!userAnswers[currentQuestionIndex] ? 'disabled class="px-12 py-4 bg-blue-500 text-white rounded-3xl font-bold opacity-50 cursor-not-allowed"' : 'class="px-12 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-3xl font-bold shadow-xl shadow-blue-200 transition-all text-lg cursor-pointer"'}>
                Next
              </button>
            `}
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white/40 border border-white/60 p-8 rounded-[32px] shadow-sm">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quiz Stats</h3>
          <div>
            <div class="text-sm text-slate-400 font-medium mb-1">Answered</div>
            <div class="text-4xl font-serif text-blue-500">
              ${userAnswers.filter(a => a).length} <span class="text-xl text-slate-300">/ ${mcqs.length}</span>
            </div>
          </div>
        </div>

        <div class="bg-white/60 p-8 rounded-[32px] border border-white/80 shadow-sm flex-1 flex flex-col max-h-[500px]">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Progress Review</h3>
          <div class="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            ${userAnswers.map((ans, i) => `
              <div class="p-4 rounded-2xl border transition-all ${
                ans ? 'bg-blue-50 border-blue-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'
              }">
                <div class="text-xs font-bold text-slate-400 mb-1">Question ${i + 1}</div>
                <div class="text-xs text-slate-600 truncate">${ans || 'Not answered yet...'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.answer-option').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer((btn as HTMLElement).dataset.option!));
  });
  document.getElementById('prev-btn')?.addEventListener('click', () => { currentQuestionIndex--; render(); });
  document.getElementById('next-btn')?.addEventListener('click', () => { currentQuestionIndex++; render(); });
  document.getElementById('finish-quiz-btn')?.addEventListener('click', finishQuiz);
}

function renderReview(container: HTMLElement) {
  if (!quizResult) return;
  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div class="lg:col-span-1 space-y-6">
        <div class="sticky top-28 space-y-6">
          <div class="bg-white/80 border border-white p-10 rounded-[40px] shadow-2xl text-center space-y-6">
            <div class="inline-block p-2 bg-yellow-100 rounded-full px-6 mb-2">
               <span class="text-yellow-700 font-bold tracking-widest uppercase text-xs">Final Result</span>
            </div>
            <div class="space-y-1">
              <div class="text-7xl font-serif text-blue-500">${quizResult.score}</div>
              <div class="text-xl text-slate-300 font-bold">OUT OF ${quizResult.total}</div>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div class="text-center">
                <div class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Accuracy</div>
                <div class="text-lg font-bold text-slate-700">${Math.round((quizResult.score / quizResult.total) * 100)}%</div>
              </div>
              <div class="text-center">
                <div class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Time</div>
                <div class="text-lg font-bold text-slate-700">${formatTime(quizResult.timeSpent)}</div>
              </div>
            </div>
          </div>

          <div class="grid gap-4">
            <button id="download-btn" class="w-full py-4 bg-white border border-slate-200 rounded-3xl hover:bg-slate-50 transition-all shadow-sm font-bold text-slate-600 flex items-center justify-center gap-2 cursor-pointer">
              <svg class="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Report
            </button>
            <button id="reset-btn" class="w-full py-4 bg-blue-500 text-white rounded-3xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-200 font-bold text-lg cursor-pointer">
              New Quiz
            </button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-8">
        ${quizResult.mcqs.map((mcq, idx) => {
          const isCorrect = quizResult?.userAnswers[idx] === mcq.correctAnswer;
          return `
            <div class="p-10 rounded-[40px] border-2 transition-all duration-500 ${
              isCorrect ? 'bg-green-50/30 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.2)]' : 'bg-red-50/30 border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.2)]'
            }">
              <div class="flex items-start justify-between mb-8">
                <div class="space-y-1">
                  <span class="text-[10px] uppercase font-black tracking-[0.2em] ${isCorrect ? 'text-green-500' : 'text-red-500'}">
                    Question ${idx + 1}
                  </span>
                  <h4 class="text-2xl font-semibold text-slate-700 leading-relaxed">${mcq.question}</h4>
                </div>
              </div>
              
              <div class="grid gap-4">
                <div class="p-5 rounded-2xl bg-white border ${isCorrect ? 'border-green-200' : 'border-red-200'} shadow-sm flex items-center gap-4">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                    ${isCorrect ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
                  </div>
                  <div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Your Answer</div>
                    <div class="text-lg font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}">${quizResult?.userAnswers[idx] || 'No Answer'}</div>
                  </div>
                </div>
                
                ${!isCorrect ? `
                  <div class="p-5 bg-green-400/10 border border-green-400/20 rounded-2xl flex items-center gap-4">
                    <div class="w-8 h-8 rounded-lg bg-green-400 flex items-center justify-center shrink-0">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div class="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-0.5">Correct Answer</div>
                      <div class="text-lg font-bold text-green-700">${mcq.correctAnswer}</div>
                    </div>
                  </div>
                  
                  ${mcq.explanation ? `
                    <div class="p-5 bg-red-50/50 border border-red-200/50 rounded-2xl mt-4">
                      <div class="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Why it's wrong</div>
                      <div class="text-slate-600 leading-relaxed">${mcq.explanation}</div>
                    </div>
                  ` : ''}
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  document.getElementById('download-btn')?.addEventListener('click', downloadResults);
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    state = QuizState.IDLE;
    mcqs = [];
    userAnswers = [];
    render();
  });
}

// Initial render and global setup
render();
window.addEventListener('click', handleGlobalClick);
