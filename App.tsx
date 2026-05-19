import { useState, useEffect, useCallback, useRef } from 'react';

// ============== TYPES ==============
type UserRole = 'director_geral' | 'subdiretor_pedagogico' | 'subdiretor_administrativo' | 'secretaria' | 'professor' | 'encarregado';

interface User {
  id: string;
  nome: string;
  sobrenome: string;
  nomeCompleto: string;
  email: string;
  senha: string;
  perfil: UserRole;
  foto: string;
  telefone: string;
  telefone2?: string;
  bilheteIdentidade: string;
  dataNascimento: string;
  genero: 'Masculino' | 'Feminino';
  estadoCivil: string;
  naturalidade: string;
  provincia: string;
  municipio: string;
  endereco: string;
  habilitacoes: string;
  formacaoAcademica: string;
  anoExperiencia: number;
  especialidade?: string;
  numeroAgente?: string;
  categoriaDocente?: string;
  dataAdmissao: string;
  iban?: string;
  nif?: string;
  inss?: string;
  observacoes?: string;
  ativo: boolean;
  dataCriacao: string;
}

interface Aluno {
  id: string;
  numeroMatricula: string;
  nomeCompleto: string;
  dataNascimento: string;
  genero: 'Masculino' | 'Feminino';
  foto: string;
  bilheteIdentidade?: string;
  naturalidade: string;
  provincia: string;
  municipio: string;
  endereco: string;
  grupoSanguineo?: string;
  doencaCronica?: string;
  nomeDoEncarregado: string;
  encarregadoId?: string;
  telefoneEncarregado: string;
  grauParentesco: string;
  classeId: string;
  turmaId: string;
  turnoId: string;
  anoLetivoMatricula: string;
  situacao: 'Ativo' | 'Transferido' | 'Desistente' | 'Concluído';
  dataCriacao: string;
  observacoes?: string;
}

interface Trimestre {
  id: string;
  nome: string;
  numero: 1 | 2 | 3;
  anoLetivoId: string;
  dataInicio: string;
  dataFim: string;
  estado: 'Aberto' | 'Fechado' | 'Em Andamento';
}

interface AnoLetivo {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  estado: 'Aberto' | 'Fechado' | 'Em Andamento';
  trimestres: Trimestre[];
}

interface Classe {
  id: string;
  nome: string;
  nivel: string;
  descricao?: string;
}

interface Turma {
  id: string;
  nome: string;
  classeId: string;
  turnoId: string;
  professorDiretorTurmaId?: string;
  sala?: string;
  capacidade: number;
  anoLetivoId: string;
}

interface Turno {
  id: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
}

interface Disciplina {
  id: string;
  nome: string;
  codigo: string;
  classeId: string;
  cargaHoraria: number;
  descricao?: string;
}

interface DisciplinaProfessor {
  id: string;
  professorId: string;
  disciplinaId: string;
  turmaId: string;
  anoLetivoId: string;
}

interface Nota {
  id: string;
  alunoId: string;
  disciplinaId: string;
  turmaId: string;
  trimestreId: string;
  anoLetivoId: string;
  mac: number | null;
  npp: number | null;
  npt: number | null;
  mt: number | null;
  observacao?: string;
}

interface Comunicado {
  id: string;
  titulo: string;
  mensagem: string;
  autorId: string;
  autorNome: string;
  destinatarios: UserRole[] | 'todos';
  destinatariosIds?: string[]; // IDs específicos de utilizadores
  dataPublicacao: string;
  prioridade: 'Normal' | 'Importante' | 'Urgente';
  lido?: string[]; // IDs de quem já leu
}

interface Presenca {
  id: string;
  alunoId: string;
  turmaId: string;
  disciplinaId: string;
  data: string;
  presente: boolean;
  justificacao?: string;
}

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  tipo: 'Reunião' | 'Feriado' | 'Exame' | 'Atividade' | 'Outro';
  criadoPor: string;
}

interface Ocorrencia {
  id: string;
  alunoId: string;
  tipo: 'Disciplinar' | 'Mérito' | 'Observação';
  descricao: string;
  data: string;
  registradoPor: string;
  gravidade?: 'Leve' | 'Moderada' | 'Grave';
}

interface Documento {
  id: string;
  tipo: 'Declaracao' | 'Boletim' | 'Certificado';
  alunoId: string;
  titulo: string;
  conteudo: string;
  criadoPor: string;
  dataCriacao: string;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  alunos: Aluno[];
  anosLetivos: AnoLetivo[];
  classes: Classe[];
  turmas: Turma[];
  turnos: Turno[];
  disciplinas: Disciplina[];
  disciplinasProfessor: DisciplinaProfessor[];
  notas: Nota[];
  comunicados: Comunicado[];
  presencas: Presenca[];
  eventos: Evento[];
  ocorrencias: Ocorrencia[];
  documentos: Documento[];
  lastSync: string | null;
  setupComplete: boolean;
}

// ============== CONSTANTS ==============
const ESCOLA_NOME = "Complexo Escolar Nkalambata";
const STORAGE_KEY = 'sge_nkalambata_data';

const PROVINCIAS_ANGOLA = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango',
  'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla',
  'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico',
  'Namibe', 'Uíge', 'Zaire'
];

const ROLE_LABELS: Record<UserRole, string> = {
  director_geral: 'Director Geral',
  subdiretor_pedagogico: 'Subdirector Pedagógico',
  subdiretor_administrativo: 'Subdirector Administrativo',
  secretaria: 'Secretária',
  professor: 'Professor',
  encarregado: 'Encarregado de Educação'
};

const HABILITACOES = ['Ensino Primário', 'Ensino Secundário - I Ciclo', 'Ensino Secundário - II Ciclo', 'Bacharelato', 'Licenciatura', 'Mestrado', 'Doutoramento'];
const GRAUS_PARENTESCO = ['Pai', 'Mãe', 'Avô', 'Avó', 'Tio', 'Tia', 'Irmão', 'Irmã', 'Outro'];

const defaultClasses: Classe[] = [
  { id: 'cl-1', nome: '1ª Classe', nivel: 'Ensino Primário', descricao: '' },
  { id: 'cl-2', nome: '2ª Classe', nivel: 'Ensino Primário', descricao: '' },
  { id: 'cl-3', nome: '3ª Classe', nivel: 'Ensino Primário', descricao: '' },
  { id: 'cl-4', nome: '4ª Classe', nivel: 'Ensino Primário', descricao: '' },
  { id: 'cl-5', nome: '5ª Classe', nivel: 'Ensino Primário', descricao: '' },
  { id: 'cl-6', nome: '6ª Classe', nivel: 'Ensino Primário', descricao: '' },
  { id: 'cl-7', nome: '7ª Classe', nivel: 'I Ciclo do Ensino Secundário', descricao: '' },
  { id: 'cl-8', nome: '8ª Classe', nivel: 'I Ciclo do Ensino Secundário', descricao: '' },
  { id: 'cl-9', nome: '9ª Classe', nivel: 'I Ciclo do Ensino Secundário', descricao: '' },
  { id: 'cl-10', nome: '10ª Classe', nivel: 'II Ciclo do Ensino Secundário', descricao: '' },
  { id: 'cl-11', nome: '11ª Classe', nivel: 'II Ciclo do Ensino Secundário', descricao: '' },
  { id: 'cl-12', nome: '12ª Classe', nivel: 'II Ciclo do Ensino Secundário', descricao: '' },
  { id: 'cl-13', nome: '13ª Classe', nivel: 'II Ciclo do Ensino Secundário', descricao: '' },
];

const defaultTurnos: Turno[] = [
  { id: 'tn-1', nome: 'Manhã', horaInicio: '07:00', horaFim: '12:30' },
  { id: 'tn-2', nome: 'Tarde', horaInicio: '13:00', horaFim: '18:00' },
  { id: 'tn-3', nome: 'Noite', horaInicio: '18:30', horaFim: '22:00' },
];

const defaultState: AppState = {
  currentUser: null,
  users: [],
  alunos: [],
  anosLetivos: [],
  classes: defaultClasses,
  turmas: [],
  turnos: defaultTurnos,
  disciplinas: [],
  disciplinasProfessor: [],
  notas: [],
  comunicados: [],
  presencas: [],
  eventos: [],
  ocorrencias: [],
  documentos: [],
  lastSync: null,
  setupComplete: false,
};

// ============== UTILITIES ==============
const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultState, ...parsed, currentUser: null };
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return { ...defaultState };
};

