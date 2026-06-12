/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { CodingBlock, LevelStage } from "../types";
import { Trash2, Plus } from "lucide-react";

interface BlockWorkspaceProps {
  currentStage: LevelStage;
  onCodeChange: (code: string, blockStructure: CodingBlock[]) => void;
}

export default function BlockWorkspace({ currentStage, onCodeChange }: BlockWorkspaceProps) {
  const [activeBlocks, setActiveBlocks] = useState<CodingBlock[]>([]);

  // Update active blocks queue when stage resets or changes
  useEffect(() => {
    setActiveBlocks([]);
  }, [currentStage]);

  // When active blocks change, compile code and send update to the real-time editor!
  useEffect(() => {
    const compiledCode = activeBlocks.map((block) => block.code).join("");
    onCodeChange(compiledCode, activeBlocks);
  }, [activeBlocks]);

  const addBlockToWorkspace = (block: CodingBlock) => {
    // Generate unique ID for this instance so we can select same block multiple times!
    const blockInstance: CodingBlock = {
      ...block,
      id: `${block.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setActiveBlocks((prev) => [...prev, blockInstance]);
  };

  const removeBlockFromWorkspace = (uniqueId: string) => {
    setActiveBlocks((prev) => prev.filter((b) => b.id !== uniqueId));
  };

  const clearWorkspace = () => {
    setActiveBlocks([]);
  };

  return (
    <div id="block-workspace-root" className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full">
      {/* AVAILABLE BLOCKS PALETTE */}
      <div id="blocks-palette" className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col h-[320px] md:h-auto shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-tight text-slate-800 flex items-center gap-1.5">
            <span className="text-indigo-500 text-lg">🧩</span> Caixa de Blocos
          </h3>
          <span className="text-xs text-slate-400 font-medium">Clique para adicionar</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
          {currentStage.availableBlocks.map((block) => {
            let typeLabel = "comando";
            if (block.type === "variable") typeLabel = "variável";
            if (block.type === "loop") typeLabel = "repetição";
            if (block.type === "condition") typeLabel = "condicional";
            if (block.type === "function") typeLabel = "função";

            return (
              <button
                key={block.id}
                id={`block-palette-item-${block.id}`}
                onClick={() => addBlockToWorkspace(block)}
                className={`w-full text-left p-3 rounded-xl shadow-sm flex items-center justify-between cursor-pointer transition transform hover:-translate-y-0.5 active:scale-95 ${block.color}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs font-semibold leading-relaxed">{block.text}</span>
                  <span className="text-[9px] uppercase font-mono tracking-wider opacity-85">{typeLabel}</span>
                </div>
                <div className="bg-white/50 p-1 rounded-lg border border-black/5 hover:bg-white transition flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}

          {currentStage.availableBlocks.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              Nenhum bloco adicional pré-definido. Digite no editor ao lado!
            </div>
          )}
        </div>
      </div>

      {/* INSTALLED/ACTIVE BLOCKS FLOW */}
      <div id="active-blocks-flow" className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col h-[350px] md:h-auto min-h-[320px] shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-semibold tracking-tight text-slate-800 flex items-center gap-1.5">
            <span className="text-emerald-500 text-lg">⚙️</span> Lógica Montada
          </h3>
          {activeBlocks.length > 0 && (
            <button
              id="btn-clear-blocks"
              onClick={clearWorkspace}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-rose-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
          {activeBlocks.map((block, index) => (
            <div
              key={block.id}
              id={`block-active-item-${block.id}`}
              className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-mono shadow-sm ${block.color}`}
            >
              <div className="flex items-center gap-2">
                <span className="bg-white/40 w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] border border-black/5 text-slate-800">
                  {index + 1}
                </span>
                <span className="font-semibold">{block.text}</span>
              </div>
              <button
                id={`btn-remove-block-${block.id}`}
                onClick={() => removeBlockFromWorkspace(block.id)}
                className="opacity-75 hover:opacity-100 hover:bg-white text-slate-700 bg-white/40 border border-black/5 p-1.5 rounded-lg transition"
                title="Remover bloco"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {activeBlocks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-8">
              <span className="text-3xl">📥</span>
              <p className="text-xs text-center font-sans max-w-[200px] leading-relaxed text-slate-500">
                Toque nos blocos lógicos à esquerda para organizar seu algoritmo aqui!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
