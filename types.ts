export type UserRole = 'director_geral' | 'subdiretor_pedagogico' | 'subdiretor_administrativo' | 'secretaria' | 'professor' | 'encarregado';

export interface User {
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

export interface Aluno {
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

export interface AnoLetivo {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  estado: 'Aberto' | 'Fechado' | 'Em Andamento';
  trimestres: Trimestre[];
}

export interface Trimestre {
  id: string;
  nome: string;
  numero: 1 | 2 | 3;
  anoLetivoId: string;
  dataInicio: string;
  dataFim: string;
  estado: 'Aberto' | 'Fechado' | 'Em Andamento';
}

export interface Classe {
  id: string;
  nome: string;
  nivel: string;
  descricao?: string;
}

export interface Turma {
  id: string;
  nome: string;
  classeId: string;
  turnoId: string;
  professorDiretorTurmaId?: string;
  sala?: string;
  capacidade: number;
  anoLetivoId: string;
}

export interface Turno {
  id: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  codigo: string;
  classeId: string;
  cargaHoraria: number;
  descricao?: string;
}

export interface DisciplinaProfessor {
  id: string;
  professorId: string;
  disciplinaId: string;
  turmaId: string;
  anoLetivoId: string;
}

export interface Nota {
  id: string;
  alunoId: string;
  disciplinaId: string;
  turmaId: string;
  trimestreId: string;
  anoLetivoId: string;
  mac: number | null; // Mini avaliação contínua
  npp: number | null; // Nota de prova parcelar
  npt: number | null; // Nota de prova trimestral
  mt: number | null;  // Média trimestral calculada
  observacao?: string;
}

export interface Pauta {
  id: string;
  turmaId: string;
  disciplinaId: string;
  trimestreId: string;
  anoLetivoId: string;
  professorId: string;
  estado: 'Rascunho' | 'Submetida' | 'Aprovada';
  dataSubmissao?: string;
}

export interface Comunicado {
  id: string;
  titulo: string;
  mensagem: string;
  autorId: string;
  autorNome: string;
  destinatarios: UserRole[] | 'todos';
  dataPublicacao: string;
  prioridade: 'Normal' | 'Importante' | 'Urgente';
}

export interface Presenca {
  id: string;
  alunoId: string;
  turmaId: string;
  disciplinaId: string;
  data: string;
  presente: boolean;
  justificacao?: string;
}

export interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  tipo: 'Reunião' | 'Feriado' | 'Exame' | 'Atividade' | 'Outro';
  criadoPor: string;
}

export interface Ocorrencia {
  id: string;
  alunoId: string;
  tipo: 'Disciplinar' | 'Mérito' | 'Observação';
  descricao: string;
  data: string;
  registradoPor: string;
  gravidade?: 'Leve' | 'Moderada' | 'Grave';
}

export interface AppState {
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
  pautas: Pauta[];
  comunicados: Comunicado[];
  presencas: Presenca[];
  eventos: Evento[];
  ocorrencias: Ocorrencia[];
}

export const PROVINCIAS_ANGOLA = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango',
  'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla',
  'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico',
  'Namibe', 'Uíge', 'Zaire'
];

export const ROLE_LABELS: Record<UserRole, string> = {
  director_geral: 'Director Geral',
  subdiretor_pedagogico: 'Subdirector Pedagógico',
  subdiretor_administrativo: 'Subdirector Administrativo',
  secretaria: 'Secretária',
  professor: 'Professor',
  encarregado: 'Encarregado de Educação'
};

export const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União de Facto'];

export const HABILITACOES = [
  'Ensino Primário', 'Ensino Secundário - I Ciclo', 'Ensino Secundário - II Ciclo',
  'Bacharelato', 'Licenciatura', 'Mestrado', 'Doutoramento'
];

export const CATEGORIAS_DOCENTES = [
  'Professor do Ensino Primário',
  'Professor do I Ciclo do Ensino Secundário',
  'Professor do II Ciclo do Ensino Secundário',
  'Professor Licenciado',
  'Professor Auxiliar',
  'Professor Associado',
  'Professor Catedrático'
];

export const NIVEIS_ENSINO = [
  'Ensino Primário',
  'I Ciclo do Ensino Secundário',
  'II Ciclo do Ensino Secundário'
];

export const GRAUS_PARENTESCO = [
  'Pai', 'Mãe', 'Avô', 'Avó', 'Tio', 'Tia', 'Irmão', 'Irmã', 'Outro'
];

export const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
