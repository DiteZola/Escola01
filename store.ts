import type { AppState, User, Aluno, Classe, Turma, Turno, Disciplina, AnoLetivo } from './types';

const STORAGE_KEY = 'sge_angola_data';

const defaultAdmin: User = {
  id: 'admin-001',
  nome: 'Administrador',
  sobrenome: 'Principal',
  nomeCompleto: 'Administrador Principal',
  email: 'admin@escola.ao',
  senha: 'admin123',
  perfil: 'director_geral',
  foto: '',
  telefone: '+244 923 000 001',
  bilheteIdentidade: '000000001LA042',
  dataNascimento: '1975-03-15',
  genero: 'Masculino',
  estadoCivil: 'Casado(a)',
  naturalidade: 'Luanda',
  provincia: 'Luanda',
  municipio: 'Luanda',
  endereco: 'Rua da Escola, nº 1, Luanda',
  habilitacoes: 'Doutoramento',
  formacaoAcademica: 'Ciências da Educação',
  anoExperiencia: 25,
  especialidade: 'Gestão Escolar',
  numeroAgente: 'AG-0001',
  categoriaDocente: 'Professor Catedrático',
  dataAdmissao: '2000-01-15',
  iban: 'AO06004000000123456789101',
  nif: '5000000001',
  inss: 'INSS-0001',
  ativo: true,
  dataCriacao: new Date().toISOString(),
};

const defaultState: AppState = {
  currentUser: null,
  users: [defaultAdmin],
  alunos: [],
  anosLetivos: [],
  classes: [
    { id: 'cl-1', nome: '1ª Classe', nivel: 'Ensino Primário', descricao: 'Primeira classe do ensino primário' },
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
  ],
  turmas: [],
  turnos: [
    { id: 'tn-1', nome: 'Manhã', horaInicio: '07:00', horaFim: '12:30' },
    { id: 'tn-2', nome: 'Tarde', horaInicio: '13:00', horaFim: '18:00' },
    { id: 'tn-3', nome: 'Noite', horaInicio: '18:30', horaFim: '22:00' },
  ],
  disciplinas: [],
  disciplinasProfessor: [],
  notas: [],
  pautas: [],
  comunicados: [],
  presencas: [],
  eventos: [],
  ocorrencias: [],
};

export function loadState(): AppState {
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
}

export function saveState(state: AppState) {
  try {
    const toSave = { ...state, currentUser: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Helper functions
export function getClassName(classes: Classe[], id: string): string {
  return classes.find(c => c.id === id)?.nome || 'N/A';
}

export function getTurmaName(turmas: Turma[], id: string): string {
  return turmas.find(t => t.id === id)?.nome || 'N/A';
}

export function getTurnoName(turnos: Turno[], id: string): string {
  return turnos.find(t => t.id === id)?.nome || 'N/A';
}

export function getDisciplinaName(disciplinas: Disciplina[], id: string): string {
  return disciplinas.find(d => d.id === id)?.nome || 'N/A';
}

export function getUserName(users: User[], id: string): string {
  return users.find(u => u.id === id)?.nomeCompleto || 'N/A';
}

export function getAlunoName(alunos: Aluno[], id: string): string {
  return alunos.find(a => a.id === id)?.nomeCompleto || 'N/A';
}

export function calcularMediaTrimestral(mac: number | null, npp: number | null, npt: number | null): number | null {
  if (mac === null || npp === null || npt === null) return null;
  // Fórmula angolana: MAC + NPP + NPT*2 / 4
  return Math.round(((mac + npp + npt * 2) / 4) * 10) / 10;
}

export function getActiveAnoLetivo(anosLetivos: AnoLetivo[]): AnoLetivo | undefined {
  return anosLetivos.find(a => a.estado === 'Aberto' || a.estado === 'Em Andamento');
}

export function getActiveTrimestre(anoLetivo: AnoLetivo | undefined): import('./types').Trimestre | undefined {
  if (!anoLetivo) return undefined;
  return anoLetivo.trimestres.find(t => t.estado === 'Aberto' || t.estado === 'Em Andamento');
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
