/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LevelStage } from "../types";
import { Play, RotateCcw, AlertTriangle, CheckCircle, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RealTimeEditorProps {
  currentStage: LevelStage;
  compiledCode: string;
  onStageSuccess: (xpAwarded: number) => void;
  onStageFailure?: () => void;
  hearts: number;
}

export default function RealTimeEditor({ currentStage, compiledCode, onStageSuccess, onStageFailure, hearts }: RealTimeEditorProps) {
  const [code, setCode] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Animation path states representing robot Bito in grid
  const [robotPos, setRobotPos] = useState({ r: 0, c: 0 });

  // Sync manual code text with logical block compiled code
  useEffect(() => {
    setCode(compiledCode || currentStage.placeholderCode);
  }, [compiledCode, currentStage]);

  // Reset simulator when stage changes
  useEffect(() => {
    resetSandbox();
  }, [currentStage]);

  const resetSandbox = () => {
    setTerminalLogs([]);
    setValidationError(null);
    setIsSuccess(false);
    setIsRunning(false);
    if (currentStage.startPos) {
      setRobotPos({ ...currentStage.startPos });
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setTerminalLogs(["🚀 Executando código do Bito..."]);
    setValidationError(null);
    setIsSuccess(false);

    // Initial grid configurations
    let currentPos = currentStage.startPos ? { ...currentStage.startPos } : { r: 0, c: 0 };
    setRobotPos({ ...currentPos });

    // Capture standard console.log output safely
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setTerminalLogs((prev) => [...prev, msg]);
    };

    // Delay helper for step-by-step grid animations
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Create sandboxed functions depending on the level
      const context: Record<string, any> = {};

      // Stage 1 grid environment integration
      if (currentStage.id === "easy-1") {
        context.moverFrente = async () => {
          await delay(600);
          if (currentPos.c < (currentStage.gridSize?.cols || 4) - 1) {
            currentPos.c += 1;
            setRobotPos({ ...currentPos });
            addLog("Andando para frente...");
          } else {
            addLog("⚠️ Bito bateu na parede direita!");
          }
        };

        context.virarEsquerda = async () => {
          await delay(400);
          addLog("Virando para a esquerda...");
        };

        context.carregarBateria = async () => {
          await delay(600);
          // Check if Bito is on target
          if (currentPos.r === currentStage.targetPos?.r && currentPos.c === currentStage.targetPos?.c) {
            addLog("Energia máxima! Bateria carregada com sucesso! 🔋");
          } else {
            addLog("⚡ Tentou carregar bateria, mas Bito não está na tomada de recarga!");
          }
        };
      }

      // Stage 4 loop helper
      if (currentStage.id === "medium-1") {
        let count = 0;
        context.reparar = () => {
          count++;
          addLog("Setor reparado!");
          if (count === 5) {
            addLog("Status do sistema: 100% sintonizado! 🛠️");
          }
        };
      }

      // Stage 5 control cooler helper
      if (currentStage.id === "medium-2") {
        context.temperatura = 85; 
        context.ligarResfriamento = () => {
          addLog("Ventiladores auxiliares acionados em potência máxima! CPU resfriando... ❄️");
        };
      }

      // Stage 7 arrays signals
      if (currentStage.id === "advanced-2") {
        context.bytes = [4, 15, 8, 23, 1];
      }

      // Build sandboxed runner executing user commands sequentially
      // For async grid actions we must await them in sequence
      const runUserCode = async (userScript: string) => {
        // Rewrite commands to look into context and append await for async ones in Easy 1
        let processed = userScript;
        if (currentStage.id === "easy-1") {
          processed = userScript
            .replace(/moverFrente\(\)/g, "await moverFrente()")
            .replace(/virarEsquerda\(\)/g, "await virarEsquerda()")
            .replace(/carregarBateria\(\)/g, "await carregarBateria()");
        }

        // Define variables that normally reside in global scopes as function scopes
        const scopeKeys = Object.keys(context);
        const scopeVals = Object.values(context);

        const sandboxedFunc = new Function(
          ...scopeKeys,
          `return (async () => {
            ${processed}
            
            // Custom validations for data-centric stages
            ${
              currentStage.id === "easy-2"
                ? `if (typeof nome !== 'undefined' && nome === 'Bito') {
                     logFn("Identidade do robô gravada com sucesso: Bito! 🎯");
                   }`
                : ""
            }
            ${
              currentStage.id === "easy-3"
                ? `if (typeof total !== 'undefined' && total === 100) {
                     logFn("Cálculo de Energia Ativo: 100% carregado! ⚡");
                   }`
                : ""
            }
            ${
              currentStage.id === "advanced-1"
                ? `if (typeof duplicarEnergia === 'function' && duplicarEnergia(50) === 100) {
                     logFn("Teste da função bem-sucedido: duplicarEnergia(50) = 100! 💡");
                   }`
                : ""
            }
            ${
              currentStage.id === "advanced-2"
                ? `if (typeof limpos !== 'undefined' && Array.isArray(limpos) && limpos.length === 2 && limpos[0] === 15 && limpos[1] === 23) {
                     logFn("Sinais de rádio nítidos decodificados: [15, 23] 🌌");
                   }`
                : ""
            }
          })()`
        );

        // Bind custom log function for evaluation block
        const testContextVals = [...scopeVals];
        if (currentStage.id === "easy-2" || currentStage.id === "easy-3" || currentStage.id === "advanced-1" || currentStage.id === "advanced-2") {
          // Pass logger hook
          (sandboxedFunc as any).logFn = addLog;
        }

        // Run the sandboxed wrapper
        await sandboxedFunc(...scopeVals, addLog);
      };

      await runUserCode(code);
      await delay(500);

      // Validate outputs using the stage's custom evaluator
      const valResult = eval(currentStage.validationFnCode || `(output) => false`);
      const parsedSuccess = valResult(logs, code);

      if (parsedSuccess) {
        setIsSuccess(true);
        addLog("✨ EXCELENTE! Objetivo alcançado!");
        // Wait another 700ms and reward student with active XP
        setTimeout(() => {
          const xpGained = currentStage.difficulty === "Fácil" ? 50 : currentStage.difficulty === "Médio" ? 100 : 150;
          onStageSuccess(xpGained);
        }, 1000);
      } else {
        setValidationError("Algoritmo executou, mas não cumpriu todos os critérios da lição. Verifique a dica do Bito!");
        if (onStageFailure) onStageFailure();
      }
    } catch (err: any) {
      console.error(err);
      setValidationError(`Erro de Sintaxe: ${err.message}`);
      addLog(`❌ Erro detectado: ${err.message}`);
      if (onStageFailure) onStageFailure();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div id="real-time-editor-root" className="flex flex-col gap-5 h-full">
      {/* SIMULATOR GRID OR CANVAS */}
      {currentStage.gridSize && (
        <div id="grid-simulator" className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col items-center shadow-sm">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-xs uppercase font-mono tracking-widest text-slate-500 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Simulador BitoGrid
            </span>
            <span className="text-xs font-mono text-slate-400 font-medium">
              Posição: ({robotPos.r}, {robotPos.c})
            </span>
          </div>

          <div className="flex gap-2 p-3 bg-white rounded-xl border border-slate-200/50 shadow-inner w-full justify-center">
            {Array.from({ length: currentStage.gridSize.cols }).map((_, c) => {
              const isRobot = robotPos.r === 0 && robotPos.c === c;
              const isTarget = currentStage.targetPos?.r === 0 && currentStage.targetPos?.c === c;

              return (
                <div
                  key={c}
                  className={`w-14 h-14 rounded-lg flex items-center justify-center relative border transition-all duration-300 ${
                    isRobot
                      ? "bg-blue-50 border-blue-400 shadow-sm text-blue-700"
                      : isTarget
                      ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  {isRobot ? (
                    <motion.span
                      layoutId="robot"
                      className="text-2xl"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      🤖
                    </motion.span>
                  ) : isTarget ? (
                    <span className="text-xl animate-pulse">🔌</span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-300 font-semibold">{c}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TEXT AREA CODE WINDOW */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col relative shadow-sm min-h-[220px]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-300"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300"></span>
            <span className="text-xs font-mono font-bold ml-2 text-slate-500">editor.ts</span>
          </div>
          <span className="text-xs text-slate-400 font-mono font-medium">JS / TypeScript</span>
        </div>

        <textarea
          id="student-code-text-area"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 w-full bg-transparent text-slate-700 font-mono text-xs focus:outline-none resize-none leading-relaxed h-[120px] md:h-auto border-0 focus:ring-0"
          placeholder="// Escreva seu algoritmo livremente aqui ou arraste blocos..."
        />

        {/* WORKSPACE ACTIONS */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <button
            id="btn-raw-reset"
            onClick={resetSandbox}
            className="text-slate-600 hover:text-slate-800 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-4 py-2 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
          </button>

          <button
            id="btn-run-code-engine"
            onClick={handleRunCode}
            disabled={isRunning || isSuccess || hearts <= 0}
            className={`font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              hearts <= 0 
                ? "bg-rose-100 text-rose-700 border border-rose-300 pointer-events-none" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-indigo-300"
            }`}
          >
            {hearts <= 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" /> Sem Corações! Recarregue
              </>
            ) : isRunning ? (
              <>
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full inline-block" />
                Compilando...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" /> Executar Código
              </>
            )}
          </button>
        </div>
      </div>

      {/* TERMINAL CONSOLE LOGGER */}
      <div id="output-console-terminal" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[180px]">
        <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-800">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold tracking-wide text-slate-400 uppercase">Console de Saída</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 font-mono text-slate-300 text-xs pr-1 scrollbar-thin">
          {terminalLogs.map((log, index) => (
            <div key={index} className="flex gap-1.5 p-0.5">
              <span className="text-slate-600 select-none">&gt;</span>
              <span>{log}</span>
            </div>
          ))}

          {terminalLogs.length === 0 && (
            <div className="text-slate-500 italic text-center py-5">
              Aguardando execução do código...
            </div>
          )}
        </div>

        {/* FEEDBACK STATUS INDICATORS */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3.5 text-xs text-rose-600 flex items-center gap-2 bg-rose-50 border border-rose-100 p-3 rounded-xl shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{validationError}</span>
            </motion.div>
          )}

          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3.5 text-xs text-emerald-700 flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl shadow-sm"
            >
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Maravilhoso! Nível completado com sucesso!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
