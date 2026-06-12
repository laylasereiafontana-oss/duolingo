/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { STAGES } from "./stagesData";
import { LevelStage, LevelDifficulty, PlayerProfile, LeaderboardEntry, CodingBlock } from "./types";
import MascotBito from "./components/MascotBito";
import BlockWorkspace from "./components/BlockWorkspace";
import RealTimeEditor from "./components/RealTimeEditor";
import { 
  Trophy, Users, BookOpen, Sparkles, Wifi, WifiOff, UserPlus, 
  BrainCircuit, TrendingUp, Lock, CheckCircle2, Award, Zap, 
  RefreshCw, GraduationCap, ArrowRight, UserCheck, Code, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, hasCloudConnection, handleFirestoreError, OperationType } from "./lib/firebase";
import { doc, setDoc, getDoc, collection, getDocs, limit, query, orderBy } from "firebase/firestore";

export default function App() {
  // --- STATE CORE ---
  const [selectedDifficulty, setSelectedDifficulty] = useState<LevelDifficulty>(LevelDifficulty.EASY);
  const [activeStageId, setActiveStageId] = useState<string>("easy-1");
  const [compiledCode, setCompiledCode] = useState<string>("");
  const [activeBlocks, setActiveBlocks] = useState<CodingBlock[]>([]);
  const [activeTab, setActiveTab] = useState<"game" | "rankings" | "teacher">("game");

  // Character feedback states
  const [mascotTip, setMascotTip] = useState<string>("");
  const [characterExpression, setCharacterExpression] = useState<"happy" | "thinking" | "excited" | "proud" | "confused">("thinking");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Player Profile State (Automatically syncing with LocalStorage + Firebase if active)
  const [profile, setProfile] = useState<PlayerProfile>({
    uid: "offline-student-123",
    name: "Estudante CodeLingo 🦉",
    email: "laylasereiafontana@gmail.com",
    role: "student",
    xp: 0,
    level: 1,
    completedStages: [],
    teacherEmail: "mestre.bito@escola.edu.br",
    lastSyncedAt: new Date().toISOString(),
    streak: 3, // Initial consecutive day streak (Ofensiva)
    hearts: 5, // Hearts starting count (Vidas, 0-5)
  });

  // Simple, elegant sound generator using standard browser Web Audio APIs
  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      // Duolingo arpeggio chord: C4 (261.6hz) -> E4 (329.6hz) -> G4 (392hz) -> C5 (523.2hz)
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + index * 0.1);
        osc.type = "sine";
        
        gain.gain.setValueAtTime(0.12, now + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.4);
      });
    } catch (e) {
      console.warn("Audio blocked by browser permissions:", e);
    }
  };

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      // Low diagnostic dual alert tone representing heart loss: G3 (196hz) -> F3 (174.6hz)
      const notes = [196.00, 174.61];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + index * 0.15);
        osc.type = "triangle";
        
        gain.gain.setValueAtTime(0.1, now + index * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 0.35);
      });
    } catch (e) {
      console.warn("Audio blocked by browser permissions:", e);
    }
  };

  // State index tracking for Refill Mini-Quizzes
  const [quizIdx, setQuizIdx] = useState<number>(0);

  const QUIZ_QUESTIONS = [
    {
      title: "Como declaramos uma variável que pode mudar de valor no JavaScript/TypeScript?",
      options: ["let nome = 'Bito'", "const nome = 'Bito'", "function nome()"],
      correct: 0,
    },
    {
      title: "Qual dessas opções é um exemplo correto de uma estrutura de Loop de repetição?",
      options: ["if (condicao) { }", "for (let i=0; i<5; i++) { }", "let total = a + b"],
      correct: 1,
    },
    {
      title: "Para criar uma tomada de decisão condicional opcional em um fluxo, qual palavra-chave usamos?",
      options: ["for", "function", "if"],
      correct: 2,
    },
    {
      title: "Qual método nativo de arrays usamos para filtrar elementos com base em critérios lógica?",
      options: ["filter()", "push()", "length"],
      correct: 0,
    }
  ];

  const handleAnswerQuiz = (optionIdx: number) => {
    const q = QUIZ_QUESTIONS[quizIdx % QUIZ_QUESTIONS.length];
    if (optionIdx === q.correct) {
      const nextHearts = Math.min(5, profile.hearts + 1);
      const updatedProfile = {
        ...profile,
        hearts: nextHearts
      };
      saveUserData(updatedProfile);
      playSuccessSound();
      setMascotTip(`Incrível! Resposta certa sobre lógica! Você carregou +1 ❤️ e reativou seus circuitos.`);
      setCharacterExpression("excited");
    } else {
      playAlertSound();
      setMascotTip("Essa alternativa não estava sintonizada com a lógica! Estude a dica e tente novamente.");
      setCharacterExpression("confused");
    }
    setQuizIdx((prev) => prev + 1);
  };

  // Database lists
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { uid: "l-1", name: "Maria Codifica 🚀", xp: 650, completedCount: 7 },
    { uid: "l-2", name: "Layla Sereia (Você) 🧜‍♀️", xp: 150, completedCount: 2 },
    { uid: "l-3", name: "Pedrinho do For Loop ➿", xp: 190, completedCount: 3 },
    { uid: "l-4", name: "Gabi Binária 💾", xp: 90, completedCount: 1 },
    { uid: "l-5", name: "Luiz Variável 📦", xp: 50, completedCount: 1 },
  ]);

  // Offline / Online Status Indicator
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(hasCloudConnection);

  // Success celebration modal state
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [gainedXp, setGainedXp] = useState<number>(0);

  // Teacher Space Config (Prepopulated student base for realistic teacher monitoring)
  const [teacherEmailInput, setTeacherEmailInput] = useState<string>("");
  const [studentsList, setStudentsList] = useState<any[]>([
    { uid: "std-1", name: "Maria Codifica 🚀", email: "maria@escola.com", xp: 650, completedStagesCount: 7, completedStagesList: ["easy-1", "easy-2", "easy-3", "medium-1", "medium-2", "advanced-1", "advanced-2"], lastActive: "Hoje às 14:32" },
    { uid: "std-2", name: "Pedrinho do For Loop ➿", email: "pedrinho@escola.com", xp: 190, completedStagesCount: 3, completedStagesList: ["easy-1", "easy-2", "easy-3"], lastActive: "Há 10 minutos" },
    { uid: "std-3", name: "Gabi Binária 💾", email: "gabi@escola.com", xp: 90, completedStagesCount: 1, completedStagesList: ["easy-1"], lastActive: "Há 2 horas" },
    { uid: "std-4", name: "Luiz Variável 📦", email: "luiz@escola.com", xp: 50, completedStagesCount: 1, completedStagesList: ["easy-1"], lastActive: "Ontem" },
  ]);

  // AI-Pedagogical Advice state
  const [pedagogyAdvice, setPedagogyAdvice] = useState<string>(
    "Sugestão Pedagógica Bito AI: Os alunos Pedro e Luiz estão com dificuldades para assimilar loops de repetição de nível Médio 1. Sugerimos reforçar a analogia da engrenagem rotatória em sala com exercícios visuais."
  );
  const [isAdviceLoading, setIsAdviceLoading] = useState<boolean>(false);

  // --- CURRENT STAGE SELECTOR ---
  const currentStage = STAGES.find(s => s.id === activeStageId) || STAGES[0];

  // --- INITIAL DATA SYNC LOAD ---
  useEffect(() => {
    // 1. Initial LocalStorage Retrieval
    const localProfile = localStorage.getItem("bito_player_profile");
    if (localProfile) {
      try {
        const parsed = JSON.parse(localProfile);
        setProfile(parsed);
      } catch (e) {
        console.error("Erro carregando perfil do cache local", e);
      }
    }

    // 2. Fetch Firebase values if configured and online
    if (hasCloudConnection && db) {
      setIsCloudConnected(true);
      fetchCloudProfile();
      fetchCloudLeaderboard();
    }

    // Load initial Bito stage tip
    setMascotTip(currentStage.mascotTip);
    setCharacterExpression(currentStage.characterExpression);
  }, []);

  // Update Bito message when active stage switches
  useEffect(() => {
    setMascotTip(currentStage.mascotTip);
    setCharacterExpression(currentStage.characterExpression);
  }, [activeStageId]);

  // --- CLOUD FIREBASE SYNC FUNCTIONS ---
  const fetchCloudProfile = async () => {
    if (!db) return;
    try {
      const docRef = doc(db, "users", profile.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cloudData = docSnap.data() as PlayerProfile;
        setProfile(cloudData);
        localStorage.setItem("bito_player_profile", JSON.stringify(cloudData));
      }
    } catch (err) {
      console.warn("Bypassed cloud fetch: offline fallback activated.");
    }
  };

  const fetchCloudLeaderboard = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "leaderboard"), orderBy("xp", "desc"), limit(10));
      const querySnap = await getDocs(q);
      const list: LeaderboardEntry[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as LeaderboardEntry);
      });
      if (list.length > 0) {
        setLeaderboard(list);
      }
    } catch (err) {
      console.warn("Bypassed cloud leaderboard, loading offline fallback leaderboard.");
    }
  };

  // Automatically save state on write changes
  const saveUserData = async (newProfile: PlayerProfile) => {
    setProfile(newProfile);
    localStorage.setItem("bito_player_profile", JSON.stringify(newProfile));

    // Dynamic update top list
    setLeaderboard(prev => {
      const filtered = prev.filter(p => p.uid !== newProfile.uid);
      const updated = [...filtered, {
        uid: newProfile.uid,
        name: `${newProfile.name} (Você) 🧜‍♀️`,
        xp: newProfile.xp,
        completedCount: newProfile.completedStages.length
      }].sort((a, b) => b.xp - a.xp);
      return updated;
    });

    if (hasCloudConnection && db) {
      try {
        const userDocRef = doc(db, "users", newProfile.uid);
        await setDoc(userDocRef, {
          ...newProfile,
          lastSyncedAt: new Date().toISOString()
        });

        // Also update the global leaderboard record
        const leadDocRef = doc(db, "leaderboard", newProfile.uid);
        await setDoc(leadDocRef, {
          uid: newProfile.uid,
          name: newProfile.name,
          xp: newProfile.xp,
          completedCount: newProfile.completedStages.length
        });
        
        setIsCloudConnected(true);
      } catch (err) {
        console.warn("Cloud write pending. Saved to offline browser cache!");
        setIsCloudConnected(false);
      }
    }
  };

  const handleLinkTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmailInput.trim()) return;
    const updatedProfile = {
      ...profile,
      teacherEmail: teacherEmailInput.trim()
    };
    saveUserData(updatedProfile);
    setMascotTip(`Sensacional! Conectei sua matrícula ao professor: ${teacherEmailInput}! Seus relatórios de sintaxe e desempenho já estão sendo transmitidos em tempo real.`);
    setCharacterExpression("excited");
  };

  // --- ASK GEMINI AI FOR PERSONALIZED CODE REVIEWS ---
  const handleAskBitoAI = async () => {
    setIsAiLoading(true);
    setCharacterExpression("thinking");
    setMascotTip("Deixe-me conectar nos meus eletrodos neurais adicionais para analisar sua lógica... Só um instante!");

    try {
      const res = await fetch("/api/gemini/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageTitle: currentStage.title,
          difficulty: currentStage.difficulty,
          instructions: currentStage.instructions,
          studentCode: compiledCode || currentStage.placeholderCode,
          blockStructure: activeBlocks,
          goal: currentStage.targetGoal
        })
      });

      const data = await res.json();
      if (res.ok && data.feedback) {
        setMascotTip(data.feedback);
        // Toggle expressive facial rendering
        if (data.feedback.toLowerCase().includes("ótimo") || data.feedback.toLowerCase().includes("excelente") || data.feedback.toLowerCase().includes("suc")) {
          setCharacterExpression("proud");
        } else {
          setCharacterExpression("happy");
        }
      } else {
        throw new Error(data.error || "Erro de resposta da IA.");
      }
    } catch (err: any) {
      console.error(err);
      setMascotTip(`Acho que estou meio desconectado do meu módulo mestre Gemini: "${err.message}". Mas não desanime, confira se arrastou os blocos correspondentes de lógica!`);
      setCharacterExpression("confused");
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- ASK AI DYNAMIC PEDAGOGY PLAN ADJUSTMENT FOR TEACHER ---
  const handleAskTeacherPedagogy = async () => {
    setIsAdviceLoading(true);
    try {
      const studentSummaryInfo = studentsList.map(s => `${s.name} (XP: ${s.xp}, Concluídos: ${s.completedStagesCount}/7)`).join(", ");
      
      const res = await fetch("/api/gemini/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageTitle: "Painel do Educador",
          difficulty: "Conselho Avançado",
          instructions: "Gere um plano de reforço e ajuste dinâmico no plano de estudos para a turma.",
          studentCode: `// Alunos Ativos:\n${studentSummaryInfo}`,
          blockStructure: [],
          goal: "Ajudar os alunos no diagnóstico de conceitos pedagógicos de programação fácil e médio"
        })
      });

      const data = await res.json();
      if (res.ok && data.feedback) {
        setPedagogyAdvice(data.feedback);
      } else {
        throw new Error(data.error || "Erro de resposta do Gemini.");
      }
    } catch (err: any) {
      console.error(err);
      setPedagogyAdvice(`Bito AI sugere: Mantenha as aulas focadas em depuração manual. (Bito AI Offline por causa de limites na chave de API do Gemini)`);
    } finally {
      setIsAdviceLoading(false);
    }
  };

  // --- CODE EXECUTION SUCCESS TRIGGERED ---
  const handleStageSuccess = (xpAwarded: number) => {
    // Prevent duplicate triggers if already marked completed
    const isCompletedBefore = profile.completedStages.includes(currentStage.id);
    
    // Add stage to list
    const newCompleted = isCompletedBefore 
      ? profile.completedStages 
      : [...profile.completedStages, currentStage.id];

    // Calculate final rewards
    const newXp = isCompletedBefore ? profile.xp : profile.xp + xpAwarded;
    const finalLevel = Math.floor(newXp / 100) + 1;

    // Increase streak on active progress
    const activeStreak = isCompletedBefore ? profile.streak : profile.streak + 1;

    // Max 5 hearts, refilled by +1 on success
    const updatedHearts = Math.min(5, profile.hearts + (isCompletedBefore ? 0 : 1));

    const updatedProfile: PlayerProfile = {
      ...profile,
      xp: newXp,
      level: finalLevel,
      completedStages: newCompleted,
      streak: activeStreak,
      hearts: updatedHearts
    };

    saveUserData(updatedProfile);
    playSuccessSound(); // Play gorgeous Duolingo chords!

    // Set reward modal
    setGainedXp(isCompletedBefore ? 0 : xpAwarded);
    setShowRewardModal(true);
    setCharacterExpression("excited");
    setMascotTip(`Excelente! Código sintonizado com perfeição! Você recebeu +${xpAwarded} XP e subiu sua ofensiva para 🔥 ${activeStreak} dias seguidos! Mandou muito bem! 🎉`);
  };

  // --- CODE EXECUTION FAILURE TRIGGERED ---
  const handleStageFailure = () => {
    if (profile.hearts > 0) {
      const nextHearts = profile.hearts - 1;
      const updatedProfile: PlayerProfile = {
        ...profile,
        hearts: nextHearts
      };
      
      saveUserData(updatedProfile);
      playAlertSound(); // Play sad alert beep

      if (nextHearts === 0) {
        setMascotTip("Oh não! Suas baterias de corações esgotaram (0 ❤️)! Mas não desanime, resolva o mini-quiz abaixo para treinar e recarregar ou clique para renovar seus créditos!");
        setCharacterExpression("confused");
      } else {
        setMascotTip(`Ops! Um curto circuito aconteceu no seu código. Você perdeu 1 vida! Restam ${nextHearts} corações ❤️. Revise se arrastou os blocos logicamente!`);
        setCharacterExpression("confused");
      }
    }
  };

  // Clean values helper to reset player progress
  const handleResetAllProgress = () => {
    const freshProfile: PlayerProfile = {
      uid: "offline-student-123",
      name: "Estudante CodeLingo 🦉",
      email: "laylasereiafontana@gmail.com",
      role: "student",
      xp: 0,
      level: 1,
      completedStages: [],
      teacherEmail: "mestre.bito@escola.edu.br",
      lastSyncedAt: new Date().toISOString(),
      streak: 3,
      hearts: 5
    };
    saveUserData(freshProfile);
    setMascotTip("Seus circuitos e ofensiva do CodeLingo voltaram ao início! Vamos começar seu roteiro do absoluto zero!");
    setCharacterExpression("thinking");
  };

  // --- ACHIEVEMENT BADGES CHECKER ---
  const achievementsList = [
    { id: "ach-1", title: "Ligando os Circuitos", desc: "Concluiu a Fase 1 da Tomada", unlocked: profile.completedStages.includes("easy-1"), icon: "🔌" },
    { id: "ach-2", title: "Mestre das Variáveis", desc: "Criou sua primeira let nome", unlocked: profile.completedStages.includes("easy-2"), icon: "📦" },
    { id: "ach-3", title: "Rei do Loop", desc: "Rodou 5 iterações sem queimar fusível", unlocked: profile.completedStages.includes("medium-1"), icon: "🔁" },
    { id: "ach-4", title: "Cérebro Quente", desc: "Ligou o resfriamento de 80 graus", unlocked: profile.completedStages.includes("medium-2"), icon: "❄️" },
    { id: "ach-5", title: "Cientista Cósmico", desc: "Superou o filtro supremo de arrays do espaço", unlocked: profile.completedStages.includes("advanced-2"), icon: "🌌" },
  ];

  return (
    <div id="game-main-container" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ELIMINATED 5% PINK EXTRA BELT COMPLETELY AND SUBSTITUTED WITH PROFESSIONAL LIGHT SLATE ACCENT STRIP */}
      <div id="pastel-proportion-belt" className="h-1.5 w-full bg-gradient-to-r from-blue-200 via-indigo-200 to-teal-200 shadow-sm border-b border-white/20"></div>

      {/* TOP HEADER MENU */}
      <header id="game-navigation-bar" className="bg-white/90 border-b border-slate-200 backdrop-blur sticky top-0 z-40 px-4 py-3 shadow-[0_2px_12px_rgba(100,116,139,0.04)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-100 via-green-150 to-teal-100 rounded-xl flex items-center justify-center shadow-sm relative border border-emerald-250 animate-pulse">
              <span className="text-xl">🦉</span>
              {/* Intelligent Soft Amber Indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-slate-800">CodeLingo</h1>
                <span className="px-2 py-0.5 text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded uppercase tracking-wider">Aprenda Brincando</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium font-sans">Lições de lógica gamificadas no estilo Duolingo</p>
            </div>
          </div>

          {/* ACTIVE SCOREBAR AND TOGGLES */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* OFENSIVA / STREAK */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs cursor-default shadow-sm" title="Dias de estudo consecutivos">
              <span className="text-base text-amber-500">🔥</span>
              <span className="font-extrabold text-amber-700">{profile.streak} Of Ofensiva</span>
            </div>

            {/* VIDAS / HEARTS */}
            <div className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-xl text-xs shadow-sm cursor-default transition-all ${
              profile.hearts === 0 
                ? "bg-rose-50 border-rose-300 text-rose-700 font-extrabold animate-bounce" 
                : "bg-rose-50/40 border-rose-100 text-rose-600"
            }`} title="Baterias de corações restando">
              <span className="text-base">❤️</span>
              <span className="font-extrabold">{profile.hearts} / 5 Vidas</span>
            </div>

            {/* XP and Level Indicators */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-sm shadow-sm">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-300" />
              <div className="text-xs font-semibold">
                <span className="text-slate-500 mr-1">Nível:</span>
                <span className="font-extrabold text-slate-800">{profile.level}</span>
                <span className="mx-2 text-slate-250">|</span>
                <span className="text-slate-500 mr-1">XP total:</span>
                <span className="font-bold text-indigo-600">{profile.xp} XP</span>
              </div>
            </div>

            {/* Sync Cloud Indicator */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs shadow-sm">
              {isCloudConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-600 font-semibold font-sans text-[11px]">Sincronizado</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-450" />
                  <span className="text-slate-500 font-semibold font-sans text-[11px]">Modo Offline</span>
                </>
              )}
            </div>

            {/* TAB SELECTOR */}
            <nav id="game-tab-bar" className="bg-slate-100 p-1 rounded-xl border border-slate-200/60 flex items-center shadow-inner">
              <button
                id="tab-btn-game"
                onClick={() => setActiveTab("game")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "game"
                    ? "bg-white text-indigo-700 shadow-sm font-bold border border-slate-250/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Jogo
              </button>

              <button
                id="tab-btn-rankings"
                onClick={() => {
                  setActiveTab("rankings");
                  fetchCloudLeaderboard();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "rankings"
                    ? "bg-white text-indigo-700 shadow-sm font-bold border border-slate-250/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" /> Rankings
              </button>

              <button
                id="tab-btn-teacher"
                onClick={() => setActiveTab("teacher")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "teacher"
                    ? "bg-white text-indigo-700 shadow-sm font-bold border border-slate-250/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Professores
              </button>
            </nav>

          </div>
        </div>
      </header>

      {/* CORE WRAPPER SECTION */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* TAB 1: GAMEPLAY VIEW */}
        {activeTab === "game" && (
          <>
            {/* LEFT COLUMN: STAGES & CHARACTER CHAT (4 Cols) */}
            <section id="column-gameplay-guide" className="md:col-span-4 space-y-5">
              
              {/* CURRENT STAGE OVERVIEW CARD */}
              <div id="card-active-stage-metadata" className="bg-white border-l-4 border-indigo-400 border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 animate-pulse">
                    <span className="text-lg">🌍</span>
                    <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded text-slate-600 font-bold border border-slate-200/40">
                      Trilha: {currentStage.difficulty}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md ${
                    profile.completedStages.includes(currentStage.id) 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                      : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  }`}>
                    {profile.completedStages.includes(currentStage.id) ? "✔ Concluído" : "+XP Livre"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">{currentStage.title}</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">{currentStage.description}</p>
                </div>

                {/* Sub instructions list */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1 font-sans">
                    <span>💡</span> Instrução da Trilha:
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">{currentStage.instructions}</p>
                </div>
              </div>

              {/* MASCOT CHAT WITH BITO & GEMINI INTEGRATION */}
              <article id="mascot-section" className="space-y-3">
                <MascotBito 
                  expression={characterExpression} 
                  speechBubble={mascotTip}
                  onAskAI={handleAskBitoAI}
                  isAiLoading={isAiLoading}
                />
              </article>

              {/* QUIZ INTERATIVO DE RECARGA DE ENERGIA (VIDAS) */}
              {profile.hearts < 5 && (
                <div id="card-hearts-refill-quiz" className="bg-gradient-to-br from-amber-50/80 via-emerald-50/10 to-orange-50/40 border-2 border-dashed border-amber-300 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider font-sans">
                      <span>⚡</span> Treino de Recarga
                    </span>
                    <button 
                      id="btn-recharge-free"
                      onClick={() => {
                        const updated = { ...profile, hearts: 5 };
                        saveUserData(updated);
                        playSuccessSound();
                        setMascotTip("Bzzzt! Baterias solarmente carregadas! Seus 5 corações voltaram sem precisar fazer o quiz!");
                        setCharacterExpression("excited");
                      }}
                      className="text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200 transition"
                      title="Recarrega na hora"
                    >
                      Recarga Rápida Grátis Free
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-mono font-bold tracking-wide uppercase">Questão do Bito 🦉</p>
                    <h4 className="text-xs font-bold text-slate-850 leading-snug">
                      {QUIZ_QUESTIONS[quizIdx % QUIZ_QUESTIONS.length].title}
                    </h4>
                    
                    <div className="space-y-1.5">
                      {QUIZ_QUESTIONS[quizIdx % QUIZ_QUESTIONS.length].options.map((option, oIdx) => (
                        <button
                          key={oIdx}
                          id={`btn-quiz-option-${oIdx}`}
                          onClick={() => handleAnswerQuiz(oIdx)}
                          className="w-full text-left p-2.5 bg-white border border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/30 rounded-xl text-xs text-slate-700 font-semibold transition active:scale-[0.98] cursor-pointer shadow-sm"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LEVEL DIFFICULTY PILLS SELECTION */}
              <div id="card-difficulty-selector" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trilhas de Aprendizagem</h3>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200/40 px-2.5 py-0.5 rounded-full font-bold">7 Desafios</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(LevelDifficulty) as Array<keyof typeof LevelDifficulty>).map((key) => {
                    const diffName = LevelDifficulty[key];
                    let colorClass = "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100";
                    if (selectedDifficulty === diffName) {
                      colorClass = "bg-indigo-50 text-indigo-700 border-indigo-300 font-bold shadow-sm";
                    }

                    return (
                      <button
                        key={key}
                        id={`btn-select-difficulty-${key}`}
                        onClick={() => {
                          setSelectedDifficulty(diffName);
                          // Select first stage containing selected difficulty
                          const matchStage = STAGES.find(s => s.difficulty === diffName);
                          if (matchStage) {
                            setActiveStageId(matchStage.id);
                          }
                        }}
                        className={`py-2 text-[11px] rounded-xl border text-center transition cursor-pointer active:scale-95 ${colorClass}`}
                      >
                        {diffName}
                      </button>
                    );
                  })}
                </div>

                {/* STAGE SELECTION STACK */}
                <div className="space-y-2 pt-1.5">
                  {STAGES.filter(s => s.difficulty === selectedDifficulty).map((stage) => {
                    const isCompleted = profile.completedStages.includes(stage.id);
                    const isActive = stage.id === activeStageId;
                    
                    return (
                      <button
                        key={stage.id}
                        id={`btn-stage-select-${stage.id}`}
                        onClick={() => {
                          setActiveStageId(stage.id);
                          // Clear active and code states to initialize correctly
                          setCompiledCode("");
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between text-xs cursor-pointer active:scale-95 ${
                          isActive
                            ? "bg-slate-100 border-slate-300 shadow-sm text-slate-850 font-bold"
                            : isCompleted
                            ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs select-none">
                            {isCompleted ? "💚" : isActive ? "👉" : "🫥"}
                          </span>
                          <span className="truncate max-w-[190px] font-semibold">{stage.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1">
                          {stage.difficulty === "Fácil" ? "50 XP" : stage.difficulty === "Médio" ? "100 XP" : "150 XP"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CONNECT STUDENT TO A TEACHER FIELD */}
              <div id="card-student-teacher-connector" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Matrícula Escolar</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Vincule seu perfil ao e-mail de um tutor cadastrado para enviar relatórios automáticos de progresso.
                </p>

                <form onSubmit={handleLinkTeacher} className="flex gap-2">
                  <input
                    id="input-teacher-email"
                    type="email"
                    required
                    placeholder="professor@escola.com"
                    value={teacherEmailInput}
                    onChange={(e) => setTeacherEmailInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                  <button
                    id="btn-link-teacher"
                    type="submit"
                    className="bg-indigo-650 hover:bg-indigo-600 text-slate-800 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer"
                  >
                    Vincular
                  </button>
                </form>

                {profile.teacherEmail && (
                  <div className="flex items-center gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/50 mt-1 shadow-inner">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[10px] text-slate-650 font-semibold font-mono">Tutor Ativo: {profile.teacherEmail}</span>
                  </div>
                )}
              </div>

            </section>

            {/* RIGHT COLUMN: WORKSPACE & REAL-TIME RECONSTRUCTOR (8 Cols) */}
            <section id="column-coding-area" className="md:col-span-8 flex flex-col gap-5">
              
              {/* TOP EDITOR CARD */}
              <div id="card-workspace-panel" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex-1 flex flex-col gap-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 px-2.5 rounded bg-indigo-50 text-indigo-600 text-xs font-bold">Fase {currentStage.id.toUpperCase()}</span>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-tight font-sans">Arena de Sintaxe de Programação</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] text-indigo-600 font-mono tracking-wider font-bold uppercase">Mecânica de Blocos</span>
                  </div>
                </div>

                {/* VISUAL BLOCK PALETTE & Lógica flow */}
                <div className="flex-1">
                  <BlockWorkspace 
                    currentStage={currentStage} 
                    onCodeChange={(code, blocks) => {
                      setCompiledCode(code);
                      setActiveBlocks(blocks);
                    }}
                  />
                </div>
              </div>

              {/* COMPILATION GRAPHICS & RUNNER */}
              <div id="card-execution-sandbox" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                <RealTimeEditor 
                  currentStage={currentStage} 
                  compiledCode={compiledCode}
                  onStageSuccess={handleStageSuccess}
                  onStageFailure={handleStageFailure}
                  hearts={profile.hearts}
                />
              </div>

            </section>
          </>
        )}

        {/* TAB 2: GLOBAL LEADERBOARD VIEW */}
        {activeTab === "rankings" && (
          <section id="leaderboard-view" className="md:col-span-12 bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto w-full space-y-6">
            
            <div className="text-center space-y-2.5 max-w-md mx-auto">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-200/50 rounded-full flex items-center justify-center mx-auto text-xl shadow-sm">
                🏆
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Rankings de XP & Desempenho Global</h2>
              <p className="text-xs text-slate-500 leading-normal font-sans">
                Compreenda algoritmos, conclua estágios e suba degraus no placar escolar sincronizado de programação!
              </p>
            </div>

            {/* LEADERS LIST GRID */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 shadow-sm">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-indigo-700 font-mono font-bold uppercase tracking-wider p-3 bg-slate-100/60 border-b border-slate-200/60">
                <div className="col-span-1 text-center">Pos</div>
                <div className="col-span-6">Estudante</div>
                <div className="col-span-3 text-center">Estágios Concluídos</div>
                <div className="col-span-2 text-right">XP Acumulado</div>
              </div>

              {leaderboard.map((leader, idx) => {
                const isMe = leader.uid === profile.uid;
                
                return (
                  <div 
                    key={leader.uid}
                    className={`grid grid-cols-12 gap-2 p-4 items-center text-xs transition ${
                      isMe ? "bg-indigo-50/50 text-indigo-900 font-bold border-l-4 border-indigo-400" : "text-slate-600 hover:bg-slate-100/50"
                    }`}
                  >
                    <div className="col-span-1 text-center font-mono font-extrabold">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                    </div>
                    <div className="col-span-6 flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-white rounded-full border border-slate-205 flex items-center justify-center text-[10px] font-sans shadow-sm">
                        👶
                      </div>
                      <span className="truncate font-semibold">{leader.name}</span>
                    </div>
                    <div className="col-span-3 text-center font-mono font-bold text-slate-500">
                      {leader.completedCount} / 7
                    </div>
                    <div className="col-span-2 text-right font-mono font-extrabold text-indigo-600">
                      {leader.xp} XP
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MY STATS BOX */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
              <div className="flex items-center gap-3.5">
                <span className="text-3xl">🧜‍♀️</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Sua Posição Atual no Roteiro</h4>
                  <p className="text-[11px] text-slate-500 font-medium font-sans">Parabéns! Continue completando as trilhas para subir no ranking.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="text-center">
                  <span className="block text-lg font-mono font-black text-indigo-600">{profile.xp}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-black">Pontos</span>
                </div>
                <div className="text-center">
                  <span className="block text-lg font-mono font-black text-slate-800">{profile.completedStages.length}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-black">Trilhas</span>
                </div>
              </div>
            </div>

            {/* BUTTON TO RESET LOCAL STORAGE SIMULATING BRAND NEW STUDENT PROGRESS */}
            <div className="flex justify-center">
              <button
                id="btn-full-reset-flow"
                onClick={handleResetAllProgress}
                className="text-xs text-slate-400 hover:text-rose-600 font-medium p-2 hover:bg-rose-50/50 rounded-xl transition-all cursor-pointer"
              >
                Resetar Todos os Dados do Perfil de Jogo
              </button>
            </div>

          </section>
        )}

        {/* TAB 3: DETAILED TEACHER SPACE VIEW (School reports in Real Time) */}
        {activeTab === "teacher" && (
          <section id="column-teacher-workspace" className="md:col-span-12 bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-indigo-600 w-5 h-5" />
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                    Relatório Detalhado de Desempenho Docente
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Acompanhamento pedagógico ao vivo, com diagnóstico em tempo real, intervenção direcionada e inteligência artificial.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-xs shadow-inner">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span className="text-slate-600 font-semibold font-mono">Status: {isCloudConnected ? "Geral Sincronizado" : "Cache Local Ativo"}</span>
              </div>
            </div>

            {/* CORE KPI METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-1.5 shadow-sm">
                <span className="text-[10px] text-indigo-600 font-mono uppercase tracking-wider font-extrabold">Alunos Conectados</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-800">4 Ativos</span>
                  <span className="text-xs text-emerald-600 font-bold font-sans">100% Engajado</span>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-1.5 shadow-sm">
                <span className="text-[10px] text-indigo-600 font-mono uppercase tracking-wider font-extrabold">Média do XP da Turma</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-800">245 XP</span>
                  <span className="text-xs text-slate-400 font-semibold font-sans">Proficiência Regular</span>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-1.5 shadow-sm">
                <span className="text-[10px] text-indigo-600 font-mono uppercase tracking-wider font-extrabold">Aproveitamento Médio</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-800">42%</span>
                  <span className="text-xs text-slate-400 font-semibold font-sans">Trilha Concluída</span>
                </div>
              </div>
            </div>

            {/* DETAILED DRILLDOWN Performance reports TABLE */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <span>📋</span> Roster de Estudantes Conectados ao Seu Cadastro
              </h3>

              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 shadow-sm">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider p-3 bg-slate-50">
                  <div className="col-span-3">Nome</div>
                  <div className="col-span-3">E-mail</div>
                  <div className="col-span-3 text-center">Fases Feitas</div>
                  <div className="col-span-2 text-center">Última Atividade</div>
                  <div className="col-span-1 text-right">XP</div>
                </div>

                {studentsList.map((st) => (
                  <div key={st.uid} className="grid grid-cols-12 gap-2 text-xs p-4 items-center hover:bg-slate-50/50 transition-all text-slate-650">
                    <div className="col-span-3 flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] border border-slate-200/60 shadow-sm">
                        {st.name[0]}
                      </div>
                      <span className="font-semibold text-slate-850">{st.name}</span>
                    </div>
                    <div className="col-span-3 font-mono text-slate-450 text-[11px] truncate">{st.email}</div>
                    <div className="col-span-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center max-w-[170px] mx-auto">
                        {st.completedStagesList.map((lvl: string) => (
                          <span key={lvl} className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/40 font-semibold font-mono px-1.5 py-0.5 rounded shadow-sm">
                            {lvl.replace("easy-", "F").replace("medium-", "M").replace("advanced-", "A")}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 text-center text-slate-500 font-medium">{st.lastActive}</div>
                    <div className="col-span-1 text-right font-mono font-extrabold text-indigo-600">{st.xp} XP</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI DIAGNOSTIC AND STUDY PLAN SUGGESTIONS (Ajustes Dinâmicos) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="text-indigo-500 w-5 h-5 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Painel IA de Diagnóstico Pedagógico</h3>
                    <p className="text-[11px] text-slate-500 leading-normal">Intervenções proativas sugeridas com base no progresso consolidado.</p>
                  </div>
                </div>

                <button
                  id="btn-recalculate-pedagogy"
                  onClick={handleAskTeacherPedagogy}
                  disabled={isAdviceLoading}
                  className="text-xs px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-bold py-2 rounded-xl flex items-center gap-1.5 transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isAdviceLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Analisando métricas...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-100" />
                      Recalcular com Gemini AI
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed font-sans bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm relative">
                {pedagogyAdvice}
              </div>

              {/* DYNAMIC PLAN MODIFIER PRESET OVERLAY */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1 font-sans">
                    <span>⚙️</span> Ajuste Dinâmico da Trilha (Ações Rápidas)
                  </h4>
                  <span className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider">Modificação Instantânea</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    id="btn-action-slow-down"
                    onClick={() => {
                      setPedagogyAdvice("Ação Concluída: O plano de aula foi ajustado! O sistema inseriu 2 exercícios extras fáceis (reforço de variáveis) para os alunos com menos de 200 XP.");
                      setMascotTip("Seu professor enviou um sinal de reforço extra de variáveis! Acesse a Trilha Fácil para praticar seu algoritmo.");
                      setCharacterExpression("thinking");
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 hover:border-slate-300 text-left rounded-xl transition cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 block">Abrandamento de Ritmo</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-sans leading-relaxed">Adiciona mini-estágios adicionais de suporte de sintaxe antes de Loops</span>
                  </button>

                  <button
                    id="btn-action-speed-up"
                    onClick={() => {
                      setPedagogyAdvice("Ação Concluída: O plano de aula foi atualizado! Alunos avançados com mais de 500 XP receberam acesso direto a um desafio bônus estelar de Matrizes.");
                      setMascotTip("Impressionante! Seu tutor liberou um desafio avançado especial para você programar com arrays! Pronto para o espaço?");
                      setCharacterExpression("excited");
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 hover:border-slate-300 text-left rounded-xl transition cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 block">Aceleração de Conteúdo</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-sans leading-relaxed">Libera desafios bônus avançados de filtragem de ruídos com Arrays</span>
                  </button>
                </div>
              </div>

            </div>

          </section>
        )}

      </main>

      {/* FOOTER SECTION */}
      <footer id="footer-designer-specs" className="bg-white border-t border-slate-200 py-6 px-4 mt-8 shadow-[0_-2px_12px_rgba(100,116,139,0.02)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-medium font-sans">© 2026 Aventura dos Blocos de Código. Desenho de Interface Pastel Profissional.</p>
          <div className="flex gap-4 font-mono font-bold text-indigo-600">
            <span>Sintaxe Segura</span>
            <span className="text-slate-300">&#8226;</span>
            <span>Ambiente Sandboxed</span>
            <span className="text-slate-300">&#8226;</span>
            <span>Cloud Sync</span>
          </div>
        </div>
      </footer>

      {/* REWARD ACHIEVEMENT CELEBRATION MODAL */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-250 shadow-xl text-center space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm border border-emerald-250 animate-bounce">
                🚀
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Sinal Sintonizado com Sucesso!</h3>
                <p className="text-xs text-slate-600 font-medium">Você montou a lógica correta e completou o problema!</p>
              </div>

              {gainedXp > 0 ? (
                <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-2xl inline-block px-5">
                  <span className="text-xs font-bold text-slate-500 block">Sua recompensa:</span>
                  <span className="text-base font-black text-indigo-700">+{gainedXp} XP de Aprendizado</span>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl inline-block px-5 text-slate-500 text-xs font-semibold">
                  Lição já concluída anteriormente! (Reforço Livre)
                </div>
              )}

              <p className="text-[11px] text-slate-400 font-sans font-medium px-4">
                O progresso do seu chassi robótico já foi sincronizado na nuvem e enviado para a coordenação.
              </p>

              <button
                id="btn-close-reward-modal"
                onClick={() => setShowRewardModal(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold py-3 rounded-2xl shadow-md transition active:scale-95 cursor-pointer"
              >
                Próximo Desafio
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