const saveState = (state: AppState) => {
  try {
    const toSave = { ...state, currentUser: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving state:', e);
  }
};

const getClassName = (classes: Classe[], id: string): string => classes.find(c => c.id === id)?.nome || 'N/A';
const getTurmaName = (turmas: Turma[], id: string): string => turmas.find(t => t.id === id)?.nome || 'N/A';
const getTurnoName = (turnos: Turno[], id: string): string => turnos.find(t => t.id === id)?.nome || 'N/A';
const getDisciplinaName = (disciplinas: Disciplina[], id: string): string => disciplinas.find(d => d.id === id)?.nome || 'N/A';
const getUserName = (users: User[], id: string): string => users.find(u => u.id === id)?.nomeCompleto || 'N/A';
const getActiveAnoLetivo = (anosLetivos: AnoLetivo[]): AnoLetivo | undefined => anosLetivos.find(a => a.estado === 'Aberto' || a.estado === 'Em Andamento');
const getActiveTrimestre = (anoLetivo: AnoLetivo | undefined): Trimestre | undefined => anoLetivo?.trimestres.find(t => t.estado === 'Aberto' || t.estado === 'Em Andamento');
const calcularMediaTrimestral = (mac: number | null, npp: number | null, npt: number | null): number | null => {
  if (mac === null || npp === null || npt === null) return null;
  return Math.round(((mac + npp + npt * 2) / 4) * 10) / 10;
};

// ============== FIREBASE SERVICE ==============
declare global {
  interface Window {
    firebase: any;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyDivpB49WezISoGxExglgJgfFit8IS9QDg",
  authDomain: "gestao-escolar-01.firebaseapp.com",
  projectId: "gestao-escolar-01",
  storageBucket: "gestao-escolar-01.firebasestorage.app",
  messagingSenderId: "622404754159",
  appId: "1:622404754159:web:69b6eff5e97ca19522591a"
};

let firestore: any = null;

const initFirebase = async () => {
  if (typeof window !== 'undefined' && window.firebase) {
    try {
      window.firebase.initializeApp(firebaseConfig);
      firestore = window.firebase.firestore();
      console.log('Firebase initialized');
      return true;
    } catch (e) {
      console.error('Firebase init error:', e);
    }
  }
  return false;
};

const syncToCloud = async (state: AppState): Promise<boolean> => {
  if (!firestore) return false;
  try {
    const dataToSync = { ...state, currentUser: null, lastSync: new Date().toISOString() };
    await firestore.collection('schools').doc('nkalambata').set(dataToSync);
    console.log('Synced to cloud');
    return true;
  } catch (e) {
    console.error('Sync error:', e);
    return false;
  }
};

const syncFromCloud = async (): Promise<AppState | null> => {
  if (!firestore) return null;
  try {
    const doc = await firestore.collection('schools').doc('nkalambata').get();
    if (doc.exists) {
      return doc.data() as AppState;
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
  return null;
};

// ============== EXPORT FUNCTIONS ==============
const exportToXLS = (state: AppState, filename: string) => {
  let content = '';
  content += 'UTILIZADORES\n';
  content += 'Nome\tEmail\tPerfil\tTelefone\tBI\tActivo\n';
  state.users.forEach(u => {
    content += `${u.nomeCompleto}\t${u.email}\t${ROLE_LABELS[u.perfil]}\t${u.telefone}\t${u.bilheteIdentidade}\t${u.ativo ? 'Sim' : 'Não'}\n`;
  });
  content += '\n\nALUNOS\n';
  content += 'Matrícula\tNome\tClasse\tTurma\tEncarregado\tTelefone\tSituação\n';
  state.alunos.forEach(a => {
    content += `${a.numeroMatricula}\t${a.nomeCompleto}\t${getClassName(state.classes, a.classeId)}\t${getTurmaName(state.turmas, a.turmaId)}\t${a.nomeDoEncarregado}\t${a.telefoneEncarregado}\t${a.situacao}\n`;
  });
  content += '\n\nNOTAS\n';
  content += 'Aluno\tDisciplina\tMAC\tNPP\tNPT\tMT\n';
  state.notas.forEach(n => {
    const aluno = state.alunos.find(a => a.id === n.alunoId);
    content += `${aluno?.nomeCompleto || 'N/A'}\t${getDisciplinaName(state.disciplinas, n.disciplinaId)}\t${n.mac ?? ''}\t${n.npp ?? ''}\t${n.npt ?? ''}\t${n.mt ?? ''}\n`;
  });
  const blob = new Blob(['\ufeff' + content], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToPDF = (state: AppState, _filename: string) => {
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${ESCOLA_NOME} - Backup</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background: #f3f4f6; }
        .header { text-align: center; margin-bottom: 30px; }
        .date { color: #6b7280; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 ${ESCOLA_NOME}</h1>
        <p class="date">Backup gerado em: ${new Date().toLocaleString('pt-AO')}</p>
      </div>
      <h2>👥 Utilizadores (${state.users.length})</h2>
      <table>
        <tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Telefone</th><th>Estado</th></tr>
        ${state.users.map(u => `<tr><td>${u.nomeCompleto}</td><td>${u.email}</td><td>${ROLE_LABELS[u.perfil]}</td><td>${u.telefone}</td><td>${u.ativo ? '✓ Activo' : '✗ Inactivo'}</td></tr>`).join('')}
      </table>
      <h2>🎒 Alunos (${state.alunos.length})</h2>
      <table>
        <tr><th>Matrícula</th><th>Nome</th><th>Classe</th><th>Turma</th><th>Encarregado</th><th>Situação</th></tr>
        ${state.alunos.map(a => `<tr><td>${a.numeroMatricula}</td><td>${a.nomeCompleto}</td><td>${getClassName(state.classes, a.classeId)}</td><td>${getTurmaName(state.turmas, a.turmaId)}</td><td>${a.nomeDoEncarregado}</td><td>${a.situacao}</td></tr>`).join('')}
      </table>
      <h2>📊 Resumo Estatístico</h2>
      <table>
        <tr><td>Total de Alunos Activos</td><td>${state.alunos.filter(a => a.situacao === 'Ativo').length}</td></tr>
        <tr><td>Total de Professores</td><td>${state.users.filter(u => u.perfil === 'professor').length}</td></tr>
        <tr><td>Total de Turmas</td><td>${state.turmas.length}</td></tr>
        <tr><td>Total de Disciplinas</td><td>${state.disciplinas.length}</td></tr>
      </table>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }
};

const exportToDOCX = (state: AppState, filename: string) => {
  let content = `${ESCOLA_NOME}\nBackup do Sistema - ${new Date().toLocaleString('pt-AO')}\n\n`;
  content += `${'='.repeat(60)}\n\n`;
  content += `UTILIZADORES (${state.users.length})\n${'-'.repeat(40)}\n`;
  state.users.forEach(u => {
    content += `• ${u.nomeCompleto} | ${u.email} | ${ROLE_LABELS[u.perfil]} | ${u.ativo ? 'Activo' : 'Inactivo'}\n`;
  });
  content += `\n\nALUNOS (${state.alunos.length})\n${'-'.repeat(40)}\n`;
  state.alunos.forEach(a => {
    content += `• [${a.numeroMatricula}] ${a.nomeCompleto} | ${getClassName(state.classes, a.classeId)} | ${a.situacao}\n`;
  });
  const blob = new Blob([content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

// ============== DOCUMENT GENERATION ==============
const generateDeclaracao = (aluno: Aluno, state: AppState, motivo: string): string => {
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const classe = state.classes.find(c => c.id === aluno.classeId);
  const turma = state.turmas.find(t => t.id === aluno.turmaId);
  const hoje = new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Declaração - ${aluno.nomeCompleto}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 50px; font-size: 14px; line-height: 1.8; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px double #000; padding-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
        .header h2 { margin: 5px 0; font-size: 18px; font-weight: normal; }
        .titulo { text-align: center; font-size: 20px; font-weight: bold; margin: 40px 0; text-decoration: underline; }
        .corpo { text-align: justify; margin: 30px 0; }
        .assinatura { margin-top: 80px; }
        .assinatura-linha { border-top: 1px solid #000; width: 300px; margin: 60px auto 10px; }
        .assinatura-nome { text-align: center; }
        .data { text-align: right; margin-top: 40px; }
        .selo { text-align: center; margin-top: 20px; color: #666; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 ${ESCOLA_NOME}</h1>
        <h2>República de Angola</h2>
        <p>NIF: 000000000 | Tel: +244 000 000 000</p>
      </div>
      
      <div class="titulo">DECLARAÇÃO</div>
      
      <div class="corpo">
        <p>Para os devidos efeitos, declara-se que <strong>${aluno.nomeCompleto}</strong>, 
        portador(a) do Bilhete de Identidade nº <strong>${aluno.bilheteIdentidade || '_______________'}</strong>, 
        natural de <strong>${aluno.naturalidade || '_______________'}</strong>, 
        Província de <strong>${aluno.provincia || '_______________'}</strong>, 
        nascido(a) aos <strong>${aluno.dataNascimento ? new Date(aluno.dataNascimento).toLocaleDateString('pt-AO') : '___/___/______'}</strong>, 
        é aluno(a) regularmente matriculado(a) neste estabelecimento de ensino, 
        frequentando a <strong>${classe?.nome || '___'}</strong>, 
        Turma <strong>${turma?.nome || '___'}</strong>, 
        no ano lectivo de <strong>${anoAtivo?.nome || new Date().getFullYear()}</strong>.</p>
        
        <p>A presente declaração é passada ${motivo || 'a pedido do interessado e para os fins que se julgar conveniente'}.</p>
      </div>
      
      <div class="data">
        <p>Luanda, aos ${hoje}</p>
      </div>
      
      <div class="assinatura">
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">
          <strong>A Direcção</strong><br>
          ${ESCOLA_NOME}
        </div>
      </div>
      
      <div class="selo">
        <p>Documento válido para os fins a que se destina</p>
        <p>Ref: DCL-${aluno.numeroMatricula}-${Date.now().toString(36).toUpperCase()}</p>
      </div>
    </body>
    </html>
  `;
};

const generateBoletim = (aluno: Aluno, state: AppState): string => {
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const classe = state.classes.find(c => c.id === aluno.classeId);
  const turma = state.turmas.find(t => t.id === aluno.turmaId);
  const turno = state.turnos.find(t => t.id === aluno.turnoId);
  const alunoNotas = state.notas.filter(n => n.alunoId === aluno.id);
  
  const disciplinasAluno = [...new Set(alunoNotas.map(n => n.disciplinaId))];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Boletim - ${aluno.nomeCompleto}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 15px; }
        .header h1 { margin: 0; font-size: 20px; color: #1e40af; }
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f3f4f6; padding: 15px; border-radius: 8px; }
        .info-col { flex: 1; }
        .info-item { margin: 5px 0; }
        .info-label { color: #666; font-size: 11px; }
        .info-value { font-weight: bold; }
        .foto { width: 100px; height: 120px; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; background: #f9f9f9; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background: #1e40af; color: white; font-size: 11px; }
        .disciplina { text-align: left; font-weight: 500; }
        .aprovado { color: #059669; font-weight: bold; }
        .reprovado { color: #dc2626; font-weight: bold; }
        .media-final { background: #fef3c7; font-weight: bold; }
        .footer { margin-top: 40px; display: flex; justify-content: space-around; }
        .assinatura { text-align: center; }
        .assinatura-linha { border-top: 1px solid #000; width: 200px; margin: 40px auto 5px; }
        .legenda { margin-top: 20px; font-size: 10px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 ${ESCOLA_NOME}</h1>
        <p>BOLETIM DE NOTAS - ANO LECTIVO ${anoAtivo?.nome || new Date().getFullYear()}</p>
      </div>
      
      <div class="info">
        <div class="info-col">
          <div class="info-item"><span class="info-label">Nome:</span> <span class="info-value">${aluno.nomeCompleto}</span></div>
          <div class="info-item"><span class="info-label">Nº Matrícula:</span> <span class="info-value">${aluno.numeroMatricula}</span></div>
          <div class="info-item"><span class="info-label">Data Nascimento:</span> <span class="info-value">${aluno.dataNascimento ? new Date(aluno.dataNascimento).toLocaleDateString('pt-AO') : 'N/A'}</span></div>
        </div>
        <div class="info-col">
          <div class="info-item"><span class="info-label">Classe:</span> <span class="info-value">${classe?.nome}</span></div>
          <div class="info-item"><span class="info-label">Turma:</span> <span class="info-value">${turma?.nome}</span></div>
          <div class="info-item"><span class="info-label">Turno:</span> <span class="info-value">${turno?.nome}</span></div>
        </div>
        <div class="foto">${aluno.foto ? `<img src="${aluno.foto}" style="width:100%;height:100%;object-fit:cover;">` : '📷 FOTO'}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th rowspan="2">Disciplina</th>
            ${anoAtivo?.trimestres.map(t => `<th colspan="4">${t.nome}</th>`).join('') || ''}
            <th rowspan="2">MF</th>
            <th rowspan="2">Resultado</th>
          </tr>
          <tr>
            ${anoAtivo?.trimestres.map(() => '<th>MAC</th><th>NPP</th><th>NPT</th><th>MT</th>').join('') || ''}
          </tr>
        </thead>
        <tbody>
          ${disciplinasAluno.map(discId => {
            const disc = state.disciplinas.find(d => d.id === discId);
            let mediaFinal = 0;
            let countTri = 0;
            const tds = anoAtivo?.trimestres.map(tri => {
              const nota = alunoNotas.find(n => n.disciplinaId === discId && n.trimestreId === tri.id);
              if (nota?.mt) { mediaFinal += nota.mt; countTri++; }
              return `<td>${nota?.mac ?? '-'}</td><td>${nota?.npp ?? '-'}</td><td>${nota?.npt ?? '-'}</td><td>${nota?.mt ?? '-'}</td>`;
            }).join('') || '';
            const mf = countTri > 0 ? Math.round((mediaFinal / countTri) * 10) / 10 : null;
            return `<tr><td class="disciplina">${disc?.nome || 'N/A'}</td>${tds}<td class="media-final">${mf ?? '-'}</td><td class="${mf && mf >= 10 ? 'aprovado' : 'reprovado'}">${mf ? (mf >= 10 ? 'Aprovado' : 'Reprovado') : '-'}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
      
      <div class="legenda">
        <p><strong>Legenda:</strong> MAC = Mini Avaliação Contínua | NPP = Nota de Prova Parcelar | NPT = Nota de Prova Trimestral | MT = Média Trimestral | MF = Média Final</p>
        <p><strong>Fórmula:</strong> MT = (MAC + NPP + NPT × 2) ÷ 4 | Aprovação: MT ≥ 10 valores</p>
      </div>
      
      <div class="footer">
        <div class="assinatura">
          <div class="assinatura-linha"></div>
          <p>Director de Turma</p>
        </div>
        <div class="assinatura">
          <div class="assinatura-linha"></div>
          <p>Encarregado de Educação</p>
        </div>
        <div class="assinatura">
          <div class="assinatura-linha"></div>
          <p>A Direcção</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateCertificado = (aluno: Aluno, state: AppState, tipoCertificado: string): string => {
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const classe = state.classes.find(c => c.id === aluno.classeId);
  const hoje = new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Certificado - ${aluno.nomeCompleto}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 40px; background: linear-gradient(135deg, #f5f5dc 0%, #fff8dc 100%); }
        .certificado { border: 8px double #8b4513; padding: 40px; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; color: #8b4513; }
        .header h2 { margin: 10px 0; font-size: 18px; color: #666; }
        .brasao { font-size: 60px; margin: 20px 0; }
        .titulo { text-align: center; font-size: 32px; font-weight: bold; color: #1e40af; margin: 30px 0; text-transform: uppercase; letter-spacing: 3px; }
        .corpo { text-align: center; font-size: 16px; line-height: 2; margin: 30px 50px; }
        .nome-aluno { font-size: 24px; font-weight: bold; color: #8b4513; border-bottom: 2px solid #8b4513; display: inline-block; padding: 0 20px; }
        .data { text-align: right; margin-top: 40px; font-style: italic; }
        .assinaturas { display: flex; justify-content: space-around; margin-top: 60px; }
        .assinatura { text-align: center; }
        .assinatura-linha { border-top: 2px solid #000; width: 200px; margin: 0 auto 10px; }
        .numero { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .selo { position: absolute; bottom: 100px; right: 100px; width: 80px; height: 80px; border: 3px solid #8b4513; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; color: #8b4513; }
      </style>
    </head>
    <body>
      <div class="certificado">
        <div class="header">
          <div class="brasao">🎓</div>
          <h1>${ESCOLA_NOME}</h1>
          <h2>República de Angola</h2>
        </div>
        
        <div class="titulo">Certificado ${tipoCertificado}</div>
        
        <div class="corpo">
          <p>Certificamos que</p>
          <p class="nome-aluno">${aluno.nomeCompleto}</p>
          <p>
            portador(a) do Bilhete de Identidade nº <strong>${aluno.bilheteIdentidade || '_______________'}</strong>,
            natural de <strong>${aluno.naturalidade || '_______________'}</strong>,
            concluiu com ${tipoCertificado === 'de Conclusão' ? 'aproveitamento' : 'distinção'} a 
            <strong>${classe?.nome || '_______________'}</strong>
            neste estabelecimento de ensino, no ano lectivo de <strong>${anoAtivo?.nome || new Date().getFullYear()}</strong>.
          </p>
        </div>
        
        <div class="data">
          <p>Luanda, aos ${hoje}</p>
        </div>
        
        <div class="assinaturas">
          <div class="assinatura">
            <div class="assinatura-linha"></div>
            <p><strong>O Director Geral</strong></p>
          </div>
          <div class="assinatura">
            <div class="assinatura-linha"></div>
            <p><strong>O Subdirector Pedagógico</strong></p>
          </div>
        </div>
        
        <div class="numero">
          <p>Certificado Nº: CERT-${aluno.numeroMatricula}-${Date.now().toString(36).toUpperCase()}</p>
          <p>Emitido em: ${new Date().toLocaleDateString('pt-AO')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const openDocumentWindow = (html: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

const downloadAsDoc = (html: string, filename: string) => {
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

// ============== UI COMPONENTS ==============
const Modal = ({ isOpen, onClose, title, children, size = 'lg' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' }) => {
  if (!isOpen) return null;
  const sizeClasses: Record<string, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, error, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <input className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm ${error ? 'border-red-500' : ''} ${className}`} {...props} />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const Select = ({ label, options, error, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[]; error?: string }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <select className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm bg-white ${error ? 'border-red-500' : ''} ${className}`} {...props}>
      <option value="">Selecione...</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const TextArea = ({ label, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <textarea className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm ${className}`} rows={3} {...props} />
  </div>
);

const Button = ({ variant = 'primary', size = 'md', className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'; size?: 'sm' | 'md' | 'lg' }) => {
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25',
  };
  const sizes: Record<string, string> = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return <button className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 ${className}`} {...props}>{children}</button>;
};

const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'orange' }) => {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-800', green: 'bg-emerald-100 text-emerald-800', red: 'bg-red-100 text-red-800', yellow: 'bg-amber-100 text-amber-800', purple: 'bg-purple-100 text-purple-800', gray: 'bg-gray-100 text-gray-800', orange: 'bg-orange-100 text-orange-800' };
  return <span className={`${colors[color]} px-2.5 py-0.5 rounded-full text-xs font-semibold`}>{children}</span>;
};

const Avatar = ({ src, name, size = 'md' }: { src?: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizes: Record<string, string> = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl', xl: 'w-24 h-24 text-3xl' };
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover border-2 border-white shadow`} />;
  return <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold border-2 border-white shadow`}>{initials}</div>;
};

const PhotoUpload = ({ currentPhoto, onPhotoChange, label = 'Fotografia' }: { currentPhoto: string; onPhotoChange: (photo: string) => void; label?: string }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert('A imagem deve ter no máximo 5MB'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => onPhotoChange(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative group">
        {currentPhoto ? <img src={currentPhoto} alt="Foto" className="w-28 h-28 rounded-2xl object-cover border-4 border-gray-200 shadow-lg" /> : <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-4 border-gray-200 shadow-lg"><span className="text-4xl">👤</span></div>}
        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition"><span className="text-white text-2xl">📷</span><input type="file" accept="image/*" onChange={handleChange} className="hidden" /></label>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }: { title: string; value: string | number; icon: string; color: string; subtitle?: string }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>{icon}</div>
    </div>
  </div>
);

const SearchBar = ({ value, onChange, placeholder = 'Pesquisar...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm bg-gray-50" />
  </div>
);

const Tabs = ({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) => (
  <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
    {tabs.map(tab => <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${active === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>{tab.label}</button>)}
  </div>
);

const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

// ============== SETUP PAGE ==============
const SetupPage = ({ onComplete }: { onComplete: (user: User) => void }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: '', sobrenome: '', email: '', senha: '', confirmarSenha: '', foto: '',
    telefone: '', bilheteIdentidade: '', dataNascimento: '', genero: 'Masculino' as 'Masculino' | 'Feminino',
    estadoCivil: '', naturalidade: '', provincia: '', municipio: '', endereco: '',
    habilitacoes: '', formacaoAcademica: '', anoExperiencia: 0, especialidade: '',
    numeroAgente: '', categoriaDocente: '', dataAdmissao: '', iban: '', nif: '', inss: '',
  });
  const [error, setError] = useState('');

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!form.nome || !form.sobrenome || !form.email || !form.senha) { setError('Preencha todos os campos obrigatórios'); return; }
      if (form.senha !== form.confirmarSenha) { setError('As senhas não coincidem'); return; }
      if (form.senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    }
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = () => {
    const newUser: User = {
      id: generateId(), nome: form.nome, sobrenome: form.sobrenome, nomeCompleto: `${form.nome} ${form.sobrenome}`,
      email: form.email, senha: form.senha, perfil: 'director_geral', foto: form.foto, telefone: form.telefone,
      telefone2: '', bilheteIdentidade: form.bilheteIdentidade, dataNascimento: form.dataNascimento,
      genero: form.genero, estadoCivil: form.estadoCivil, naturalidade: form.naturalidade, provincia: form.provincia,
      municipio: form.municipio, endereco: form.endereco, habilitacoes: form.habilitacoes, formacaoAcademica: form.formacaoAcademica,
      anoExperiencia: form.anoExperiencia, especialidade: form.especialidade, numeroAgente: form.numeroAgente,
      categoriaDocente: form.categoriaDocente, dataAdmissao: form.dataAdmissao, iban: form.iban, nif: form.nif,
      inss: form.inss, observacoes: '', ativo: true, dataCriacao: new Date().toISOString(),
    };
    onComplete(newUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl mb-4 border border-white/20 shadow-2xl text-4xl">🎓</div>
          <h1 className="text-3xl font-bold text-white mb-1">{ESCOLA_NOME}</h1>
          <p className="text-blue-200 text-sm">Configuração Inicial do Sistema</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/50'}`}>{s}</div>
                {s < 3 && <div className={`w-16 h-1 ${step > s ? 'bg-blue-500' : 'bg-white/20'}`}></div>}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {step === 1 && '👤 Dados de Acesso'}{step === 2 && '📋 Dados Pessoais'}{step === 3 && '🏢 Dados Profissionais'}
          </h2>
          {error && <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-red-200 text-sm mb-4">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <PhotoUpload currentPhoto={form.foto} onPhotoChange={foto => setForm({ ...form, foto })} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Nome *</label><input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 outline-none" /></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Sobrenome *</label><input type="text" value={form.sobrenome} onChange={e => setForm({ ...form, sobrenome: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-blue-100 mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Senha *</label><input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Confirmar *</label><input type="password" value={form.confirmarSenha} onChange={e => setForm({ ...form, confirmarSenha: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Telefone</label><input type="text" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">BI</label><input type="text" value={form.bilheteIdentidade} onChange={e => setForm({ ...form, bilheteIdentidade: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Data Nascimento</label><input type="date" value={form.dataNascimento} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Género</label><select value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value as 'Masculino' | 'Feminino' })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none"><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Província</label><select value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none"><option value="">Selecione...</option>{PROVINCIAS_ANGOLA.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Município</label><input type="text" value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-blue-100 mb-1">Endereço</label><input type="text" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Habilitações</label><select value={form.habilitacoes} onChange={e => setForm({ ...form, habilitacoes: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none"><option value="">Selecione...</option>{HABILITACOES.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">Formação</label><input type="text" value={form.formacaoAcademica} onChange={e => setForm({ ...form, formacaoAcademica: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-blue-100 mb-1">IBAN</label><input type="text" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">NIF</label><input type="text" value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
                <div><label className="block text-sm font-medium text-blue-100 mb-1">INSS</label><input type="text" value={form.inss} onChange={e => setForm({ ...form, inss: e.target.value })} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none" /></div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 ? <Button variant="secondary" onClick={() => setStep(step - 1)}>← Anterior</Button> : <div></div>}
            <Button onClick={handleNext}>{step === 3 ? '✓ Concluir' : 'Próximo →'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== LOGIN PAGE ==============
const LoginPage = ({ users, onLogin }: { users: User[]; onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = users.find(u => u.email === email && u.senha === senha && u.ativo);
    if (user) onLogin(user);
    else setError('Email ou senha inválidos.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl mb-4 border border-white/20 shadow-2xl text-4xl">🎓</div>
          <h1 className="text-3xl font-bold text-white mb-1">{ESCOLA_NOME}</h1>
          <p className="text-blue-200 text-sm">Sistema de Gestão Escolar</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Iniciar Sessão</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">📧</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.email@escola.ao" className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-blue-400 outline-none transition" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Senha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">🔒</span>
                <input type={showPassword ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-blue-400 outline-none transition" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition">{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
            {error && <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-red-200 text-sm flex items-center gap-2">⚠️ {error}</div>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg">Entrar</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============== MAIN APPLICATION ==============
export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initFirebase();
    const handleOnline = () => { setIsOnline(true); handleSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    saveState(state);
    if (isOnline && state.setupComplete) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => { syncToCloud(state).then(success => { if (success) setLastSyncTime(new Date().toISOString()); }); }, 5000);
    }
  }, [state, isOnline]);

  const handleSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    try {
      const cloudData = await syncFromCloud();
      if (cloudData && cloudData.lastSync && state.lastSync) {
        if (new Date(cloudData.lastSync) > new Date(state.lastSync)) {
          setState(prev => ({ ...cloudData, currentUser: prev.currentUser }));
        }
      }
      await syncToCloud(state);
      setLastSyncTime(new Date().toISOString());
    } catch (e) { console.error('Sync error:', e); }
    setSyncing(false);
  };

  const updateState = useCallback((updates: Partial<AppState>) => { setState(prev => ({ ...prev, ...updates })); }, []);

  const handleSetupComplete = (director: User) => { setState(prev => ({ ...prev, users: [director], setupComplete: true, currentUser: director })); };
  const handleLogin = (user: User) => { setState(prev => ({ ...prev, currentUser: user })); setActivePage('dashboard'); };
  const handleLogout = () => { setState(prev => ({ ...prev, currentUser: null })); };

  if (!state.setupComplete) return <SetupPage onComplete={handleSetupComplete} />;
  if (!state.currentUser) return <LoginPage users={state.users} onLogin={handleLogin} />;

  const user = state.currentUser;
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const trimestreAtivo = getActiveTrimestre(anoAtivo);

  const menuItems = [
    { id: 'dashboard', label: 'Painel Inicial', icon: '🏠', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
    { id: 'ano_letivo', label: 'Ano Lectivo', icon: '📅', roles: ['director_geral'] },
    { id: 'usuarios', label: 'Utilizadores', icon: '👥', roles: ['director_geral', 'subdiretor_administrativo', 'secretaria'] },
    { id: 'professores', label: 'Professores', icon: '👨‍🏫', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'] },
    { id: 'alunos', label: 'Alunos', icon: '🎒', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
    { id: 'classes_turmas', label: 'Classes e Turmas', icon: '🏫', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'] },
    { id: 'disciplinas', label: 'Disciplinas', icon: '📚', roles: ['director_geral', 'subdiretor_pedagogico', 'secretaria'] },
    { id: 'atribuicoes', label: 'Atribuições', icon: '🔗', roles: ['director_geral', 'subdiretor_pedagogico'] },
    { id: 'notas', label: 'Notas / Pautas', icon: '📝', roles: ['director_geral', 'subdiretor_pedagogico', 'professor', 'encarregado'] },
    { id: 'presencas', label: 'Presenças', icon: '✅', roles: ['professor', 'subdiretor_pedagogico', 'director_geral'] },
    { id: 'ocorrencias', label: 'Ocorrências', icon: '⚠️', roles: ['director_geral', 'subdiretor_pedagogico', 'professor', 'secretaria'] },
    { id: 'documentos', label: 'Documentos', icon: '📄', roles: ['director_geral', 'subdiretor_pedagogico', 'secretaria'] },
    { id: 'comunicados', label: 'Comunicados', icon: '📢', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
    { id: 'eventos', label: 'Eventos', icon: '🗓️', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
    { id: 'relatorios', label: 'Relatórios', icon: '📊', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'] },
    { id: 'backup', label: 'Backup', icon: '💾', roles: ['director_geral', 'subdiretor_administrativo'] },
    { id: 'perfil', label: 'Meu Perfil', icon: '👤', roles: ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
  ].filter(item => item.roles.includes(user.perfil));

  // Count unread comunicados
  const unreadCount = state.comunicados.filter(c => {
    if (c.destinatarios === 'todos' || (c.destinatarios as UserRole[]).includes(user.perfil) || c.destinatariosIds?.includes(user.id)) {
      return !c.lido?.includes(user.id);
    }
    return false;
  }).length;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage state={state} />;
      case 'ano_letivo': return <AnoLetivoPage anosLetivos={state.anosLetivos} onUpdate={a => updateState({ anosLetivos: a })} />;
      case 'usuarios': return <UsuariosPage users={state.users} currentUser={user} onUpdate={u => updateState({ users: u })} />;
      case 'professores': return <ProfessoresPage state={state} />;
      case 'alunos': return <AlunosPage state={state} onUpdate={a => updateState({ alunos: a })} />;
      case 'classes_turmas': return <ClassesTurmasPage state={state} onUpdateTurmas={t => updateState({ turmas: t })} />;
      case 'disciplinas': return <DisciplinasPage disciplinas={state.disciplinas} classes={state.classes} onUpdate={d => updateState({ disciplinas: d })} />;
      case 'atribuicoes': return <AtribuicoesPage state={state} onUpdate={a => updateState({ disciplinasProfessor: a })} />;
      case 'notas': return <NotasPage state={state} onUpdate={n => updateState({ notas: n })} />;
      case 'presencas': return <PresencasPage state={state} onUpdate={p => updateState({ presencas: p })} />;
      case 'ocorrencias': return <OcorrenciasPage state={state} onUpdate={o => updateState({ ocorrencias: o })} />;
      case 'documentos': return <DocumentosPage state={state} onUpdate={d => updateState({ documentos: d })} />;
      case 'comunicados': return <ComunicadosPage state={state} onUpdate={c => updateState({ comunicados: c })} />;
      case 'eventos': return <EventosPage eventos={state.eventos} currentUser={user} onUpdate={e => updateState({ eventos: e })} />;
      case 'relatorios': return <RelatoriosPage state={state} />;
      case 'backup': return <BackupPage state={state} onSync={handleSync} syncing={syncing} lastSyncTime={lastSyncTime} isOnline={isOnline} />;
      case 'perfil': return <PerfilPage user={user} onUpdate={u => updateState({ users: state.users.map(us => us.id === u.id ? u : us), currentUser: u })} />;
      default: return <DashboardPage state={state} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-blue-900 to-indigo-900 transform transition-all duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🎓</div>
            {sidebarOpen && <div><span className="text-white font-bold text-sm">{ESCOLA_NOME}</span><p className="text-blue-200/60 text-xs">SGE</p></div>}
          </div>
        </div>
        <div className="px-4 py-2 border-b border-white/10">
          <div className={`flex items-center gap-2 text-xs ${isOnline ? 'text-emerald-300' : 'text-amber-300'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></span>
            {sidebarOpen && <span>{isOnline ? 'Online' : 'Offline'}</span>}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activePage === item.id ? 'bg-white/20 text-white shadow-lg' : 'text-blue-100/70 hover:text-white hover:bg-white/10'}`}>
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
              {item.id === 'comunicados' && unreadCount > 0 && sidebarOpen && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <Avatar src={user.foto} name={user.nomeCompleto} size="sm" />
            {sidebarOpen && <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{user.nome}</p><p className="text-xs text-blue-200/60 truncate">{ROLE_LABELS[user.perfil]}</p></div>}
          </div>
          <button onClick={handleLogout} className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition"><span>🚪</span>{sidebarOpen && <span>Terminar Sessão</span>}</button>
        </div>
      </div>
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">☰</button>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-2 rounded-lg hover:bg-gray-100">☰</button>
              <div><h1 className="text-lg font-bold text-gray-800">{menuItems.find(m => m.id === activePage)?.label || 'SGE'}</h1><p className="text-xs text-gray-400">{anoAtivo?.nome} {trimestreAtivo ? `• ${trimestreAtivo.nome}` : ''}</p></div>
            </div>
            <div className="flex items-center gap-4">
              {syncing && <span className="text-xs text-blue-600 animate-pulse">🔄 Sincronizando...</span>}
              <div className="hidden sm:block text-right"><p className="text-sm font-medium text-gray-700">{user.nomeCompleto}</p><p className="text-xs text-gray-400">{ROLE_LABELS[user.perfil]}</p></div>
              <Avatar src={user.foto} name={user.nomeCompleto} />
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-6">{renderPage()}</main>
      </div>
    </div>
  );
}

// ============== PAGE COMPONENTS ==============

const DashboardPage = ({ state }: { state: AppState }) => {
  const user = state.currentUser!;
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const trimestreAtivo = getActiveTrimestre(anoAtivo);
  const totalAlunos = state.alunos.filter(a => a.situacao === 'Ativo').length;
  const totalProfessores = state.users.filter(u => u.perfil === 'professor' && u.ativo).length;
  const totalTurmas = state.turmas.length;
  const totalFuncionarios = state.users.filter(u => u.ativo && u.perfil !== 'encarregado').length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10">
          <p className="text-blue-200 text-sm">Bem-vindo(a) ao</p>
          <h1 className="text-2xl lg:text-3xl font-bold mt-1">{ESCOLA_NOME}</h1>
          <p className="text-blue-200 mt-1">{user.nomeCompleto} • {ROLE_LABELS[user.perfil]}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {anoAtivo ? <Badge color="green">Ano Lectivo: {anoAtivo.nome}</Badge> : <Badge color="red">Nenhum ano lectivo activo</Badge>}
            {trimestreAtivo && <Badge color="blue">{trimestreAtivo.nome}</Badge>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Alunos Activos" value={totalAlunos} icon="🎒" color="bg-gradient-to-br from-blue-500 to-blue-600" subtitle="Matriculados" />
        <StatCard title="Professores" value={totalProfessores} icon="👨‍🏫" color="bg-gradient-to-br from-emerald-500 to-emerald-600" subtitle="Activos" />
        <StatCard title="Turmas" value={totalTurmas} icon="🏫" color="bg-gradient-to-br from-purple-500 to-purple-600" />
        <StatCard title="Funcionários" value={totalFuncionarios} icon="👥" color="bg-gradient-to-br from-orange-500 to-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📢 Últimos Comunicados</h3>
          {state.comunicados.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Nenhum comunicado</p> : (
            <div className="space-y-3">
              {state.comunicados.slice(-3).reverse().map(c => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-gray-700">{c.titulo}</h4><Badge color={c.prioridade === 'Urgente' ? 'red' : c.prioridade === 'Importante' ? 'yellow' : 'blue'}>{c.prioridade}</Badge></div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.mensagem}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Informações Rápidas</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><span className="text-sm text-gray-600">Ano Lectivo</span><span className="text-sm font-semibold text-gray-800">{anoAtivo?.nome || 'Não definido'}</span></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><span className="text-sm text-gray-600">Trimestre</span><span className="text-sm font-semibold text-gray-800">{trimestreAtivo?.nome || 'Não definido'}</span></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><span className="text-sm text-gray-600">Disciplinas</span><span className="text-sm font-semibold text-gray-800">{state.disciplinas.length}</span></div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><span className="text-sm text-gray-600">Documentos</span><span className="text-sm font-semibold text-gray-800">{state.documentos?.length || 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnoLetivoPage = ({ anosLetivos, onUpdate }: { anosLetivos: AnoLetivo[]; onUpdate: (a: AnoLetivo[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: '', dataInicio: '', dataFim: '' });

  const handleCreate = () => {
    if (!form.nome || !form.dataInicio || !form.dataFim) return;
    const novoAno: AnoLetivo = { id: generateId(), nome: form.nome, dataInicio: form.dataInicio, dataFim: form.dataFim, estado: 'Fechado',
      trimestres: [
        { id: generateId(), nome: '1º Trimestre', numero: 1, anoLetivoId: '', dataInicio: '', dataFim: '', estado: 'Fechado' },
        { id: generateId(), nome: '2º Trimestre', numero: 2, anoLetivoId: '', dataInicio: '', dataFim: '', estado: 'Fechado' },
        { id: generateId(), nome: '3º Trimestre', numero: 3, anoLetivoId: '', dataInicio: '', dataFim: '', estado: 'Fechado' },
      ]
    };
    novoAno.trimestres = novoAno.trimestres.map(t => ({ ...t, anoLetivoId: novoAno.id }));
    onUpdate([...anosLetivos, novoAno]);
    setShowModal(false);
    setForm({ nome: '', dataInicio: '', dataFim: '' });
  };

  const toggleAno = (id: string) => {
    const updated = anosLetivos.map(a => { if (a.id === id) return { ...a, estado: (a.estado === 'Fechado' ? 'Aberto' : 'Fechado') as AnoLetivo['estado'] }; return { ...a, estado: 'Fechado' as AnoLetivo['estado'] }; });
    onUpdate(updated);
  };

  const toggleTrimestre = (anoId: string, triId: string) => {
    const updated = anosLetivos.map(ano => {
      if (ano.id !== anoId) return ano;
      const trimestres = ano.trimestres.map(t => { if (t.id === triId) return { ...t, estado: (t.estado === 'Fechado' ? 'Aberto' : 'Fechado') as Trimestre['estado'] }; return { ...t, estado: 'Fechado' as Trimestre['estado'] }; });
      return { ...ano, trimestres };
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-gray-800">Gestão do Ano Lectivo</h2></div><Button onClick={() => setShowModal(true)}>➕ Novo Ano</Button></div>
      {anosLetivos.length === 0 ? <div className="bg-white rounded-2xl p-12 text-center shadow-sm"><p className="text-gray-400">Nenhum ano lectivo</p></div> : (
        <div className="space-y-4">
          {anosLetivos.map(ano => (
            <div key={ano.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${ano.estado === 'Aberto' ? 'bg-emerald-100' : 'bg-gray-100'}`}>📅</div>
                    <div><h3 className="text-xl font-bold text-gray-800">{ano.nome}</h3><p className="text-sm text-gray-500">{new Date(ano.dataInicio).toLocaleDateString('pt-AO')} — {new Date(ano.dataFim).toLocaleDateString('pt-AO')}</p></div>
                  </div>
                  <div className="flex items-center gap-3"><Badge color={ano.estado === 'Aberto' ? 'green' : 'gray'}>{ano.estado}</Badge><Button variant={ano.estado === 'Aberto' ? 'danger' : 'success'} size="sm" onClick={() => toggleAno(ano.id)}>{ano.estado === 'Aberto' ? 'Fechar' : 'Abrir'}</Button></div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ano.trimestres.map(tri => (
                    <div key={tri.id} className={`rounded-xl border-2 p-4 ${tri.estado === 'Aberto' ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-gray-700">{tri.nome}</h4><Badge color={tri.estado === 'Aberto' ? 'green' : 'gray'}>{tri.estado}</Badge></div>
                      <Button variant={tri.estado === 'Aberto' ? 'danger' : 'success'} size="sm" className="w-full justify-center" disabled={ano.estado === 'Fechado'} onClick={() => toggleTrimestre(ano.id, tri.id)}>{tri.estado === 'Aberto' ? 'Fechar' : 'Abrir'}</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Ano Lectivo" size="md">
        <div className="space-y-4">
          <Input label="Nome" placeholder="Ex: 2025" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          <Input label="Início" type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
          <Input label="Fim" type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const UsuariosPage = ({ users, currentUser, onUpdate }: { users: User[]; currentUser: User; onUpdate: (u: User[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Partial<User>>({});

  const emptyForm: Partial<User> = { nome: '', sobrenome: '', email: '', senha: '', perfil: 'professor', foto: '', telefone: '', bilheteIdentidade: '', dataNascimento: '', genero: 'Masculino', estadoCivil: '', naturalidade: '', provincia: '', municipio: '', endereco: '', habilitacoes: '', formacaoAcademica: '', anoExperiencia: 0, ativo: true };
  const filtered = users.filter(u => u.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const canManageRole = (role: UserRole): boolean => {
    if (currentUser.perfil === 'director_geral') return true;
    if (currentUser.perfil === 'subdiretor_administrativo') return ['secretaria', 'professor'].includes(role);
    if (currentUser.perfil === 'secretaria') return ['encarregado'].includes(role);
    return false;
  };

  const availableRoles = Object.entries(ROLE_LABELS).filter(([role]) => canManageRole(role as UserRole));
  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (u: User) => { setForm(u); setEditing(u); setShowModal(true); };

  const handleSave = () => {
    if (!form.nome || !form.sobrenome || !form.email || !form.senha) return;
    const nomeCompleto = `${form.nome} ${form.sobrenome}`;
    if (editing) { onUpdate(users.map(u => u.id === editing.id ? { ...u, ...form, nomeCompleto } as User : u)); }
    else { const newUser: User = { ...emptyForm, ...form, nomeCompleto, id: generateId(), dataCriacao: new Date().toISOString() } as User; onUpdate([...users, newUser]); }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold text-gray-800">Utilizadores</h2><p className="text-sm text-gray-500">{users.length} utilizador(es)</p></div><Button onClick={openCreate}>➕ Novo</Button></div>
      <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar..." />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Utilizador</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Perfil</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Contacto</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Estado</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Acções</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar src={u.foto} name={u.nomeCompleto} size="sm" /><div><p className="text-sm font-semibold text-gray-800">{u.nomeCompleto}</p><p className="text-xs text-gray-400">{u.email}</p></div></div></td>
                  <td className="px-4 py-3"><Badge color={u.perfil === 'director_geral' ? 'purple' : u.perfil === 'professor' ? 'blue' : 'gray'}>{ROLE_LABELS[u.perfil]}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.telefone}</td>
                  <td className="px-4 py-3"><Badge color={u.ativo ? 'green' : 'red'}>{u.ativo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {canManageRole(u.perfil) && <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 mr-2">✏️</button>}
                    {canManageRole(u.perfil) && u.id !== currentUser.id && <button onClick={() => onUpdate(users.map(us => us.id === u.id ? { ...us, ativo: !us.ativo } : us))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">{u.ativo ? '🚫' : '✅'}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar' : 'Novo Utilizador'} size="2xl">
        <div className="space-y-6">
          <PhotoUpload currentPhoto={form.foto || ''} onPhotoChange={foto => setForm({ ...form, foto })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome *" value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} />
            <Input label="Sobrenome *" value={form.sobrenome || ''} onChange={e => setForm({ ...form, sobrenome: e.target.value })} />
            <Select label="Perfil *" value={form.perfil || ''} onChange={e => setForm({ ...form, perfil: e.target.value as UserRole })} options={availableRoles.map(([k, v]) => ({ value: k, label: v }))} />
            <Input label="Email *" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Senha *" type="text" value={form.senha || ''} onChange={e => setForm({ ...form, senha: e.target.value })} />
            <Input label="Telefone" value={form.telefone || ''} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            <Input label="BI" value={form.bilheteIdentidade || ''} onChange={e => setForm({ ...form, bilheteIdentidade: e.target.value })} />
            <Select label="Província" value={form.provincia || ''} onChange={e => setForm({ ...form, provincia: e.target.value })} options={PROVINCIAS_ANGOLA.map(p => ({ value: p, label: p }))} />
            <Input label="Município" value={form.municipio || ''} onChange={e => setForm({ ...form, municipio: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>{editing ? 'Guardar' : 'Criar'}</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const ProfessoresPage = ({ state }: { state: AppState }) => {
  const [search, setSearch] = useState('');
  const professores = state.users.filter(u => u.perfil === 'professor').filter(p => p.nomeCompleto.toLowerCase().includes(search.toLowerCase()));
  const getProfAtribuicoes = (profId: string) => state.disciplinasProfessor.filter(a => a.professorId === profId);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-800">Corpo Docente</h2><p className="text-sm text-gray-500">{professores.length} professor(es)</p></div>
      <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar..." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {professores.map(prof => {
          const attrs = getProfAtribuicoes(prof.id);
          return (
            <div key={prof.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <Avatar src={prof.foto} name={prof.nomeCompleto} size="lg" />
                <div><h3 className="font-bold text-gray-800">{prof.nomeCompleto}</h3><p className="text-xs text-gray-500">{prof.especialidade || 'Professor'}</p><Badge color={prof.ativo ? 'green' : 'red'}>{prof.ativo ? 'Activo' : 'Inactivo'}</Badge></div>
              </div>
              <div className="text-sm"><div className="flex justify-between"><span className="text-gray-500">Disciplinas:</span><span>{attrs.length}</span></div></div>
              {attrs.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{attrs.slice(0, 3).map(a => <span key={a.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{getDisciplinaName(state.disciplinas, a.disciplinaId)}</span>)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AlunosPage = ({ state, onUpdate }: { state: AppState; onUpdate: (a: Aluno[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Aluno | null>(null);
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [form, setForm] = useState<Partial<Aluno>>({});

  const currentUser = state.currentUser!;
  const canEdit = ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'].includes(currentUser.perfil);
  const visibleAlunos = currentUser.perfil === 'encarregado' ? state.alunos.filter(a => a.encarregadoId === currentUser.id) : state.alunos;
  const filtered = visibleAlunos.filter(a => { const matchSearch = a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || a.numeroMatricula.includes(search); const matchClasse = !filterClasse || a.classeId === filterClasse; return matchSearch && matchClasse; });

  const generateMatricula = () => `${new Date().getFullYear()}${String(state.alunos.length + 1).padStart(5, '0')}`;
  const emptyForm: Partial<Aluno> = { nomeCompleto: '', dataNascimento: '', genero: 'Masculino', foto: '', naturalidade: '', provincia: '', municipio: '', endereco: '', nomeDoEncarregado: '', telefoneEncarregado: '', grauParentesco: '', classeId: '', turmaId: '', turnoId: '', situacao: 'Ativo' };

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (a: Aluno) => { setForm(a); setEditing(a); setShowModal(true); };

  const handleSave = () => {
    if (!form.nomeCompleto || !form.classeId || !form.turmaId) return;
    if (editing) { onUpdate(state.alunos.map(a => a.id === editing.id ? { ...a, ...form } as Aluno : a)); }
    else { const newAluno: Aluno = { ...emptyForm, ...form, id: generateId(), numeroMatricula: generateMatricula(), dataCriacao: new Date().toISOString(), anoLetivoMatricula: getActiveAnoLetivo(state.anosLetivos)?.id || '' } as Aluno; onUpdate([...state.alunos, newAluno]); }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold text-gray-800">Alunos</h2><p className="text-sm text-gray-500">{filtered.length} aluno(s)</p></div>{canEdit && <Button onClick={openCreate}>➕ Matricular</Button>}</div>
      <div className="flex flex-wrap gap-3"><div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Pesquisar..." /></div><select value={filterClasse} onChange={e => setFilterClasse(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"><option value="">Todas as classes</option>{state.classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50"><th className="text-left px-4 py-3 text-xs text-gray-500">Aluno</th><th className="text-left px-4 py-3 text-xs text-gray-500">Matrícula</th><th className="text-left px-4 py-3 text-xs text-gray-500">Classe</th><th className="text-left px-4 py-3 text-xs text-gray-500">Turma</th><th className="text-left px-4 py-3 text-xs text-gray-500">Situação</th><th className="text-right px-4 py-3 text-xs text-gray-500">Acções</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar src={a.foto} name={a.nomeCompleto} size="sm" /><div><p className="text-sm font-semibold text-gray-800">{a.nomeCompleto}</p><p className="text-xs text-gray-400">{a.genero}</p></div></div></td>
                  <td className="px-4 py-3 text-sm font-mono">{a.numeroMatricula}</td>
                  <td className="px-4 py-3 text-sm">{getClassName(state.classes, a.classeId)}</td>
                  <td className="px-4 py-3 text-sm">{getTurmaName(state.turmas, a.turmaId)}</td>
                  <td className="px-4 py-3"><Badge color={a.situacao === 'Ativo' ? 'green' : 'red'}>{a.situacao}</Badge></td>
                  <td className="px-4 py-3 text-right">{canEdit && <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">✏️</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar' : 'Matricular'} size="2xl">
        <div className="space-y-6">
          <PhotoUpload currentPhoto={form.foto || ''} onPhotoChange={foto => setForm({ ...form, foto })} label="Foto do Aluno" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome Completo *" value={form.nomeCompleto || ''} onChange={e => setForm({ ...form, nomeCompleto: e.target.value })} className="sm:col-span-2" />
            <Input label="Data Nascimento" type="date" value={form.dataNascimento || ''} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} />
            <Select label="Género" value={form.genero || ''} onChange={e => setForm({ ...form, genero: e.target.value as 'Masculino' | 'Feminino' })} options={[{ value: 'Masculino', label: 'Masculino' }, { value: 'Feminino', label: 'Feminino' }]} />
            <Select label="Província" value={form.provincia || ''} onChange={e => setForm({ ...form, provincia: e.target.value })} options={PROVINCIAS_ANGOLA.map(p => ({ value: p, label: p }))} />
            <Select label="Classe *" value={form.classeId || ''} onChange={e => setForm({ ...form, classeId: e.target.value })} options={state.classes.map(c => ({ value: c.id, label: c.nome }))} />
            <Select label="Turma *" value={form.turmaId || ''} onChange={e => setForm({ ...form, turmaId: e.target.value })} options={state.turmas.filter(t => !form.classeId || t.classeId === form.classeId).map(t => ({ value: t.id, label: t.nome }))} />
            <Select label="Turno" value={form.turnoId || ''} onChange={e => setForm({ ...form, turnoId: e.target.value })} options={state.turnos.map(t => ({ value: t.id, label: t.nome }))} />
            <Input label="Encarregado" value={form.nomeDoEncarregado || ''} onChange={e => setForm({ ...form, nomeDoEncarregado: e.target.value })} />
            <Input label="Tel. Encarregado" value={form.telefoneEncarregado || ''} onChange={e => setForm({ ...form, telefoneEncarregado: e.target.value })} />
            <Select label="Parentesco" value={form.grauParentesco || ''} onChange={e => setForm({ ...form, grauParentesco: e.target.value })} options={GRAUS_PARENTESCO.map(g => ({ value: g, label: g }))} />
          </div>
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>{editing ? 'Guardar' : 'Matricular'}</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const ClassesTurmasPage = ({ state, onUpdateTurmas }: { state: AppState; onUpdateTurmas: (t: Turma[]) => void }) => {
  const [activeTab, setActiveTab] = useState('turmas');
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [turmaForm, setTurmaForm] = useState({ nome: '', classeId: '', turnoId: '', sala: '', capacidade: 40 });

  const handleCreateTurma = () => {
    if (!turmaForm.nome || !turmaForm.classeId) return;
    onUpdateTurmas([...state.turmas, { id: generateId(), ...turmaForm, professorDiretorTurmaId: '', anoLetivoId: getActiveAnoLetivo(state.anosLetivos)?.id || '' }]);
    setShowTurmaModal(false);
    setTurmaForm({ nome: '', classeId: '', turnoId: '', sala: '', capacidade: 40 });
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-800">Classes e Turmas</h2></div>
      <Tabs tabs={[{ id: 'turmas', label: 'Turmas' }, { id: 'classes', label: 'Classes' }, { id: 'turnos', label: 'Turnos' }]} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'turmas' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setShowTurmaModal(true)}>➕ Nova Turma</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.turmas.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between mb-3"><h3 className="text-lg font-bold text-gray-800">{t.nome}</h3><button onClick={() => onUpdateTurmas(state.turmas.filter(tu => tu.id !== t.id))} className="text-red-400">🗑️</button></div>
                <div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">Classe:</span><span>{getClassName(state.classes, t.classeId)}</span></div><div className="flex justify-between"><span className="text-gray-500">Turno:</span><span>{getTurnoName(state.turnos, t.turnoId)}</span></div><div className="flex justify-between"><span className="text-gray-500">Capacidade:</span><span>{t.capacidade}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full"><thead><tr className="bg-gray-50"><th className="text-left px-4 py-3 text-xs text-gray-500">Nome</th><th className="text-left px-4 py-3 text-xs text-gray-500">Nível</th><th className="text-left px-4 py-3 text-xs text-gray-500">Turmas</th></tr></thead><tbody className="divide-y">{state.classes.map(c => <tr key={c.id}><td className="px-4 py-3 font-semibold">{c.nome}</td><td className="px-4 py-3"><Badge color="blue">{c.nivel}</Badge></td><td className="px-4 py-3">{state.turmas.filter(t => t.classeId === c.id).length}</td></tr>)}</tbody></table>
        </div>
      )}
      {activeTab === 'turnos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{state.turnos.map(t => <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm"><h3 className="text-lg font-bold">{t.nome}</h3><p className="text-sm text-gray-500">{t.horaInicio} — {t.horaFim}</p></div>)}</div>
      )}
      <Modal isOpen={showTurmaModal} onClose={() => setShowTurmaModal(false)} title="Nova Turma" size="md">
        <div className="space-y-4">
          <Input label="Nome" value={turmaForm.nome} onChange={e => setTurmaForm({ ...turmaForm, nome: e.target.value })} placeholder="Ex: A" />
          <Select label="Classe" value={turmaForm.classeId} onChange={e => setTurmaForm({ ...turmaForm, classeId: e.target.value })} options={state.classes.map(c => ({ value: c.id, label: c.nome }))} />
          <Select label="Turno" value={turmaForm.turnoId} onChange={e => setTurmaForm({ ...turmaForm, turnoId: e.target.value })} options={state.turnos.map(t => ({ value: t.id, label: t.nome }))} />
          <Input label="Capacidade" type="number" value={turmaForm.capacidade} onChange={e => setTurmaForm({ ...turmaForm, capacidade: parseInt(e.target.value) || 0 })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowTurmaModal(false)}>Cancelar</Button><Button onClick={handleCreateTurma}>Criar</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const DisciplinasPage = ({ disciplinas, classes, onUpdate }: { disciplinas: Disciplina[]; classes: Classe[]; onUpdate: (d: Disciplina[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: '', codigo: '', classeId: '', cargaHoraria: 2 });

  const handleCreate = () => {
    if (!form.nome || !form.classeId) return;
    onUpdate([...disciplinas, { id: generateId(), ...form, descricao: '' }]);
    setShowModal(false);
    setForm({ nome: '', codigo: '', classeId: '', cargaHoraria: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-800">Disciplinas</h2><Button onClick={() => setShowModal(true)}>➕ Nova</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {disciplinas.map(d => (
          <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between mb-2"><div><h3 className="font-bold">{d.nome}</h3><p className="text-xs text-gray-400 font-mono">{d.codigo}</p></div><button onClick={() => onUpdate(disciplinas.filter(di => di.id !== d.id))} className="text-red-400">🗑️</button></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Classe:</span><Badge color="blue">{getClassName(classes, d.classeId)}</Badge></div>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Disciplina" size="md">
        <div className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Matemática" />
          <Input label="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: MAT" />
          <Select label="Classe" value={form.classeId} onChange={e => setForm({ ...form, classeId: e.target.value })} options={classes.map(c => ({ value: c.id, label: c.nome }))} />
          <Input label="Carga Horária" type="number" value={form.cargaHoraria} onChange={e => setForm({ ...form, cargaHoraria: parseInt(e.target.value) || 0 })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const AtribuicoesPage = ({ state, onUpdate }: { state: AppState; onUpdate: (a: DisciplinaProfessor[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ professorId: '', disciplinaId: '', turmaId: '' });
  const professores = state.users.filter(u => u.perfil === 'professor' && u.ativo);
  const selectedTurma = state.turmas.find(t => t.id === form.turmaId);
  const filteredDisciplinas = selectedTurma ? state.disciplinas.filter(d => d.classeId === selectedTurma.classeId) : state.disciplinas;

  const handleCreate = () => {
    if (!form.professorId || !form.disciplinaId || !form.turmaId) return;
    onUpdate([...state.disciplinasProfessor, { id: generateId(), ...form, anoLetivoId: getActiveAnoLetivo(state.anosLetivos)?.id || '' }]);
    setShowModal(false);
    setForm({ professorId: '', disciplinaId: '', turmaId: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-800">Atribuições</h2><Button onClick={() => setShowModal(true)}>➕ Nova</Button></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-3 text-xs text-gray-500">Professor</th><th className="text-left px-4 py-3 text-xs text-gray-500">Disciplina</th><th className="text-left px-4 py-3 text-xs text-gray-500">Turma</th><th className="text-right px-4 py-3 text-xs text-gray-500">Acção</th></tr></thead>
          <tbody className="divide-y">{state.disciplinasProfessor.map(a => <tr key={a.id}><td className="px-4 py-3 text-sm">{getUserName(state.users, a.professorId)}</td><td className="px-4 py-3"><Badge color="blue">{getDisciplinaName(state.disciplinas, a.disciplinaId)}</Badge></td><td className="px-4 py-3 text-sm">{getTurmaName(state.turmas, a.turmaId)}</td><td className="px-4 py-3 text-right"><button onClick={() => onUpdate(state.disciplinasProfessor.filter(at => at.id !== a.id))} className="text-red-400">🗑️</button></td></tr>)}</tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Atribuição" size="md">
        <div className="space-y-4">
          <Select label="Professor" value={form.professorId} onChange={e => setForm({ ...form, professorId: e.target.value })} options={professores.map(p => ({ value: p.id, label: p.nomeCompleto }))} />
          <Select label="Turma" value={form.turmaId} onChange={e => setForm({ ...form, turmaId: e.target.value })} options={state.turmas.map(t => ({ value: t.id, label: `${t.nome} (${getClassName(state.classes, t.classeId)})` }))} />
          <Select label="Disciplina" value={form.disciplinaId} onChange={e => setForm({ ...form, disciplinaId: e.target.value })} options={filteredDisciplinas.map(d => ({ value: d.id, label: d.nome }))} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Atribuir</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const NotasPage = ({ state, onUpdate }: { state: AppState; onUpdate: (n: Nota[]) => void }) => {
  const currentUser = state.currentUser!;
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const trimestreAtivo = getActiveTrimestre(anoAtivo);
  const isProfessor = currentUser.perfil === 'professor';
  const isEncarregado = currentUser.perfil === 'encarregado';
  const profAtribuicoes = isProfessor ? state.disciplinasProfessor.filter(a => a.professorId === currentUser.id) : [];
  const availableTurmas = isProfessor ? state.turmas.filter(t => profAtribuicoes.some(a => a.turmaId === t.id)) : state.turmas;
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState('');
  const selectedTurma = state.turmas.find(t => t.id === selectedTurmaId);
  const availableDisciplinas = selectedTurma ? (isProfessor ? state.disciplinas.filter(d => profAtribuicoes.some(a => a.turmaId === selectedTurmaId && a.disciplinaId === d.id)) : state.disciplinas.filter(d => d.classeId === selectedTurma.classeId)) : [];
  const turmaAlunos = selectedTurmaId ? state.alunos.filter(a => a.turmaId === selectedTurmaId && a.situacao === 'Ativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)) : [];

  if (isEncarregado) {
    const encarregadoAlunos = state.alunos.filter(a => a.encarregadoId === currentUser.id);
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Notas dos Meus Educandos</h2>
        {encarregadoAlunos.map(aluno => {
          const alunoNotas = state.notas.filter(n => n.alunoId === aluno.id);
          return (
            <div key={aluno.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50"><h3 className="font-bold">{aluno.nomeCompleto}</h3><p className="text-sm text-gray-500">{getClassName(state.classes, aluno.classeId)}</p></div>
              <table className="w-full"><thead><tr className="bg-gray-50"><th className="text-left px-4 py-2 text-xs">Disciplina</th><th className="text-center px-4 py-2 text-xs">MAC</th><th className="text-center px-4 py-2 text-xs">NPP</th><th className="text-center px-4 py-2 text-xs">NPT</th><th className="text-center px-4 py-2 text-xs">MT</th><th className="text-center px-4 py-2 text-xs">Resultado</th></tr></thead>
              <tbody>{alunoNotas.map(n => <tr key={n.id}><td className="px-4 py-2 text-sm">{getDisciplinaName(state.disciplinas, n.disciplinaId)}</td><td className="px-4 py-2 text-center">{n.mac ?? '-'}</td><td className="px-4 py-2 text-center">{n.npp ?? '-'}</td><td className="px-4 py-2 text-center">{n.npt ?? '-'}</td><td className="px-4 py-2 text-center font-bold">{n.mt ?? '-'}</td><td className="px-4 py-2 text-center">{n.mt !== null && <Badge color={n.mt >= 10 ? 'green' : 'red'}>{n.mt >= 10 ? 'Aprovado' : 'Reprovado'}</Badge>}</td></tr>)}</tbody></table>
            </div>
          );
        })}
      </div>
    );
  }

  const getOrCreateNota = (alunoId: string): Nota => {
    const existing = state.notas.find(n => n.alunoId === alunoId && n.disciplinaId === selectedDisciplinaId && n.turmaId === selectedTurmaId && n.trimestreId === trimestreAtivo?.id);
    if (existing) return existing;
    return { id: generateId(), alunoId, disciplinaId: selectedDisciplinaId, turmaId: selectedTurmaId, trimestreId: trimestreAtivo?.id || '', anoLetivoId: anoAtivo?.id || '', mac: null, npp: null, npt: null, mt: null };
  };

  const updateNota = (alunoId: string, field: 'mac' | 'npp' | 'npt', value: string) => {
    const numValue = value === '' ? null : Math.min(20, Math.max(0, parseFloat(value)));
    const nota = getOrCreateNota(alunoId);
    const updated = { ...nota, [field]: numValue };
    updated.mt = calcularMediaTrimestral(updated.mac, updated.npp, updated.npt);
    const existingIndex = state.notas.findIndex(n => n.id === nota.id);
    if (existingIndex >= 0) { const newNotas = [...state.notas]; newNotas[existingIndex] = updated; onUpdate(newNotas); }
    else { onUpdate([...state.notas, updated]); }
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-800">Notas</h2><p className="text-sm text-gray-500">{trimestreAtivo ? `${trimestreAtivo.nome} - ${anoAtivo?.nome}` : 'Nenhum trimestre activo'}</p></div>
      {!trimestreAtivo ? <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center"><p className="text-amber-800">⚠️ Abra um trimestre para lançar notas.</p></div> : (
        <>
          <div className="flex flex-wrap gap-3">
            <Select label="Turma" value={selectedTurmaId} onChange={e => { setSelectedTurmaId(e.target.value); setSelectedDisciplinaId(''); }} options={availableTurmas.map(t => ({ value: t.id, label: `${t.nome} (${getClassName(state.classes, t.classeId)})` }))} />
            <Select label="Disciplina" value={selectedDisciplinaId} onChange={e => setSelectedDisciplinaId(e.target.value)} options={availableDisciplinas.map(d => ({ value: d.id, label: d.nome }))} />
          </div>
          {selectedTurmaId && selectedDisciplinaId && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50"><h3 className="font-bold">{getDisciplinaName(state.disciplinas, selectedDisciplinaId)} • {turmaAlunos.length} alunos</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50"><th className="text-left px-4 py-3 text-xs">Nº</th><th className="text-left px-4 py-3 text-xs">Aluno</th><th className="text-center px-4 py-3 text-xs">MAC</th><th className="text-center px-4 py-3 text-xs">NPP</th><th className="text-center px-4 py-3 text-xs">NPT</th><th className="text-center px-4 py-3 text-xs">MT</th><th className="text-center px-4 py-3 text-xs">Resultado</th></tr></thead>
                  <tbody>
                    {turmaAlunos.map((aluno, idx) => {
                      const nota = getOrCreateNota(aluno.id);
                      const canEdit = isProfessor || ['director_geral', 'subdiretor_pedagogico'].includes(currentUser.perfil);
                      return (
                        <tr key={aluno.id}>
                          <td className="px-4 py-2 text-sm text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium">{aluno.nomeCompleto}</td>
                          <td className="px-4 py-2"><input type="number" min="0" max="20" step="0.1" value={nota.mac ?? ''} onChange={e => updateNota(aluno.id, 'mac', e.target.value)} className="w-16 mx-auto block text-center px-2 py-1 border rounded-lg text-sm outline-none" disabled={!canEdit} /></td>
                          <td className="px-4 py-2"><input type="number" min="0" max="20" step="0.1" value={nota.npp ?? ''} onChange={e => updateNota(aluno.id, 'npp', e.target.value)} className="w-16 mx-auto block text-center px-2 py-1 border rounded-lg text-sm outline-none" disabled={!canEdit} /></td>
                          <td className="px-4 py-2"><input type="number" min="0" max="20" step="0.1" value={nota.npt ?? ''} onChange={e => updateNota(aluno.id, 'npt', e.target.value)} className="w-16 mx-auto block text-center px-2 py-1 border rounded-lg text-sm outline-none" disabled={!canEdit} /></td>
                          <td className={`px-4 py-2 text-center text-lg font-bold ${nota.mt !== null ? (nota.mt >= 10 ? 'text-emerald-600' : 'text-red-600') : ''}`}>{nota.mt ?? '-'}</td>
                          <td className="px-4 py-2 text-center">{nota.mt !== null && <Badge color={nota.mt >= 10 ? 'green' : 'red'}>{nota.mt >= 10 ? 'Aprov.' : 'Reprov.'}</Badge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PresencasPage = ({ state, onUpdate }: { state: AppState; onUpdate: (p: Presenca[]) => void }) => {
  const currentUser = state.currentUser!;
  const isProfessor = currentUser.perfil === 'professor';
  const profAtribuicoes = isProfessor ? state.disciplinasProfessor.filter(a => a.professorId === currentUser.id) : [];
  const availableTurmas = isProfessor ? state.turmas.filter(t => profAtribuicoes.some(a => a.turmaId === t.id)) : state.turmas;
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedTurma = state.turmas.find(t => t.id === selectedTurmaId);
  const availableDisciplinas = selectedTurma ? (isProfessor ? state.disciplinas.filter(d => profAtribuicoes.some(a => a.turmaId === selectedTurmaId && a.disciplinaId === d.id)) : state.disciplinas.filter(d => d.classeId === selectedTurma.classeId)) : [];
  const turmaAlunos = selectedTurmaId ? state.alunos.filter(a => a.turmaId === selectedTurmaId && a.situacao === 'Ativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)) : [];

  const getPresenca = (alunoId: string): boolean | null => { const p = state.presencas.find(p => p.alunoId === alunoId && p.turmaId === selectedTurmaId && p.disciplinaId === selectedDisciplinaId && p.data === selectedDate); return p ? p.presente : null; };

  const togglePresenca = (alunoId: string, presente: boolean) => {
    const existing = state.presencas.find(p => p.alunoId === alunoId && p.turmaId === selectedTurmaId && p.disciplinaId === selectedDisciplinaId && p.data === selectedDate);
    if (existing) { onUpdate(state.presencas.map(p => p.id === existing.id ? { ...p, presente } : p)); }
    else { onUpdate([...state.presencas, { id: generateId(), alunoId, turmaId: selectedTurmaId, disciplinaId: selectedDisciplinaId, data: selectedDate, presente }]); }
  };

  const markAllPresent = () => {
    const newPresencas = [...state.presencas];
    turmaAlunos.forEach(aluno => {
      const existingIdx = newPresencas.findIndex(p => p.alunoId === aluno.id && p.turmaId === selectedTurmaId && p.disciplinaId === selectedDisciplinaId && p.data === selectedDate);
      if (existingIdx >= 0) newPresencas[existingIdx] = { ...newPresencas[existingIdx], presente: true };
      else newPresencas.push({ id: generateId(), alunoId: aluno.id, turmaId: selectedTurmaId, disciplinaId: selectedDisciplinaId, data: selectedDate, presente: true });
    });
    onUpdate(newPresencas);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Presenças</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <Select label="Turma" value={selectedTurmaId} onChange={e => { setSelectedTurmaId(e.target.value); setSelectedDisciplinaId(''); }} options={availableTurmas.map(t => ({ value: t.id, label: `${t.nome} (${getClassName(state.classes, t.classeId)})` }))} />
        <Select label="Disciplina" value={selectedDisciplinaId} onChange={e => setSelectedDisciplinaId(e.target.value)} options={availableDisciplinas.map(d => ({ value: d.id, label: d.nome }))} />
        <Input label="Data" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        {selectedTurmaId && selectedDisciplinaId && <Button variant="success" onClick={markAllPresent}>✓ Marcar Todos</Button>}
      </div>
      {selectedTurmaId && selectedDisciplinaId && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y">
            {turmaAlunos.map((aluno, idx) => {
              const estado = getPresenca(aluno.id);
              return (
                <div key={aluno.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3"><span className="text-sm text-gray-400 w-6">{idx + 1}</span><span className="text-sm font-medium">{aluno.nomeCompleto}</span></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => togglePresenca(aluno.id, true)} className={`px-3 py-1 rounded-lg text-xs font-medium ${estado === true ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}>Presente</button>
                    <button onClick={() => togglePresenca(aluno.id, false)} className={`px-3 py-1 rounded-lg text-xs font-medium ${estado === false ? 'bg-red-500 text-white' : 'bg-gray-100'}`}>Falta</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const OcorrenciasPage = ({ state, onUpdate }: { state: AppState; onUpdate: (o: Ocorrencia[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ alunoId: '', tipo: 'Disciplinar' as Ocorrencia['tipo'], descricao: '', gravidade: 'Leve' as Ocorrencia['gravidade'] });
  const currentUser = state.currentUser!;

  const handleCreate = () => {
    if (!form.alunoId || !form.descricao) return;
    onUpdate([...state.ocorrencias, { id: generateId(), ...form, data: new Date().toISOString(), registradoPor: currentUser.id }]);
    setShowModal(false);
    setForm({ alunoId: '', tipo: 'Disciplinar', descricao: '', gravidade: 'Leve' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-800">Ocorrências</h2><Button onClick={() => setShowModal(true)}>➕ Nova</Button></div>
      <div className="space-y-3">
        {state.ocorrencias.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(o => {
          const aluno = state.alunos.find(a => a.id === o.alunoId);
          return (
            <div key={o.id} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${o.tipo === 'Disciplinar' ? 'border-l-red-500' : o.tipo === 'Mérito' ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
              <div className="flex gap-2 mb-2"><Badge color={o.tipo === 'Disciplinar' ? 'red' : o.tipo === 'Mérito' ? 'green' : 'blue'}>{o.tipo}</Badge>{o.gravidade && <Badge color="yellow">{o.gravidade}</Badge>}</div>
              <h3 className="text-sm font-bold">{aluno?.nomeCompleto || 'Aluno desconhecido'}</h3>
              <p className="text-sm text-gray-600 mt-1">{o.descricao}</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(o.data).toLocaleDateString('pt-AO')}</p>
            </div>
          );
        })}
        {state.ocorrencias.length === 0 && <div className="bg-white rounded-2xl p-12 text-center"><p className="text-gray-400">Nenhuma ocorrência</p></div>}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Ocorrência" size="md">
        <div className="space-y-4">
          <Select label="Aluno" value={form.alunoId} onChange={e => setForm({ ...form, alunoId: e.target.value })} options={state.alunos.filter(a => a.situacao === 'Ativo').map(a => ({ value: a.id, label: a.nomeCompleto }))} />
          <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as Ocorrencia['tipo'] })} options={[{ value: 'Disciplinar', label: 'Disciplinar' }, { value: 'Mérito', label: 'Mérito' }, { value: 'Observação', label: 'Observação' }]} />
          <Select label="Gravidade" value={form.gravidade || ''} onChange={e => setForm({ ...form, gravidade: e.target.value as Ocorrencia['gravidade'] })} options={[{ value: 'Leve', label: 'Leve' }, { value: 'Moderada', label: 'Moderada' }, { value: 'Grave', label: 'Grave' }]} />
          <TextArea label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Registar</Button></div>
        </div>
      </Modal>
    </div>
  );
};

// ============== DOCUMENTOS PAGE (NEW) ==============
const DocumentosPage = ({ state, onUpdate }: { state: AppState; onUpdate: (d: Documento[]) => void }) => {
  const [activeTab, setActiveTab] = useState('declaracao');
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [motivo, setMotivo] = useState('a pedido do interessado e para os fins que se julgar conveniente');
  const [tipoCertificado, setTipoCertificado] = useState('de Conclusão');
  const [search, setSearch] = useState('');
  const currentUser = state.currentUser!;

  const filteredAlunos = state.alunos.filter(a => a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || a.numeroMatricula.includes(search));
  const selectedAluno = state.alunos.find(a => a.id === selectedAlunoId);

  const handleGenerateDocument = (type: 'pdf' | 'doc') => {
    if (!selectedAluno) return;
    let html = '';
    let filename = '';

    switch (activeTab) {
      case 'declaracao':
        html = generateDeclaracao(selectedAluno, state, motivo);
        filename = `Declaracao_${selectedAluno.nomeCompleto.replace(/\s/g, '_')}`;
        break;
      case 'boletim':
        html = generateBoletim(selectedAluno, state);
        filename = `Boletim_${selectedAluno.nomeCompleto.replace(/\s/g, '_')}`;
        break;
      case 'certificado':
        html = generateCertificado(selectedAluno, state, tipoCertificado);
        filename = `Certificado_${selectedAluno.nomeCompleto.replace(/\s/g, '_')}`;
        break;
    }

    // Save document record
    const newDoc: Documento = {
      id: generateId(),
      tipo: activeTab === 'declaracao' ? 'Declaracao' : activeTab === 'boletim' ? 'Boletim' : 'Certificado',
      alunoId: selectedAluno.id,
      titulo: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} - ${selectedAluno.nomeCompleto}`,
      conteudo: html,
      criadoPor: currentUser.id,
      dataCriacao: new Date().toISOString(),
    };
    onUpdate([...(state.documentos || []), newDoc]);

    if (type === 'pdf') {
      openDocumentWindow(html);
    } else {
      downloadAsDoc(html, filename);
    }
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-800">Documentos Escolares</h2><p className="text-sm text-gray-500 mt-1">Gere declarações, boletins e certificados</p></div>

      <Tabs tabs={[{ id: 'declaracao', label: '📜 Declaração' }, { id: 'boletim', label: '📊 Boletim' }, { id: 'certificado', label: '🏆 Certificado' }]} active={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selecionar Aluno */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">1. Seleccionar Aluno</h3>
          <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar aluno..." />
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
            {filteredAlunos.slice(0, 20).map(a => (
              <button key={a.id} onClick={() => setSelectedAlunoId(a.id)} className={`w-full text-left p-3 rounded-xl transition ${selectedAlunoId === a.id ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <Avatar src={a.foto} name={a.nomeCompleto} size="sm" />
                  <div><p className="text-sm font-medium text-gray-800">{a.nomeCompleto}</p><p className="text-xs text-gray-500">{a.numeroMatricula} • {getClassName(state.classes, a.classeId)}</p></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Configurar Documento */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">2. Configurar</h3>
          {!selectedAluno ? (
            <div className="text-center py-8 text-gray-400"><p>Seleccione um aluno</p></div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm font-medium text-blue-800">{selectedAluno.nomeCompleto}</p>
                <p className="text-xs text-blue-600">{getClassName(state.classes, selectedAluno.classeId)} • {getTurmaName(state.turmas, selectedAluno.turmaId)}</p>
              </div>

              {activeTab === 'declaracao' && (
                <TextArea label="Motivo da Declaração" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: para fins de comprovação de matrícula" />
              )}

              {activeTab === 'certificado' && (
                <Select label="Tipo de Certificado" value={tipoCertificado} onChange={e => setTipoCertificado(e.target.value)} options={[
                  { value: 'de Conclusão', label: 'Certificado de Conclusão' },
                  { value: 'de Frequência', label: 'Certificado de Frequência' },
                  { value: 'de Mérito', label: 'Certificado de Mérito' },
                  { value: 'de Participação', label: 'Certificado de Participação' },
                ]} />
              )}
            </div>
          )}
        </div>

        {/* Gerar Documento */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">3. Gerar Documento</h3>
          {!selectedAluno ? (
            <div className="text-center py-8 text-gray-400"><p>Seleccione um aluno</p></div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <p className="text-sm font-medium text-gray-800 mb-2">📄 {activeTab === 'declaracao' ? 'Declaração' : activeTab === 'boletim' ? 'Boletim de Notas' : 'Certificado'}</p>
                <p className="text-xs text-gray-500">Documento será gerado para: {selectedAluno.nomeCompleto}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="warning" onClick={() => handleGenerateDocument('pdf')} className="w-full justify-center">📑 PDF</Button>
                <Button variant="primary" onClick={() => handleGenerateDocument('doc')} className="w-full justify-center">📄 DOCX</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Documentos */}
      {(state.documentos?.length || 0) > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">📁 Documentos Gerados Recentemente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(state.documentos || []).slice(-9).reverse().map(doc => {
              const aluno = state.alunos.find(a => a.id === doc.alunoId);
              return (
                <div key={doc.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color={doc.tipo === 'Declaracao' ? 'blue' : doc.tipo === 'Boletim' ? 'purple' : 'yellow'}>{doc.tipo}</Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{aluno?.nomeCompleto || 'Aluno'}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(doc.dataCriacao).toLocaleDateString('pt-AO')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============== COMUNICADOS PAGE (UPDATED) ==============
const ComunicadosPage = ({ state, onUpdate }: { state: AppState; onUpdate: (c: Comunicado[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<Comunicado | null>(null);
  const [form, setForm] = useState({ titulo: '', mensagem: '', prioridade: 'Normal' as Comunicado['prioridade'], destinatarioTipo: 'todos' as string, destinatariosPerfis: [] as UserRole[], destinatariosIds: [] as string[] });

  const currentUser = state.currentUser!;
  const canCreate = ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'].includes(currentUser.perfil);

  // Filter visible comunicados
  const visibleComunicados = state.comunicados.filter(c => {
    if (c.destinatarios === 'todos') return true;
    if ((c.destinatarios as UserRole[]).includes(currentUser.perfil)) return true;
    if (c.destinatariosIds?.includes(currentUser.id)) return true;
    if (c.autorId === currentUser.id) return true;
    return false;
  }).sort((a, b) => new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime());

  const handleCreate = () => {
    if (!form.titulo || !form.mensagem) return;
    let destinatarios: UserRole[] | 'todos' = 'todos';
    let destinatariosIds: string[] | undefined = undefined;

    if (form.destinatarioTipo === 'perfis' && form.destinatariosPerfis.length > 0) {
      destinatarios = form.destinatariosPerfis;
    } else if (form.destinatarioTipo === 'usuarios' && form.destinatariosIds.length > 0) {
      destinatarios = [];
      destinatariosIds = form.destinatariosIds;
    }

    onUpdate([...state.comunicados, {
      id: generateId(),
      titulo: form.titulo,
      mensagem: form.mensagem,
      autorId: currentUser.id,
      autorNome: currentUser.nomeCompleto,
      destinatarios,
      destinatariosIds,
      dataPublicacao: new Date().toISOString(),
      prioridade: form.prioridade,
      lido: [currentUser.id],
    }]);
    setShowModal(false);
    setForm({ titulo: '', mensagem: '', prioridade: 'Normal', destinatarioTipo: 'todos', destinatariosPerfis: [], destinatariosIds: [] });
  };

  const markAsRead = (comunicado: Comunicado) => {
    if (!comunicado.lido?.includes(currentUser.id)) {
      onUpdate(state.comunicados.map(c => c.id === comunicado.id ? { ...c, lido: [...(c.lido || []), currentUser.id] } : c));
    }
    setViewing(comunicado);
  };

  const togglePerfil = (perfil: UserRole) => {
    if (form.destinatariosPerfis.includes(perfil)) {
      setForm({ ...form, destinatariosPerfis: form.destinatariosPerfis.filter(p => p !== perfil) });
    } else {
      setForm({ ...form, destinatariosPerfis: [...form.destinatariosPerfis, perfil] });
    }
  };

  const toggleUsuario = (userId: string) => {
    if (form.destinatariosIds.includes(userId)) {
      setForm({ ...form, destinatariosIds: form.destinatariosIds.filter(id => id !== userId) });
    } else {
      setForm({ ...form, destinatariosIds: [...form.destinatariosIds, userId] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-800">Comunicados</h2>{canCreate && <Button onClick={() => setShowModal(true)}>➕ Novo</Button>}</div>
      <div className="space-y-4">
        {visibleComunicados.map(c => {
          const isUnread = !c.lido?.includes(currentUser.id);
          return (
            <div key={c.id} onClick={() => markAsRead(c)} className={`bg-white rounded-2xl p-6 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition ${c.prioridade === 'Urgente' ? 'border-l-red-500' : c.prioridade === 'Importante' ? 'border-l-amber-500' : 'border-l-blue-500'} ${isUnread ? 'ring-2 ring-blue-200' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge color={c.prioridade === 'Urgente' ? 'red' : c.prioridade === 'Importante' ? 'yellow' : 'blue'}>{c.prioridade}</Badge>
                {isUnread && <Badge color="green">Novo</Badge>}
                {c.destinatarios !== 'todos' && <Badge color="gray">Restrito</Badge>}
              </div>
              <h3 className="text-lg font-bold text-gray-800">{c.titulo}</h3>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.mensagem}</p>
              <p className="text-xs text-gray-400 mt-3">Por: {c.autorNome} • {new Date(c.dataPublicacao).toLocaleDateString('pt-AO')}</p>
            </div>
          );
        })}
        {visibleComunicados.length === 0 && <div className="bg-white rounded-2xl p-12 text-center"><p className="text-gray-400">Nenhum comunicado</p></div>}
      </div>

      {/* View Modal */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Comunicado" size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex gap-2"><Badge color={viewing.prioridade === 'Urgente' ? 'red' : viewing.prioridade === 'Importante' ? 'yellow' : 'blue'}>{viewing.prioridade}</Badge></div>
            <h3 className="text-xl font-bold text-gray-800">{viewing.titulo}</h3>
            <div className="text-sm text-gray-600 whitespace-pre-wrap">{viewing.mensagem}</div>
            <div className="pt-4 border-t text-xs text-gray-400">
              <p>Publicado por: {viewing.autorNome}</p>
              <p>Data: {new Date(viewing.dataPublicacao).toLocaleString('pt-AO')}</p>
              {viewing.destinatarios !== 'todos' && <p>Destinatários: {(viewing.destinatarios as UserRole[]).map(r => ROLE_LABELS[r]).join(', ')}</p>}
              {viewing.destinatariosIds && viewing.destinatariosIds.length > 0 && <p>Enviado para: {viewing.destinatariosIds.map(id => getUserName(state.users, id)).join(', ')}</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Comunicado" size="xl">
        <div className="space-y-4">
          <Input label="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
          <TextArea label="Mensagem" value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} />
          <Select label="Prioridade" value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value as Comunicado['prioridade'] })} options={[{ value: 'Normal', label: 'Normal' }, { value: 'Importante', label: 'Importante' }, { value: 'Urgente', label: 'Urgente' }]} />
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Destinatários</label>
            <div className="flex gap-2">
              {['todos', 'perfis', 'usuarios'].map(tipo => (
                <button key={tipo} onClick={() => setForm({ ...form, destinatarioTipo: tipo })} className={`px-4 py-2 rounded-lg text-sm font-medium ${form.destinatarioTipo === tipo ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {tipo === 'todos' ? '🌍 Todos' : tipo === 'perfis' ? '👥 Por Perfil' : '👤 Utilizadores'}
                </button>
              ))}
            </div>

            {form.destinatarioTipo === 'perfis' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-xl">
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <Checkbox key={role} checked={form.destinatariosPerfis.includes(role as UserRole)} onChange={() => togglePerfil(role as UserRole)} label={label} />
                ))}
              </div>
            )}

            {form.destinatarioTipo === 'usuarios' && (
              <div className="max-h-60 overflow-y-auto p-4 bg-gray-50 rounded-xl space-y-2">
                {state.users.filter(u => u.ativo).map(u => (
                  <Checkbox key={u.id} checked={form.destinatariosIds.includes(u.id)} onChange={() => toggleUsuario(u.id)} label={`${u.nomeCompleto} (${ROLE_LABELS[u.perfil]})`} />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Publicar</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const EventosPage = ({ eventos, currentUser, onUpdate }: { eventos: Evento[]; currentUser: User; onUpdate: (e: Evento[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', dataInicio: '', dataFim: '', tipo: 'Atividade' as Evento['tipo'] });
  const canCreate = ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'].includes(currentUser.perfil);

  const handleCreate = () => {
    if (!form.titulo || !form.dataInicio) return;
    onUpdate([...eventos, { id: generateId(), ...form, criadoPor: currentUser.id }]);
    setShowModal(false);
    setForm({ titulo: '', descricao: '', dataInicio: '', dataFim: '', tipo: 'Atividade' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-800">Eventos</h2>{canCreate && <Button onClick={() => setShowModal(true)}>➕ Novo</Button>}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventos.sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()).map(e => (
          <div key={e.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <Badge color={e.tipo === 'Feriado' ? 'red' : e.tipo === 'Exame' ? 'purple' : 'blue'}>{e.tipo}</Badge>
            <h3 className="text-lg font-bold mt-2">{e.titulo}</h3>
            {e.descricao && <p className="text-sm text-gray-500 mt-1">{e.descricao}</p>}
            <p className="text-xs text-gray-400 mt-3">📅 {new Date(e.dataInicio).toLocaleDateString('pt-AO')}</p>
          </div>
        ))}
        {eventos.length === 0 && <div className="col-span-full bg-white rounded-2xl p-12 text-center"><p className="text-gray-400">Nenhum evento</p></div>}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Evento" size="md">
        <div className="space-y-4">
          <Input label="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
          <TextArea label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data Início" type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
            <Input label="Data Fim" type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} />
          </div>
          <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as Evento['tipo'] })} options={[{ value: 'Reunião', label: 'Reunião' }, { value: 'Feriado', label: 'Feriado' }, { value: 'Exame', label: 'Exame' }, { value: 'Atividade', label: 'Atividade' }]} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const RelatoriosPage = ({ state }: { state: AppState }) => {
  const alunosAtivos = state.alunos.filter(a => a.situacao === 'Ativo');
  const classStats = state.classes.map(c => {
    const alunosClasse = alunosAtivos.filter(a => a.classeId === c.id);
    return { classe: c, total: alunosClasse.length, masc: alunosClasse.filter(a => a.genero === 'Masculino').length, fem: alunosClasse.filter(a => a.genero === 'Feminino').length };
  }).filter(s => s.total > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center"><p className="text-3xl font-bold text-blue-600">{alunosAtivos.length}</p><p className="text-sm text-gray-500">Alunos</p></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center"><p className="text-3xl font-bold text-emerald-600">{state.users.filter(u => u.perfil === 'professor' && u.ativo).length}</p><p className="text-sm text-gray-500">Professores</p></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center"><p className="text-3xl font-bold text-purple-600">{state.turmas.length}</p><p className="text-sm text-gray-500">Turmas</p></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center"><p className="text-3xl font-bold text-orange-600">{state.notas.length}</p><p className="text-sm text-gray-500">Notas</p></div>
      </div>
      {classStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50"><h3 className="font-bold">📊 Alunos por Classe</h3></div>
          <table className="w-full"><thead><tr className="bg-gray-50"><th className="text-left px-4 py-3 text-xs">Classe</th><th className="text-center px-4 py-3 text-xs">Total</th><th className="text-center px-4 py-3 text-xs">Masc.</th><th className="text-center px-4 py-3 text-xs">Fem.</th></tr></thead>
          <tbody>{classStats.map(s => <tr key={s.classe.id}><td className="px-4 py-3 font-medium">{s.classe.nome}</td><td className="px-4 py-3 text-center font-bold">{s.total}</td><td className="px-4 py-3 text-center text-blue-600">{s.masc}</td><td className="px-4 py-3 text-center text-pink-600">{s.fem}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
};

const BackupPage = ({ state, onSync, syncing, lastSyncTime, isOnline }: { state: AppState; onSync: () => void; syncing: boolean; lastSyncTime: string | null; isOnline: boolean }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Backup e Sincronização</h2>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold mb-4">☁️ Estado</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
          <span className={`font-medium ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>{isOnline ? 'Online' : 'Offline'}</span>
          {lastSyncTime && <span className="text-sm text-gray-500">Última sync: {new Date(lastSyncTime).toLocaleString('pt-AO')}</span>}
        </div>
        <Button onClick={onSync} disabled={!isOnline || syncing}>{syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar'}</Button>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold mb-4">💾 Exportar</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="success" onClick={() => exportToXLS(state, `backup_${ESCOLA_NOME.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`)}>📊 XLS</Button>
          <Button variant="primary" onClick={() => exportToDOCX(state, `backup_${ESCOLA_NOME.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`)}>📄 DOCX</Button>
          <Button variant="warning" onClick={() => exportToPDF(state, `backup_${ESCOLA_NOME.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`)}>📑 PDF</Button>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold mb-4">📊 Resumo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold">{state.users.length}</p><p className="text-sm text-gray-500">Utilizadores</p></div>
          <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold">{state.alunos.length}</p><p className="text-sm text-gray-500">Alunos</p></div>
          <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold">{state.turmas.length}</p><p className="text-sm text-gray-500">Turmas</p></div>
          <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold">{state.documentos?.length || 0}</p><p className="text-sm text-gray-500">Documentos</p></div>
        </div>
      </div>
    </div>
  );
};

const PerfilPage = ({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(user);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', nova: '', confirmar: '' });
  const [msg, setMsg] = useState('');

  const handleSave = () => { onUpdate({ ...user, ...form, nomeCompleto: `${form.nome} ${form.sobrenome}` }); setEditing(false); setMsg('Perfil actualizado!'); setTimeout(() => setMsg(''), 3000); };

  const handleChangePassword = () => {
    if (passwords.current !== user.senha) { setMsg('Senha actual incorrecta!'); return; }
    if (passwords.nova.length < 6) { setMsg('Senha muito curta!'); return; }
    if (passwords.nova !== passwords.confirmar) { setMsg('Senhas não coincidem!'); return; }
    onUpdate({ ...user, senha: passwords.nova });
    setShowPasswordForm(false);
    setPasswords({ current: '', nova: '', confirmar: '' });
    setMsg('Senha alterada!');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {msg && <div className={`p-4 rounded-xl text-sm font-medium ${msg.includes('!') && !msg.includes('incorrect') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          <div className="absolute -bottom-12 left-6">{editing ? <PhotoUpload currentPhoto={form.foto} onPhotoChange={foto => setForm({ ...form, foto })} /> : <Avatar src={user.foto} name={user.nomeCompleto} size="xl" />}</div>
        </div>
        <div className="pt-16 px-6 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-2xl font-bold">{user.nomeCompleto}</h2><p className="text-gray-500">{user.email}</p><Badge color="purple">{ROLE_LABELS[user.perfil]}</Badge></div>
            <div className="flex gap-2">
              {!editing ? (<><Button variant="secondary" onClick={() => setShowPasswordForm(!showPasswordForm)}>🔒 Senha</Button><Button onClick={() => { setForm(user); setEditing(true); }}>✏️ Editar</Button></>) : (<><Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></>)}
            </div>
          </div>
        </div>
      </div>
      {showPasswordForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-4">🔒 Alterar Senha</h3>
          <div className="max-w-md space-y-4">
            <Input label="Senha Actual" type="password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} />
            <Input label="Nova Senha" type="password" value={passwords.nova} onChange={e => setPasswords({ ...passwords, nova: e.target.value })} />
            <Input label="Confirmar" type="password" value={passwords.confirmar} onChange={e => setPasswords({ ...passwords, confirmar: e.target.value })} />
            <div className="flex gap-3"><Button variant="secondary" onClick={() => setShowPasswordForm(false)}>Cancelar</Button><Button onClick={handleChangePassword}>Alterar</Button></div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold mb-4">Dados Pessoais</h3>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            <Input label="Sobrenome" value={form.sobrenome} onChange={e => setForm({ ...form, sobrenome: e.target.value })} />
            <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            <Input label="Endereço" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[['Nome', user.nomeCompleto], ['Email', user.email], ['Telefone', user.telefone], ['BI', user.bilheteIdentidade], ['Província', user.provincia], ['Município', user.municipio], ['Endereço', user.endereco], ['Habilitações', user.habilitacoes], ['NIF', user.nif], ['INSS', user.inss]].filter(([, v]) => v).map(([label, value]) => (<div key={label as string} className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">{label}</p><p className="text-sm font-medium">{value}</p></div>))}
          </div>
        )}
      </div>
    </div>
  );
};
