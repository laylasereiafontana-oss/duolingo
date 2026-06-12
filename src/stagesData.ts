/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelStage, LevelDifficulty } from "./types";

export const STAGES: LevelStage[] = [
  {
    id: "easy-1",
    difficulty: LevelDifficulty.EASY,
    title: "1. Ligando os Motores do Bito",
    description: "Ajude o Bito a chegar até a tomada de recarga! Ele precisa andar para frente duas vezes e conectar o plug.",
    instructions: "Monte a sequência correta arrastando ou clicando nos blocos: moverFrente(), moverFrente() e depois carregarBateria().",
    mascotTip: "Olá! Eu sou o Bito, seu novo amigo robô! 🤖 Meus capacitores estão quase vazios. Consegue guiar o plug de energia até a tomada?",
    characterExpression: "thinking",
    targetGoal: "moverFrente(); moverFrente(); carregarBateria();",
    gridSize: { rows: 1, cols: 4 },
    startPos: { r: 0, c: 0 },
    targetPos: { r: 0, c: 3 },
    obstacles: [],
    expectedOutput: ["Andando para frente...", "Andando para frente...", "Energia máxima! Bateria carregada com sucesso! 🔋"],
    validationFnCode: `(output) => output.includes("Energia máxima! Bateria carregada com sucesso! 🔋") && output.length >= 3`,
    placeholderCode: `// Arraste ou clique nos blocos de comandos para guiar o Bito!\n`,
    initialBlocks: [],
    availableBlocks: [
      { id: "mov", type: "command", text: "moverFrente()", code: "moverFrente();\n", color: "bg-sky-100 hover:bg-sky-200 text-sky-850 border border-sky-200/80 shadow-sm" },
      { id: "car", type: "command", text: "carregarBateria()", code: "carregarBateria();\n", color: "bg-emerald-100 hover:bg-emerald-200 text-emerald-850 border border-emerald-200/80 shadow-sm" },
      { id: "gir", type: "command", text: "virarEsquerda()", code: "virarEsquerda();\n", color: "bg-purple-100 hover:bg-purple-200 text-purple-850 border border-purple-200/80 shadow-sm" },
    ],
  },
  {
    id: "easy-2",
    difficulty: LevelDifficulty.EASY,
    title: "2. Criando Sua Primeira Variável",
    description: "Toda inteligência precisa de um nome! Vamos criar uma variável para guardar a identidade do nosso robô.",
    instructions: "Declare a variável let nome com o valor 'Bito'.",
    mascotTip: "Sabia que variáveis são como caixinhas onde guardamos informações? Vamos batizar este chassi de 'Bito' escrevendo let nome = 'Bito' no editor!",
    characterExpression: "happy",
    targetGoal: "let nome = \"Bito\";",
    expectedOutput: ["Identidade do robô gravada com sucesso: Bito! 🎯"],
    validationFnCode: `(output, code) => {
      const clean = code.replace(/\\s/g, "");
      return (clean.includes("letnome=\\"Bito\\"") || clean.includes("letnome='Bito'") || clean.includes("letnome=\`Bito\`"));
    }`,
    placeholderCode: `// Declare uma variável chamada nome e atribua o valor "Bito" a ela!\n`,
    initialBlocks: [],
    availableBlocks: [
      { id: "v_let", type: "variable", text: "let nome", code: "let nome", color: "bg-amber-100 hover:bg-amber-200 text-amber-850 border border-amber-200/80 shadow-sm" },
      { id: "v_eq", type: "value", text: "=", code: " = ", color: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-sm" },
      { id: "v_val", type: "value", text: '"Bito"', code: '"Bito";\n', color: "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 shadow-sm" },
      { id: "v_wrong", type: "value", text: '12345', code: '12345;\n', color: "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/60 shadow-sm" },
    ],
  },
  {
    id: "easy-3",
    difficulty: LevelDifficulty.EASY,
    title: "3. Sistema de Soma de Baterias",
    description: "Nossos painéis detectaram duas células de energia parcial: bateriaA (40%) e bateriaB (60%). Calcule a carga total somando-as!",
    instructions: "Crie uma variável total e atribua o cálculo bateriaA + bateriaB.",
    mascotTip: "Operadores matemáticos são super fáceis! Só precisamos somar bateriaA e bateriaB usando o sinal de mais (+) para totalizar 100% de carga!",
    characterExpression: "excited",
    targetGoal: "let total = bateriaA + bateriaB;",
    expectedOutput: ["Cálculo de Energia Ativo: 100% carregado! ⚡"],
    validationFnCode: `(output, code) => {
      const clean = code.replace(/\\s/g, "");
      return clean.includes("total=bateriaA+bateriaB") || clean.includes("total=bateriaB+bateriaA");
    }`,
    placeholderCode: `const bateriaA = 40;\nconst bateriaB = 60;\n// Guarde a soma delas na variável total!\n`,
    initialBlocks: [],
    availableBlocks: [
      { id: "s_let", type: "variable", text: "let total", code: "let total", color: "bg-amber-100 hover:bg-amber-200 text-amber-850 border border-amber-200/80 shadow-sm" },
      { id: "s_eq", type: "value", text: "=", code: " = ", color: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-sm" },
      { id: "s_add", type: "value", text: "bateriaA + bateriaB", code: "bateriaA + bateriaB;\n", color: "bg-sky-100 hover:bg-sky-200 text-sky-850 border border-sky-200/80 shadow-sm" },
    ],
  },
  {
    id: "medium-1",
    difficulty: LevelDifficulty.MEDIUM,
    title: "4. Loop de Reparação de Memória",
    description: "Temos 5 registros corrompidos de banco de dados. Vamos redefinir as células criando um loop de repetição que executa 5 vezes!",
    instructions: "Monte a estrutura de um loop for iniciando com i = 0, indo até i < 5 e incrementando i++.",
    mascotTip: "Com loops, podemos fazer códigos cansativos rodarem num piscar de olhos! Vamos atualizar os 5 setores chamando reparar() 5 vezes consecutivas!",
    characterExpression: "thinking",
    targetGoal: "for (let i = 0; i < 5; i++) { reparar(); }",
    expectedOutput: ["Setor reparado!", "Setor reparado!", "Setor reparado!", "Setor reparado!", "Setor reparado!", "Status do sistema: 100% sintonizado! 🛠️"],
    validationFnCode: `(output, code) => {
      return output.filter(x => x === "Setor reparado!").length === 5;
    }`,
    placeholderCode: `// Complete o loop para rodar a função reparar() 5 vezes!\n`,
    initialBlocks: [],
    availableBlocks: [
      { id: "f_for", type: "loop", text: "for (let i = 0; i < 5; i++) {", code: "for (let i = 0; i < 5; i++) {\n", color: "bg-teal-100 hover:bg-teal-200 text-teal-850 border border-teal-200/80 shadow-sm" },
      { id: "f_call", type: "command", text: "reparar()", code: "  reparar();\n", color: "bg-sky-100 hover:bg-sky-200 text-sky-850 border border-sky-200/80 shadow-sm" },
      { id: "f_close", type: "loop", text: "}", code: "}\n", color: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-sm" },
    ],
  },
  {
    id: "medium-2",
    difficulty: LevelDifficulty.MEDIUM,
    title: "5. Tomada de Decisão (CPU Cooler)",
    description: "A temperatura da nossa unidade central bateu níveis críticos de alerta! Escreva um teste lógico que liga os ventiladores de resfriamento se a temperatura passar de 80°C.",
    instructions: "Monte a condição if (temperatura > 80) e execute o comando ligarResfriamento() nele.",
    mascotTip: "O processador está pegando fogo! 🥵 Vamos testar se a variável temperatura é maior que 80 graus, e se for, ligamos os coolers!",
    characterExpression: "confused",
    targetGoal: "if (temperatura > 80) { ligarResfriamento(); }",
    expectedOutput: ["Ventiladores auxiliares acionados em potência máxima! CPU resfriando... ❄️"],
    validationFnCode: `(output, code) => {
      const clean = code.replace(/\\s/g, "");
      return clean.includes("if(temperatura>80)") && clean.includes("ligarResfriamento()");
    }`,
    placeholderCode: `let temperatura = 85;\n// Adicione a condição se a temperatura for maior que 80!\n`,
    initialBlocks: [],
    availableBlocks: [
      { id: "if_cond", type: "condition", text: "if (temperatura > 80) {", code: "if (temperatura > 80) {\n", color: "bg-indigo-100 hover:bg-indigo-200 text-indigo-850 border border-indigo-200/80 shadow-sm" },
      { id: "if_call", type: "command", text: "ligarResfriamento()", code: "  ligarResfriamento();\n", color: "bg-sky-100 hover:bg-sky-200 text-sky-850 border border-sky-200/80 shadow-sm" },
      { id: "if_close", type: "condition", text: "}", code: "}\n", color: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-sm" },
    ],
  },
  {
    id: "advanced-1",
    difficulty: LevelDifficulty.ADVANCED,
    title: "6. Módulos Auxiliares (Função Multiplicadora)",
    description: "Vamos modularizar nosso código! Crie uma função chamada duplicarEnergia que aceita uma potência de entrada e retorna o dobro dessa energia.",
    instructions: "Declare function duplicarEnergia(potencia) que execute return potencia * 2.",
    mascotTip: "Funções são blocos reutilizáveis incríveis! Podemos passar dados pras funções usando parâmetros. Vamos retornar o dobro da entrada!",
    characterExpression: "proud",
    targetGoal: "function duplicarEnergia(potencia) { return potencia * 2; }",
    expectedOutput: ["Teste da função bem-sucedido: duplicarEnergia(50) = 100! 💡"],
    validationFnCode: `(output, code) => {
      return output.includes("Teste da função bem-sucedido: duplicarEnergia(50) = 100! 💡");
    }`,
    placeholderCode: `// Crie a função duplicarEnergia que multiplica a entrada por 2!\n`,
    initialBlocks: [],
    availableBlocks: [
      { id: "fn_decl", type: "function", text: "function duplicarEnergia(potencia) {", code: "function duplicarEnergia(potencia) {\n", color: "bg-purple-100 hover:bg-purple-200 text-purple-850 border border-purple-200/80 shadow-sm" },
      { id: "fn_ret", type: "command", text: "return potencia * 2;", code: "  return potencia * 2;\n", color: "bg-sky-100 hover:bg-sky-200 text-sky-850 border border-sky-200/80 shadow-sm" },
      { id: "fn_close", type: "function", text: "}", code: "}\n", color: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-sm" },
    ],
  },
  {
    id: "advanced-2",
    difficulty: LevelDifficulty.ADVANCED,
    title: "7. Filtro de Ruídos Cósmicos (Arrays)",
    description: "Em órbita, recebemos ruídos de bytes de rádio: [4, 15, 8, 23, 1]. Precisamos filtrar o vetor descartando os bytes corrompidos de valor baixo (Filtre apenas elementos maiores ou iguais a 10).",
    instructions: "Aplique um filtro no array de bytes mantendo apenas valores >= 10.",
    mascotTip: "Isso é estatística estelar! Arrays guardam listas de dados. Usaremos a função array.filter() para filtrar os sinais limpos das estrelas!",
    characterExpression: "excited",
    targetGoal: "let limpos = bytes.filter(b => b >= 10);",
    expectedOutput: ["Sinais de rádio nítidos decodificados: [15, 23] 🌌"],
    validationFnCode: `(output, code) => {
      return output.includes("Sinais de rádio nítidos decodificados: [15, 23] 🌌");
    }`,
    placeholderCode: `const bytes = [4, 15, 8, 23, 1];\n// Crie a variável limpos filtrando valores >= 10!\n`,
    initialBlocks: [],
    availableBlocks: [
      { id: "arr_let", type: "variable", text: "let limpos", code: "let limpos", color: "bg-amber-100 hover:bg-amber-200 text-amber-850 border border-amber-200/80 shadow-sm" },
      { id: "arr_eq", type: "value", text: "=", code: " = ", color: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-sm" },
      { id: "arr_filt", type: "command", text: "bytes.filter(b => b >= 10)", code: "bytes.filter(b => b >= 10);\n", color: "bg-teal-100 hover:bg-teal-200 text-teal-850 border border-teal-200/80 shadow-sm" },
    ],
  },
];
