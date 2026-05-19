import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyDivpB49WezISoGxExglgJgfFit8IS9QDg",
  authDomain: "gestao-escolar-01.firebaseapp.com",
  projectId: "gestao-escolar-01",
  storageBucket: "gestao-escolar-01.firebasestorage.app",
  messagingSenderId: "622404754159",
  appId: "1:622404754159:web:69b6eff5e97ca19522591a"
};

let firebaseApp: any = null;
let db: any = null;
try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
} catch (e) {
  console.log('Firebase offline mode');
}

// ==================== TYPES ====================
interface User {
  id: string;
  nome: string;
  sobrenome: string;
  nomeCompleto: string;
  perfil: 'diretor_geral' | 'subdiretor_pedagogico' | 'subdiretor_administrativo' | 'secretaria' | 'professor' | 'encarregado';
  email: string;
  senha: string;
  telefone: string;
  telefone2?: string;
  bi: string;
  dataNascimento: string;
  genero: string;
  naturalidade: string;
  provincia: string;
  municipio: string;
  bairro: string;
  rua?: string;
  habilitacoes: string;
  especialidade?: string;
  anoExperiencia?: string;
  numeroAgente?: string;
  categoria?: string;
  dataAdmissao?: string;
  estadoCivil: string;
  foto: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

interface Aluno {
  id: string;
  numeroMatricula: string;
  nomeCompleto: string;
  dataNascimento: string;
  genero: string;
  naturalidade: string;
  provincia: string;
  municipio: string;
  bairro: string;
  nomePai: string;
  nomeMae: string;
  encarregadoId?: string;
  nomeEncarregado: string;
  telefoneEncarregado: string;
  classeId: string;
  turmaId: string;
  turnoId: string;
  foto: string;
  grupoSanguineo?: string;
  doencaCronica?: string;
  necessidadeEspecial?: string;
  documentoIdentificacao?: string;
  ativo: boolean;
  criadoEm: string;
}

interface AnoLetivo {
  id: string;
  ano: string;
  descricao: string;
  inicio: string;
  fim: string;
  estado: 'aberto' | 'fechado';
  criadoEm: string;
}

interface Trimestre {
  id: string;
  anoLetivoId: string;
  numero: number;
  descricao: string;
  inicio: string;
  fim: string;
  estado: 'aberto' | 'fechado';
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
  professorDiretorId?: string;
  sala?: string;
  capacidade?: number;
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
  cargaHoraria?: number;
}

interface DisciplinaProfessor {
  id: string;
  disciplinaId: string;
  professorId: string;
  turmaId: string;
  anoLetivoId: string;
}

interface Nota {
  id: string;
  alunoId: string;
  disciplinaId: string;
  trimestreId: string;
  anoLetivoId: string;
  mac: number | null;
  npp: number | null;
  npt: number | null;
  mt: number | null;
  observacao?: string;
}

interface Mensagem {
  id: string;
  remetenteId: string;
  destinatarioId?: string;
  destinatarioPerfil?: string;
  assunto: string;
  corpo: string;
  lida: boolean;
  criadoEm: string;
  tipo: 'individual' | 'grupo' | 'todos';
}

// Pauta type used in document generation context

// ==================== LOCAL STORAGE HELPERS ====================
const DB_PREFIX = 'cen_';
function saveToLocal(key: string, data: any) {
  try {
    localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

function loadFromLocal(key: string): any {
  try {
    const data = localStorage.getItem(DB_PREFIX + key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== SYNC WITH FIREBASE ====================
async function syncToFirebase(collectionName: string, data: any[]) {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    for (const item of data) {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, item);
    }
    await batch.commit();
  } catch (e) {
    console.log('Sync failed, will retry when online');
  }
}

async function _syncFromFirebase(collectionName: string): Promise<any[]> {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
}
void _syncFromFirebase;

// ==================== CONTEXT ====================
interface AppState {
  users: User[];
  alunos: Aluno[];
  anosLetivos: AnoLetivo[];
  trimestres: Trimestre[];
  classes: Classe[];
  turmas: Turma[];
  turnos: Turno[];
  disciplinas: Disciplina[];
  disciplinasProfessor: DisciplinaProfessor[];
  notas: Nota[];
  mensagens: Mensagem[];
  currentUser: User | null;
  isOnline: boolean;
}

const initialState: AppState = {
  users: [],
  alunos: [],
  anosLetivos: [],
  trimestres: [],
  classes: [],
  turmas: [],
  turnos: [],
  disciplinas: [],
  disciplinasProfessor: [],
  notas: [],
  mensagens: [],
  currentUser: null,
  isOnline: navigator.onLine,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<any>;
  saveData: (key: string, data: any[]) => void;
}>({ state: initialState, dispatch: () => {}, saveData: () => {} });

function appReducer(state: AppState, action: any): AppState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, [action.key]: action.data };
    case 'SET_USER':
      return { ...state, currentUser: action.user };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.value };
    default:
      return state;
  }
}

// ==================== PROFILE LABELS ====================
const perfilLabels: Record<string, string> = {
  diretor_geral: 'Director Geral',
  subdiretor_pedagogico: 'Subdirector Pedagógico',
  subdiretor_administrativo: 'Subdirector Administrativo',
  secretaria: 'Secretária',
  professor: 'Professor',
  encarregado: 'Encarregado de Educação',
};

const provincias = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte',
  'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
];

const generos = ['Masculino', 'Feminino'];
const estadosCivis = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União de facto'];
const gruposSanguineos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ==================== ICONS (SVG inline) ====================
const Icons = {
  home: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  student: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/></svg>,
  calendar: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  book: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  mail: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  file: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  chart: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  logout: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  plus: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  check: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  download: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  menu: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  search: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  clipboard: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  grid: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  clock: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  award: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  bell: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  eye: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

// ==================== TOAST COMPONENT ====================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, []);
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };
  return (
    <div className={`fixed top-4 right-4 z-[9999] ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">{Icons.x}</button>
    </div>
  );
}

// ==================== IMAGE UPLOAD COMPONENT ====================
function ImageUpload({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert('A imagem deve ter no máximo 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400 transition-colors bg-gray-50"
      >
        {value ? (
          <img src={value} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-400 text-xs p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Carregar foto
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

// ==================== MODAL COMPONENT ====================
function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-xl">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="hover:opacity-70">{Icons.x}</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ==================== STAT CARD ====================
function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4 text-white shadow-lg transform hover:scale-105 transition-transform`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="opacity-80 scale-150">{icon}</div>
      </div>
    </div>
  );
}

// ==================== FORM INPUT ====================
function FormInput({ label, type = 'text', value, onChange, required = false, options, placeholder, disabled = false }: any) {
  if (type === 'select') {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
        <select value={value || ''} onChange={e => onChange(e.target.value)} required={required} disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100">
          <option value="">Selecionar...</option>
          {options?.map((o: any) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      </div>
    );
  }
  if (type === 'textarea') {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[80px]" />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100" />
    </div>
  );
}

// ==================== DOCUMENT GENERATORS ====================
function gerarDeclaracaoPDF(aluno: Aluno, classes: Classe[], turmas: Turma[], anoLetivo: AnoLetivo) {
  const pdf = new jsPDF();
  const classe = classes.find(c => c.id === aluno.classeId);
  const turma = turmas.find(t => t.id === aluno.turmaId);
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REPÚBLICA DE ANGOLA', 105, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('MINISTÉRIO DA EDUCAÇÃO', 105, 28, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text('COMPLEXO ESCOLAR NKALAMBATA', 105, 38, { align: 'center' });
  
  pdf.setLineWidth(0.5);
  pdf.line(20, 45, 190, 45);
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DECLARAÇÃO', 105, 60, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const texto = `Para os devidos efeitos, declara-se que ${aluno.nomeCompleto}, ` +
    `nascido(a) em ${aluno.dataNascimento}, natural de ${aluno.naturalidade}, ` +
    `província de ${aluno.provincia}, portador(a) do documento ${aluno.documentoIdentificacao || 'N/A'}, ` +
    `é aluno(a) desta instituição de ensino, encontrando-se matriculado(a) e a frequentar ` +
    `a ${classe?.nome || ''} classe, turma "${turma?.nome || ''}", ` +
    `no ano lectivo de ${anoLetivo?.ano || ''}.`;
  
  const lines = pdf.splitTextToSize(texto, 160);
  pdf.text(lines, 20, 80);
  
  pdf.text(`Por ser verdade e me ter sido solicitado(a), passo a presente declaração`, 20, 130);
  pdf.text(`que vai por mim assinada e autenticada com carimbo em uso nesta instituição.`, 20, 138);
  
  const today = new Date();
  pdf.text(`Luanda, aos ${today.getDate()} de ${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][today.getMonth()]} de ${today.getFullYear()}`, 20, 160);
  
  pdf.text('_________________________________', 105, 190, { align: 'center' });
  pdf.text('O(A) Director(a) Geral', 105, 198, { align: 'center' });
  
  pdf.save(`Declaracao_${aluno.nomeCompleto}.pdf`);
}

function gerarCertificadoPDF(aluno: Aluno, classes: Classe[], anoLetivo: AnoLetivo) {
  const pdf = new jsPDF('l');
  const classe = classes.find(c => c.id === aluno.classeId);
  
  pdf.setDrawColor(0, 51, 153);
  pdf.setLineWidth(3);
  pdf.rect(10, 10, 277, 190);
  pdf.setLineWidth(1);
  pdf.rect(15, 15, 267, 180);
  
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 51, 153);
  pdf.text('REPÚBLICA DE ANGOLA', 148.5, 35, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text('COMPLEXO ESCOLAR NKALAMBATA', 148.5, 45, { align: 'center' });
  
  pdf.setFontSize(28);
  pdf.setTextColor(139, 69, 19);
  pdf.text('CERTIFICADO', 148.5, 70, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  const texto = `Certificamos que ${aluno.nomeCompleto}, nascido(a) em ${aluno.dataNascimento}, ` +
    `natural de ${aluno.naturalidade}, província de ${aluno.provincia}, ` +
    `concluiu com êxito a ${classe?.nome || ''} classe do ensino ${classe?.nivel || ''}, ` +
    `no ano lectivo de ${anoLetivo?.ano || ''}, nesta instituição de ensino.`;
  
  const lines = pdf.splitTextToSize(texto, 230);
  pdf.text(lines, 148.5, 95, { align: 'center' });
  
  const today = new Date();
  pdf.text(`Luanda, ${today.getDate()} de ${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][today.getMonth()]} de ${today.getFullYear()}`, 148.5, 140, { align: 'center' });
  
  pdf.text('_________________________________', 80, 170, { align: 'center' });
  pdf.text('O(A) Director(a) Geral', 80, 178, { align: 'center' });
  
  pdf.text('_________________________________', 217, 170, { align: 'center' });
  pdf.text('O(A) Secretário(a)', 217, 178, { align: 'center' });
  
  pdf.save(`Certificado_${aluno.nomeCompleto}.pdf`);
}

async function gerarDeclaracaoDOCX(aluno: Aluno, classes: Classe[], turmas: Turma[], anoLetivo: AnoLetivo) {
  const classe = classes.find(c => c.id === aluno.classeId);
  const turma = turmas.find(t => t.id === aluno.turmaId);
  const today = new Date();
  
  const documento = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'REPÚBLICA DE ANGOLA', bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MINISTÉRIO DA EDUCAÇÃO', bold: true, size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'COMPLEXO ESCOLAR NKALAMBATA', bold: true, size: 26 })] }),
        new Paragraph({ text: '' }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 400 }, children: [new TextRun({ text: 'DECLARAÇÃO', bold: true, size: 32 })] }),
        new Paragraph({ text: '' }),
        new Paragraph({
          spacing: { line: 360 },
          children: [new TextRun({
            text: `Para os devidos efeitos, declara-se que ${aluno.nomeCompleto}, nascido(a) em ${aluno.dataNascimento}, natural de ${aluno.naturalidade}, província de ${aluno.provincia}, portador(a) do documento ${aluno.documentoIdentificacao || 'N/A'}, é aluno(a) desta instituição de ensino, encontrando-se matriculado(a) e a frequentar a ${classe?.nome || ''} classe, turma "${turma?.nome || ''}", no ano lectivo de ${anoLetivo?.ano || ''}.`,
            size: 24
          })]
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({
            text: 'Por ser verdade e me ter sido solicitado(a), passo a presente declaração que vai por mim assinada e autenticada com carimbo em uso nesta instituição.',
            size: 24
          })]
        }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({
            text: `Luanda, aos ${today.getDate()} de ${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][today.getMonth()]} de ${today.getFullYear()}`,
            size: 24
          })]
        }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '_________________________________', size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'O(A) Director(a) Geral', size: 24 })] }),
      ]
    }]
  });
  
  const blob = await Packer.toBlob(documento);
  saveAs(blob, `Declaracao_${aluno.nomeCompleto}.docx`);
}

function gerarBoletimPDF(aluno: Aluno, notas: Nota[], disciplinas: Disciplina[], trimestres: Trimestre[], classes: Classe[], turmas: Turma[], anoLetivo: AnoLetivo) {
  const pdf = new jsPDF();
  const classe = classes.find(c => c.id === aluno.classeId);
  const turma = turmas.find(t => t.id === aluno.turmaId);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('COMPLEXO ESCOLAR NKALAMBATA', 105, 15, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('BOLETIM DE NOTAS', 105, 22, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.text(`Aluno(a): ${aluno.nomeCompleto}`, 14, 35);
  pdf.text(`Classe: ${classe?.nome || ''}`, 14, 42);
  pdf.text(`Turma: ${turma?.nome || ''}`, 100, 42);
  pdf.text(`Ano Lectivo: ${anoLetivo?.ano || ''}`, 150, 42);
  pdf.text(`Nº Matrícula: ${aluno.numeroMatricula}`, 14, 49);
  
  const alunoDiscs = disciplinas.filter(d => d.classeId === aluno.classeId);
  const trimestresFiltrados = trimestres.filter(t => t.anoLetivoId === anoLetivo?.id);
  
  const headers = ['Disciplina', ...trimestresFiltrados.map(t => `${t.numero}º Trim.`), 'Média Final'];
  const rows: any[] = [];
  
  alunoDiscs.forEach(disc => {
    const row: any[] = [disc.nome];
    let soma = 0;
    let count = 0;
    trimestresFiltrados.forEach(trim => {
      const nota = notas.find(n => n.alunoId === aluno.id && n.disciplinaId === disc.id && n.trimestreId === trim.id);
      const mt = nota?.mt ?? '-';
      row.push(mt);
      if (typeof mt === 'number') { soma += mt; count++; }
    });
    const media = count > 0 ? (soma / count).toFixed(1) : '-';
    row.push(media);
    rows.push(row);
  });
  
  autoTable(pdf, {
    startY: 55,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 51, 153], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 255] },
  });
  
  pdf.save(`Boletim_${aluno.nomeCompleto}.pdf`);
}

function exportarBackupXLS(state: AppState) {
  const wb = XLSX.utils.book_new();
  
  if (state.users.length > 0) {
    const usersSheet = XLSX.utils.json_to_sheet(state.users.map(u => ({...u, senha: '***', foto: ''})));
    XLSX.utils.book_append_sheet(wb, usersSheet, 'Utilizadores');
  }
  if (state.alunos.length > 0) {
    const alunosSheet = XLSX.utils.json_to_sheet(state.alunos.map(a => ({...a, foto: ''})));
    XLSX.utils.book_append_sheet(wb, alunosSheet, 'Alunos');
  }
  if (state.classes.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.classes), 'Classes');
  }
  if (state.turmas.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.turmas), 'Turmas');
  }
  if (state.disciplinas.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.disciplinas), 'Disciplinas');
  }
  if (state.notas.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.notas), 'Notas');
  }
  if (state.anosLetivos.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.anosLetivos), 'AnosLetivos');
  }
  
  XLSX.writeFile(wb, `Backup_CEN_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function gerarPautaPDF(turma: Turma, disciplina: Disciplina, trimestre: Trimestre, alunos: Aluno[], notas: Nota[], classes: Classe[], anoLetivo: AnoLetivo) {
  const pdf = new jsPDF('l');
  const classe = classes.find(c => c.id === turma.classeId);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('COMPLEXO ESCOLAR NKALAMBATA', 148.5, 15, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(`PAUTA DO ${trimestre.numero}º TRIMESTRE`, 148.5, 22, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Classe: ${classe?.nome || ''}  |  Turma: ${turma.nome}  |  Disciplina: ${disciplina.nome}  |  Ano Lectivo: ${anoLetivo?.ano || ''}`, 14, 32);
  
  const alunosTurma = alunos.filter(a => a.turmaId === turma.id && a.ativo);
  const headers = ['Nº', 'Nome do Aluno', 'MAC', 'NPP', 'NPT', 'MT', 'Obs.'];
  const rows = alunosTurma.map((a, i) => {
    const nota = notas.find(n => n.alunoId === a.id && n.disciplinaId === disciplina.id && n.trimestreId === trimestre.id);
    return [i + 1, a.nomeCompleto, nota?.mac ?? '', nota?.npp ?? '', nota?.npt ?? '', nota?.mt ?? '', nota?.observacao ?? ''];
  });
  
  autoTable(pdf, {
    startY: 38,
    head: [headers],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 51, 153], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 80 } }
  });
  
  pdf.save(`Pauta_${turma.nome}_${disciplina.nome}_${trimestre.numero}T.pdf`);
}

// ==================== MAIN APP COMPONENT ====================
export default function App() {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const saveData = useCallback((key: string, data: any[]) => {
    saveToLocal(key, data);
    dispatch({ type: 'SET_DATA', key, data });
    if (navigator.onLine) {
      syncToFirebase(key, data).catch(console.error);
    }
  }, []);

  // Load data from localStorage on init
  useEffect(() => {
    const keys = ['users', 'alunos', 'anosLetivos', 'trimestres', 'classes', 'turmas', 'turnos', 'disciplinas', 'disciplinasProfessor', 'notas', 'mensagens'];
    keys.forEach(key => {
      const data = loadFromLocal(key);
      if (data) dispatch({ type: 'SET_DATA', key, data });
    });
    
    const savedUser = loadFromLocal('currentUser');
    if (savedUser) dispatch({ type: 'SET_USER', user: savedUser });
    
    setInitialized(true);
  }, []);

  // Online/Offline detection and sync
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE', value: true });
      showToast('Conexão restabelecida. Sincronizando dados...', 'info');
      // Sync all data to Firebase
      const keys = ['users', 'alunos', 'anosLetivos', 'trimestres', 'classes', 'turmas', 'turnos', 'disciplinas', 'disciplinasProfessor', 'notas', 'mensagens'];
      keys.forEach(key => {
        const data = loadFromLocal(key);
        if (data && data.length > 0) {
          syncToFirebase(key, data).catch(console.error);
        }
      });
    };
    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE', value: false });
      showToast('Sem conexão. Modo offline activado.', 'info');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  const hasDirector = state.users.some(u => u.perfil === 'diretor_geral');

  if (!hasDirector && !state.currentUser) {
    return (
      <AppContext.Provider value={{ state, dispatch, saveData }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <RegisterDirector onSuccess={() => showToast('Director Geral cadastrado com sucesso!')} showToast={showToast} />
      </AppContext.Provider>
    );
  }

  if (!state.currentUser) {
    return (
      <AppContext.Provider value={{ state, dispatch, saveData }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <LoginPage showToast={showToast} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ state, dispatch, saveData }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex h-screen bg-gray-100">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} showToast={showToast} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <PageRouter currentPage={currentPage} setCurrentPage={setCurrentPage} showToast={showToast} />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}

// ==================== REGISTER DIRECTOR ====================
function RegisterDirector({ onSuccess, showToast }: { onSuccess: () => void; showToast: any }) {
  const { state, dispatch, saveData } = useContext(AppContext);
  const [form, setForm] = useState<any>({});
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.sobrenome || !form.email || !form.senha || !form.bi) {
      showToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }
    const user: User = {
      id: generateId(),
      nome: form.nome,
      sobrenome: form.sobrenome,
      nomeCompleto: `${form.nome} ${form.sobrenome}`,
      perfil: 'diretor_geral',
      email: form.email,
      senha: form.senha,
      telefone: form.telefone || '',
      telefone2: form.telefone2 || '',
      bi: form.bi,
      dataNascimento: form.dataNascimento || '',
      genero: form.genero || '',
      naturalidade: form.naturalidade || '',
      provincia: form.provincia || '',
      municipio: form.municipio || '',
      bairro: form.bairro || '',
      rua: form.rua || '',
      habilitacoes: form.habilitacoes || '',
      especialidade: form.especialidade || '',
      anoExperiencia: form.anoExperiencia || '',
      numeroAgente: form.numeroAgente || '',
      categoria: form.categoria || '',
      dataAdmissao: form.dataAdmissao || '',
      estadoCivil: form.estadoCivil || '',
      foto: form.foto || '',
      ativo: true,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    const newUsers = [...state.users, user];
    saveData('users', newUsers);
    dispatch({ type: 'SET_USER', user });
    saveToLocal('currentUser', user);
    onSuccess();
  };

  const updateForm = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-center text-white">
          <img src="/images/logo.png" alt="Logo" className="w-20 h-20 mx-auto mb-3 rounded-full bg-white p-1 object-contain" />
          <h1 className="text-2xl font-bold">Complexo Escolar Nkalambata</h1>
          <p className="text-blue-200 mt-1">Sistema de Gestão Escolar</p>
          <p className="text-sm text-blue-300 mt-2">Primeiro Acesso - Cadastro do Director Geral</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <button key={s} type="button" onClick={() => setStep(s)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === s ? 'bg-blue-600 text-white scale-110' : step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? '✓' : s}
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mb-4">
            {step === 1 && 'Dados Pessoais'}
            {step === 2 && 'Dados Profissionais'}
            {step === 3 && 'Acesso e Foto'}
          </p>

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Nome" value={form.nome} onChange={(v: string) => updateForm('nome', v)} required />
              <FormInput label="Sobrenome" value={form.sobrenome} onChange={(v: string) => updateForm('sobrenome', v)} required />
              <FormInput label="Nº do BI" value={form.bi} onChange={(v: string) => updateForm('bi', v)} required />
              <FormInput label="Data de Nascimento" type="date" value={form.dataNascimento} onChange={(v: string) => updateForm('dataNascimento', v)} />
              <FormInput label="Género" type="select" value={form.genero} onChange={(v: string) => updateForm('genero', v)} options={generos} />
              <FormInput label="Estado Civil" type="select" value={form.estadoCivil} onChange={(v: string) => updateForm('estadoCivil', v)} options={estadosCivis} />
              <FormInput label="Naturalidade" value={form.naturalidade} onChange={(v: string) => updateForm('naturalidade', v)} />
              <FormInput label="Província" type="select" value={form.provincia} onChange={(v: string) => updateForm('provincia', v)} options={provincias} />
              <FormInput label="Município" value={form.municipio} onChange={(v: string) => updateForm('municipio', v)} />
              <FormInput label="Bairro" value={form.bairro} onChange={(v: string) => updateForm('bairro', v)} />
              <FormInput label="Telefone" value={form.telefone} onChange={(v: string) => updateForm('telefone', v)} placeholder="+244 9XX XXX XXX" />
              <FormInput label="Telefone 2" value={form.telefone2} onChange={(v: string) => updateForm('telefone2', v)} placeholder="+244 9XX XXX XXX" />
            </div>
          )}
          
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Habilitações Literárias" type="select" value={form.habilitacoes} onChange={(v: string) => updateForm('habilitacoes', v)}
                options={['Ensino Médio', 'Bacharelato', 'Licenciatura', 'Mestrado', 'Doutoramento']} />
              <FormInput label="Especialidade" value={form.especialidade} onChange={(v: string) => updateForm('especialidade', v)} />
              <FormInput label="Nº de Agente" value={form.numeroAgente} onChange={(v: string) => updateForm('numeroAgente', v)} />
              <FormInput label="Categoria" value={form.categoria} onChange={(v: string) => updateForm('categoria', v)} />
              <FormInput label="Anos de Experiência" value={form.anoExperiencia} onChange={(v: string) => updateForm('anoExperiencia', v)} />
              <FormInput label="Data de Admissão" type="date" value={form.dataAdmissao} onChange={(v: string) => updateForm('dataAdmissao', v)} />
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-4">
              <ImageUpload value={form.foto} onChange={(v: string) => updateForm('foto', v)} label="Foto de Perfil" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Email" type="email" value={form.email} onChange={(v: string) => updateForm('email', v)} required />
                <FormInput label="Senha" type="password" value={form.senha} onChange={(v: string) => updateForm('senha', v)} required />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                ← Anterior
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-auto">
                Próximo →
              </button>
            ) : (
              <button type="submit" className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ml-auto font-semibold">
                ✓ Cadastrar Director Geral
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== LOGIN PAGE ====================
function LoginPage({ showToast }: { showToast: any }) {
  const { state, dispatch } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.email === email && u.senha === senha && u.ativo);
    if (user) {
      dispatch({ type: 'SET_USER', user });
      saveToLocal('currentUser', user);
      showToast(`Bem-vindo(a), ${user.nomeCompleto}!`, 'success');
    } else {
      showToast('Email ou senha incorretos!', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-center text-white">
          <img src="/images/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4 rounded-full bg-white p-1 object-contain" />
          <h1 className="text-2xl font-bold">Complexo Escolar Nkalambata</h1>
          <p className="text-blue-200 mt-1">Sistema de Gestão Escolar</p>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{Icons.mail}</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="seu.email@exemplo.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
              <input type={showPassword ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg pl-10 pr-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {Icons.eye}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] shadow-lg">
            Entrar no Sistema
          </button>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
            <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {navigator.onLine ? 'Online' : 'Offline'}
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== HEADER ====================
function Header({ setSidebarOpen, sidebarOpen }: any) {
  const { state } = useContext(AppContext);
  const user = state.currentUser!;
  const unreadMessages = state.mensagens.filter(m =>
    (m.destinatarioId === user.id || m.destinatarioPerfil === user.perfil || m.tipo === 'todos') && !m.lida
  ).length;

  return (
    <header className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-lg hover:bg-gray-100 lg:hidden">
          {Icons.menu}
        </button>
        <div className="hidden md:block">
          <h2 className="text-lg font-semibold text-gray-800">
            Bem-vindo(a), {user.nome}!
          </h2>
          <p className="text-xs text-gray-500">{perfilLabels[user.perfil]}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${state.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <div className={`w-2 h-2 rounded-full ${state.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {state.isOnline ? 'Online' : 'Offline'}
        </div>
        <button className="relative p-2 rounded-lg hover:bg-gray-100">
          {Icons.bell}
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {unreadMessages}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {user.foto ? (
            <img src={user.foto} alt="Perfil" className="w-9 h-9 rounded-full object-cover border-2 border-blue-200" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {user.nome[0]}{user.sobrenome[0]}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ==================== SIDEBAR ====================
function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen, showToast }: any) {
  const { state, dispatch } = useContext(AppContext);
  const user = state.currentUser!;

  const menuItems: { id: string; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'dashboard', label: 'Painel Inicial', icon: Icons.home, roles: ['diretor_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
    { id: 'ano_letivo', label: 'Ano Lectivo', icon: Icons.calendar, roles: ['diretor_geral'] },
    { id: 'trimestres', label: 'Trimestres', icon: Icons.clock, roles: ['diretor_geral', 'subdiretor_pedagogico'] },
    { id: 'usuarios', label: 'Utilizadores', icon: Icons.users, roles: ['diretor_geral'] },
    { id: 'classes', label: 'Classes', icon: Icons.grid, roles: ['diretor_geral', 'subdiretor_pedagogico'] },
    { id: 'turmas', label: 'Turmas', icon: Icons.grid, roles: ['diretor_geral', 'subdiretor_pedagogico'] },
    { id: 'turnos', label: 'Turnos', icon: Icons.clock, roles: ['diretor_geral', 'subdiretor_administrativo'] },
    { id: 'disciplinas', label: 'Disciplinas', icon: Icons.book, roles: ['diretor_geral', 'subdiretor_pedagogico'] },
    { id: 'atribuir_disciplinas', label: 'Atribuir Disciplinas', icon: Icons.clipboard, roles: ['diretor_geral', 'subdiretor_pedagogico'] },
    { id: 'alunos', label: 'Alunos', icon: Icons.student, roles: ['diretor_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'] },
    { id: 'notas', label: 'Lançar Notas', icon: Icons.edit, roles: ['professor'] },
    { id: 'pautas', label: 'Pautas', icon: Icons.file, roles: ['diretor_geral', 'subdiretor_pedagogico', 'professor', 'secretaria'] },
    { id: 'boletins', label: 'Boletins', icon: Icons.award, roles: ['secretaria', 'diretor_geral', 'subdiretor_pedagogico', 'encarregado'] },
    { id: 'documentos', label: 'Documentos', icon: Icons.file, roles: ['secretaria', 'diretor_geral'] },
    { id: 'mensagens', label: 'Mensagens', icon: Icons.mail, roles: ['diretor_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
    { id: 'estatisticas', label: 'Estatísticas', icon: Icons.chart, roles: ['diretor_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo'] },
    { id: 'meu_educando', label: 'Meu Educando', icon: Icons.student, roles: ['encarregado'] },
    { id: 'backup', label: 'Backup', icon: Icons.download, roles: ['diretor_geral', 'subdiretor_administrativo'] },
    { id: 'perfil', label: 'Meu Perfil', icon: Icons.settings, roles: ['diretor_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria', 'professor', 'encarregado'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.perfil));

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    localStorage.removeItem(DB_PREFIX + 'currentUser');
    showToast('Sessão encerrada com sucesso!', 'info');
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="p-4 border-b border-blue-700/50">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Logo" className="w-10 h-10 rounded-full bg-white p-0.5 object-contain" />
            <div>
              <h1 className="text-sm font-bold leading-tight">Complexo Escolar</h1>
              <h1 className="text-xs font-semibold text-blue-300">Nkalambata</h1>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {filteredMenu.map(item => (
            <button key={item.id} onClick={() => { setCurrentPage(item.id); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/10 ${currentPage === item.id ? 'bg-white/20 border-r-4 border-yellow-400 font-semibold' : 'text-blue-100'}`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-700/50">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 rounded-lg transition-colors">
            {Icons.logout}
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ==================== PAGE ROUTER ====================
function PageRouter({ currentPage, showToast }: any) {
  switch (currentPage) {
    case 'dashboard': return <DashboardPage />;
    case 'ano_letivo': return <AnoLetivoPage showToast={showToast} />;
    case 'trimestres': return <TrimestresPage showToast={showToast} />;
    case 'usuarios': return <UsuariosPage showToast={showToast} />;
    case 'classes': return <ClassesPage showToast={showToast} />;
    case 'turmas': return <TurmasPage showToast={showToast} />;
    case 'turnos': return <TurnosPage showToast={showToast} />;
    case 'disciplinas': return <DisciplinasPage showToast={showToast} />;
    case 'atribuir_disciplinas': return <AtribuirDisciplinasPage showToast={showToast} />;
    case 'alunos': return <AlunosPage showToast={showToast} />;
    case 'notas': return <NotasPage showToast={showToast} />;
    case 'pautas': return <PautasPage showToast={showToast} />;
    case 'boletins': return <BoletinsPage showToast={showToast} />;
    case 'documentos': return <DocumentosPage showToast={showToast} />;
    case 'mensagens': return <MensagensPage showToast={showToast} />;
    case 'estatisticas': return <EstatisticasPage />;
    case 'meu_educando': return <MeuEducandoPage showToast={showToast} />;
    case 'backup': return <BackupPage showToast={showToast} />;
    case 'perfil': return <PerfilPage showToast={showToast} />;
    default: return <DashboardPage />;
  }
}

// ==================== DASHBOARD ====================
function DashboardPage() {
  const { state } = useContext(AppContext);
  const anoAberto = state.anosLetivos.find(a => a.estado === 'aberto');
  const trimestreAberto = state.trimestres.find(t => t.estado === 'aberto');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">📊 Painel de Controlo</h1>
        <p className="text-blue-200 mt-1">Complexo Escolar Nkalambata</p>
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <span className="bg-white/20 px-3 py-1 rounded-full">
            📅 Ano Lectivo: {anoAberto?.ano || 'Nenhum aberto'}
          </span>
          <span className="bg-white/20 px-3 py-1 rounded-full">
            📖 Trimestre: {trimestreAberto ? `${trimestreAberto.numero}º Trimestre` : 'Nenhum aberto'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Alunos" value={state.alunos.filter(a => a.ativo).length} icon={Icons.student} color="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard title="Professores" value={state.users.filter(u => u.perfil === 'professor' && u.ativo).length} icon={Icons.users} color="bg-gradient-to-br from-green-500 to-green-700" />
        <StatCard title="Turmas" value={state.turmas.length} icon={Icons.grid} color="bg-gradient-to-br from-purple-500 to-purple-700" />
        <StatCard title="Disciplinas" value={state.disciplinas.length} icon={Icons.book} color="bg-gradient-to-br from-orange-500 to-orange-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">{Icons.users} Utilizadores por Perfil</h3>
          <div className="space-y-3">
            {Object.entries(perfilLabels).map(([key, label]) => {
              const count = state.users.filter(u => u.perfil === key && u.ativo).length;
              const total = state.users.filter(u => u.ativo).length || 1;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-48">{label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
                      style={{ width: `${Math.max((count / total) * 100, 8)}%` }}>
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">{Icons.student} Alunos por Classe</h3>
          <div className="space-y-3">
            {state.classes.map(c => {
              const count = state.alunos.filter(a => a.classeId === c.id && a.ativo).length;
              const total = state.alunos.filter(a => a.ativo).length || 1;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-48">{c.nome}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
                      style={{ width: `${Math.max((count / total) * 100, 8)}%` }}>
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
            {state.classes.length === 0 && <p className="text-gray-400 text-sm">Nenhuma classe cadastrada</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Actividades Recentes</h3>
        <div className="space-y-2 text-sm text-gray-600">
          {state.alunos.slice(-5).reverse().map(a => (
            <div key={a.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-green-500">●</span>
              <span>Aluno <strong>{a.nomeCompleto}</strong> matriculado</span>
              <span className="ml-auto text-gray-400">{new Date(a.criadoEm).toLocaleDateString('pt-AO')}</span>
            </div>
          ))}
          {state.alunos.length === 0 && <p className="text-gray-400">Sem actividades recentes</p>}
        </div>
      </div>
    </div>
  );
}

// ==================== ANO LETIVO PAGE ====================
function AnoLetivoPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = () => {
    if (!form.ano) { showToast('Preencha o ano!', 'error'); return; }
    const novo: AnoLetivo = {
      id: form.id || generateId(),
      ano: form.ano,
      descricao: form.descricao || `Ano Lectivo ${form.ano}`,
      inicio: form.inicio || '',
      fim: form.fim || '',
      estado: 'fechado',
      criadoEm: new Date().toISOString(),
    };
    const exists = state.anosLetivos.find(a => a.id === novo.id);
    const updated = exists ? state.anosLetivos.map(a => a.id === novo.id ? novo : a) : [...state.anosLetivos, novo];
    saveData('anosLetivos', updated);
    setModal(false);
    setForm({});
    showToast('Ano lectivo salvo com sucesso!');
  };

  const toggleEstado = (id: string) => {
    const updated = state.anosLetivos.map(a => {
      if (a.id === id) return { ...a, estado: a.estado === 'aberto' ? 'fechado' as const : 'aberto' as const };
      return { ...a, estado: 'fechado' as const };
    });
    saveData('anosLetivos', updated);
    showToast('Estado do ano lectivo alterado!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja eliminar este ano lectivo?')) {
      saveData('anosLetivos', state.anosLetivos.filter(a => a.id !== id));
      showToast('Ano lectivo eliminado!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📅 Gestão de Ano Lectivo</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {Icons.plus} Novo Ano Lectivo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.anosLetivos.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className={`p-4 ${a.estado === 'aberto' ? 'bg-green-500' : 'bg-gray-400'} text-white`}>
              <h3 className="text-xl font-bold">{a.ano}</h3>
              <p className="text-sm opacity-90">{a.descricao}</p>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-600">Início: {a.inicio || 'Não definido'}</p>
              <p className="text-sm text-gray-600">Fim: {a.fim || 'Não definido'}</p>
              <div className="flex items-center justify-between mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${a.estado === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {a.estado === 'aberto' ? '🟢 Aberto' : '🔴 Fechado'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => toggleEstado(a.id)} className={`px-3 py-1 rounded text-xs font-bold ${a.estado === 'aberto' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                    {a.estado === 'aberto' ? 'Fechar' : 'Abrir'}
                  </button>
                  <button onClick={() => { setForm(a); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">{Icons.edit}</button>
                  <button onClick={() => handleDelete(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">{Icons.trash}</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {state.anosLetivos.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📅</p>
            <p>Nenhum ano lectivo cadastrado</p>
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Ano Lectivo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Ano" value={form.ano} onChange={(v: string) => setForm((p: any) => ({ ...p, ano: v }))} required placeholder="2024/2025" />
          <FormInput label="Descrição" value={form.descricao} onChange={(v: string) => setForm((p: any) => ({ ...p, descricao: v }))} />
          <FormInput label="Data de Início" type="date" value={form.inicio} onChange={(v: string) => setForm((p: any) => ({ ...p, inicio: v }))} />
          <FormInput label="Data de Fim" type="date" value={form.fim} onChange={(v: string) => setForm((p: any) => ({ ...p, fim: v }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== TRIMESTRES PAGE ====================
function TrimestresPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = () => {
    if (!form.numero || !form.anoLetivoId) { showToast('Preencha os campos obrigatórios!', 'error'); return; }
    const novo: Trimestre = {
      id: form.id || generateId(),
      anoLetivoId: form.anoLetivoId,
      numero: parseInt(form.numero),
      descricao: form.descricao || `${form.numero}º Trimestre`,
      inicio: form.inicio || '',
      fim: form.fim || '',
      estado: 'fechado',
    };
    const exists = state.trimestres.find(t => t.id === novo.id);
    const updated = exists ? state.trimestres.map(t => t.id === novo.id ? novo : t) : [...state.trimestres, novo];
    saveData('trimestres', updated);
    setModal(false);
    setForm({});
    showToast('Trimestre salvo!');
  };

  const toggleEstado = (id: string) => {
    const updated = state.trimestres.map(t => {
      if (t.id === id) return { ...t, estado: t.estado === 'aberto' ? 'fechado' as const : 'aberto' as const };
      return t;
    });
    saveData('trimestres', updated);
    showToast('Estado do trimestre alterado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📖 Gestão de Trimestres</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Novo Trimestre
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trimestre</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ano Lectivo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Início</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fim</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {state.trimestres.map(t => {
              const ano = state.anosLetivos.find(a => a.id === t.anoLetivoId);
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{t.numero}º Trimestre</td>
                  <td className="px-4 py-3 text-sm">{ano?.ano}</td>
                  <td className="px-4 py-3 text-sm">{t.inicio || '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.fim || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.estado === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.estado === 'aberto' ? 'Aberto' : 'Fechado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => toggleEstado(t.id)} className={`px-2 py-1 rounded text-xs ${t.estado === 'aberto' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {t.estado === 'aberto' ? 'Fechar' : 'Abrir'}
                      </button>
                      <button onClick={() => { setForm(t); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">{Icons.edit}</button>
                      <button onClick={() => { saveData('trimestres', state.trimestres.filter(x => x.id !== t.id)); showToast('Eliminado!'); }} className="p-1 text-red-600 hover:bg-red-50 rounded">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {state.trimestres.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum trimestre cadastrado</p>}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Trimestre">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Ano Lectivo" type="select" value={form.anoLetivoId} required
            onChange={(v: string) => setForm((p: any) => ({ ...p, anoLetivoId: v }))}
            options={state.anosLetivos.map(a => ({ value: a.id, label: a.ano }))} />
          <FormInput label="Número do Trimestre" type="select" value={form.numero} required
            onChange={(v: string) => setForm((p: any) => ({ ...p, numero: v }))}
            options={[{ value: '1', label: '1º Trimestre' }, { value: '2', label: '2º Trimestre' }, { value: '3', label: '3º Trimestre' }]} />
          <FormInput label="Data de Início" type="date" value={form.inicio} onChange={(v: string) => setForm((p: any) => ({ ...p, inicio: v }))} />
          <FormInput label="Data de Fim" type="date" value={form.fim} onChange={(v: string) => setForm((p: any) => ({ ...p, fim: v }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== USUARIOS PAGE ====================
function UsuariosPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState('');
  const [filterPerfil, setFilterPerfil] = useState('');

  const filteredUsers = state.users.filter(u => {
    const matchSearch = u.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchPerfil = !filterPerfil || u.perfil === filterPerfil;
    return matchSearch && matchPerfil;
  });

  const handleSave = () => {
    if (!form.nome || !form.sobrenome || !form.email || !form.perfil) { showToast('Preencha os campos obrigatórios!', 'error'); return; }
    const user: User = {
      id: form.id || generateId(),
      nome: form.nome,
      sobrenome: form.sobrenome,
      nomeCompleto: `${form.nome} ${form.sobrenome}`,
      perfil: form.perfil,
      email: form.email,
      senha: form.senha || '123456',
      telefone: form.telefone || '',
      telefone2: form.telefone2 || '',
      bi: form.bi || '',
      dataNascimento: form.dataNascimento || '',
      genero: form.genero || '',
      naturalidade: form.naturalidade || '',
      provincia: form.provincia || '',
      municipio: form.municipio || '',
      bairro: form.bairro || '',
      rua: form.rua || '',
      habilitacoes: form.habilitacoes || '',
      especialidade: form.especialidade || '',
      anoExperiencia: form.anoExperiencia || '',
      numeroAgente: form.numeroAgente || '',
      categoria: form.categoria || '',
      dataAdmissao: form.dataAdmissao || '',
      estadoCivil: form.estadoCivil || '',
      foto: form.foto || '',
      ativo: form.ativo !== false,
      criadoEm: form.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    const exists = state.users.find(u => u.id === user.id);
    const updated = exists ? state.users.map(u => u.id === user.id ? user : u) : [...state.users, user];
    saveData('users', updated);
    setModal(false);
    setForm({});
    showToast(`Utilizador ${exists ? 'actualizado' : 'cadastrado'} com sucesso!`);
  };

  const toggleAtivo = (id: string) => {
    const updated = state.users.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u);
    saveData('users', updated);
    showToast('Estado do utilizador alterado!');
  };

  const updateForm = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">👥 Gestão de Utilizadores</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Novo Utilizador
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{Icons.search}</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Pesquisar utilizador..." />
        </div>
        <select value={filterPerfil} onChange={e => setFilterPerfil(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">Todos os perfis</option>
          {Object.entries(perfilLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Foto</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome Completo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Perfil</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Telefone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {u.foto ? (
                    <img src={u.foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {u.nome[0]}{u.sobrenome[0]}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{u.nomeCompleto}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{perfilLabels[u.perfil]}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.telefone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.ativo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setForm(u); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar">{Icons.edit}</button>
                    <button onClick={() => toggleAtivo(u.id)} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded" title={u.ativo ? 'Desactivar' : 'Activar'}>
                      {u.ativo ? Icons.x : Icons.check}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum utilizador encontrado</p>}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={form.id ? 'Editar Utilizador' : 'Novo Utilizador'} size="lg">
        <div className="space-y-6">
          <ImageUpload value={form.foto} onChange={(v: string) => updateForm('foto', v)} label="Foto de Perfil" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput label="Nome" value={form.nome} onChange={(v: string) => updateForm('nome', v)} required />
            <FormInput label="Sobrenome" value={form.sobrenome} onChange={(v: string) => updateForm('sobrenome', v)} required />
            <FormInput label="Perfil" type="select" value={form.perfil} required
              onChange={(v: string) => updateForm('perfil', v)}
              options={Object.entries(perfilLabels).filter(([k]) => k !== 'diretor_geral').map(([k, v]) => ({ value: k, label: v }))} />
            <FormInput label="Nº do BI" value={form.bi} onChange={(v: string) => updateForm('bi', v)} required />
            <FormInput label="Data de Nascimento" type="date" value={form.dataNascimento} onChange={(v: string) => updateForm('dataNascimento', v)} />
            <FormInput label="Género" type="select" value={form.genero} onChange={(v: string) => updateForm('genero', v)} options={generos} />
            <FormInput label="Estado Civil" type="select" value={form.estadoCivil} onChange={(v: string) => updateForm('estadoCivil', v)} options={estadosCivis} />
            <FormInput label="Naturalidade" value={form.naturalidade} onChange={(v: string) => updateForm('naturalidade', v)} />
            <FormInput label="Província" type="select" value={form.provincia} onChange={(v: string) => updateForm('provincia', v)} options={provincias} />
            <FormInput label="Município" value={form.municipio} onChange={(v: string) => updateForm('municipio', v)} />
            <FormInput label="Bairro" value={form.bairro} onChange={(v: string) => updateForm('bairro', v)} />
            <FormInput label="Rua" value={form.rua} onChange={(v: string) => updateForm('rua', v)} />
            <FormInput label="Telefone" value={form.telefone} onChange={(v: string) => updateForm('telefone', v)} placeholder="+244 9XX XXX XXX" />
            <FormInput label="Telefone 2" value={form.telefone2} onChange={(v: string) => updateForm('telefone2', v)} />
            <FormInput label="Habilitações" type="select" value={form.habilitacoes} onChange={(v: string) => updateForm('habilitacoes', v)}
              options={['Ensino Primário', 'Ensino Médio', 'Bacharelato', 'Licenciatura', 'Mestrado', 'Doutoramento']} />
            <FormInput label="Especialidade" value={form.especialidade} onChange={(v: string) => updateForm('especialidade', v)} />
            <FormInput label="Nº de Agente" value={form.numeroAgente} onChange={(v: string) => updateForm('numeroAgente', v)} />
            <FormInput label="Categoria" value={form.categoria} onChange={(v: string) => updateForm('categoria', v)} />
            <FormInput label="Anos de Experiência" value={form.anoExperiencia} onChange={(v: string) => updateForm('anoExperiencia', v)} />
            <FormInput label="Data de Admissão" type="date" value={form.dataAdmissao} onChange={(v: string) => updateForm('dataAdmissao', v)} />
            <FormInput label="Email" type="email" value={form.email} onChange={(v: string) => updateForm('email', v)} required />
            <FormInput label="Senha" type="password" value={form.senha} onChange={(v: string) => updateForm('senha', v)} required={!form.id} placeholder={form.id ? 'Manter actual' : ''} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ==================== CLASSES PAGE ====================
function ClassesPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = () => {
    if (!form.nome || !form.nivel) { showToast('Preencha os campos!', 'error'); return; }
    const novo: Classe = { id: form.id || generateId(), nome: form.nome, nivel: form.nivel, descricao: form.descricao || '' };
    const exists = state.classes.find(c => c.id === novo.id);
    const updated = exists ? state.classes.map(c => c.id === novo.id ? novo : c) : [...state.classes, novo];
    saveData('classes', updated);
    setModal(false);
    setForm({});
    showToast('Classe salva!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🏫 Gestão de Classes</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Nova Classe
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.classes.map(c => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{c.nome}</h3>
                <p className="text-sm text-gray-500">{c.nivel}</p>
                <p className="text-xs text-gray-400 mt-1">{state.alunos.filter(a => a.classeId === c.id && a.ativo).length} alunos</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm(c); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">{Icons.edit}</button>
                <button onClick={() => { saveData('classes', state.classes.filter(x => x.id !== c.id)); showToast('Eliminada!'); }} className="p-1 text-red-600 hover:bg-red-50 rounded">{Icons.trash}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {state.classes.length === 0 && <p className="text-center py-12 text-gray-400">Nenhuma classe cadastrada</p>}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Classe">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Nome da Classe" value={form.nome} onChange={(v: string) => setForm((p: any) => ({ ...p, nome: v }))} required placeholder="Ex: 7ª Classe" />
          <FormInput label="Nível de Ensino" type="select" value={form.nivel}
            onChange={(v: string) => setForm((p: any) => ({ ...p, nivel: v }))} required
            options={['Ensino Primário', 'I Ciclo do Ensino Secundário', 'II Ciclo do Ensino Secundário']} />
          <FormInput label="Descrição" value={form.descricao} onChange={(v: string) => setForm((p: any) => ({ ...p, descricao: v }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== TURMAS PAGE ====================
function TurmasPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = () => {
    if (!form.nome || !form.classeId) { showToast('Preencha os campos!', 'error'); return; }
    const novo: Turma = {
      id: form.id || generateId(),
      nome: form.nome,
      classeId: form.classeId,
      turnoId: form.turnoId || '',
      professorDiretorId: form.professorDiretorId || '',
      sala: form.sala || '',
      capacidade: form.capacidade ? parseInt(form.capacidade) : undefined,
    };
    const exists = state.turmas.find(t => t.id === novo.id);
    const updated = exists ? state.turmas.map(t => t.id === novo.id ? novo : t) : [...state.turmas, novo];
    saveData('turmas', updated);
    setModal(false);
    setForm({});
    showToast('Turma salva!');
  };

  const professores = state.users.filter(u => u.perfil === 'professor' && u.ativo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📋 Gestão de Turmas</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Nova Turma
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Turma</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Turno</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Director de Turma</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sala</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Alunos</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {state.turmas.map(t => {
              const classe = state.classes.find(c => c.id === t.classeId);
              const turno = state.turnos.find(tn => tn.id === t.turnoId);
              const dirTurma = state.users.find(u => u.id === t.professorDiretorId);
              const numAlunos = state.alunos.filter(a => a.turmaId === t.id && a.ativo).length;
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{t.nome}</td>
                  <td className="px-4 py-3 text-sm">{classe?.nome}</td>
                  <td className="px-4 py-3 text-sm">{turno?.nome || '-'}</td>
                  <td className="px-4 py-3 text-sm">{dirTurma?.nomeCompleto || '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.sala || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">{numAlunos}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm(t); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">{Icons.edit}</button>
                      <button onClick={() => { saveData('turmas', state.turmas.filter(x => x.id !== t.id)); showToast('Eliminada!'); }} className="p-1 text-red-600 hover:bg-red-50 rounded">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {state.turmas.length === 0 && <p className="text-center py-8 text-gray-400">Nenhuma turma cadastrada</p>}
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Turma">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Nome da Turma" value={form.nome} onChange={(v: string) => setForm((p: any) => ({ ...p, nome: v }))} required placeholder="Ex: A, B, C" />
          <FormInput label="Classe" type="select" value={form.classeId} required
            onChange={(v: string) => setForm((p: any) => ({ ...p, classeId: v }))}
            options={state.classes.map(c => ({ value: c.id, label: c.nome }))} />
          <FormInput label="Turno" type="select" value={form.turnoId}
            onChange={(v: string) => setForm((p: any) => ({ ...p, turnoId: v }))}
            options={state.turnos.map(t => ({ value: t.id, label: t.nome }))} />
          <FormInput label="Director de Turma" type="select" value={form.professorDiretorId}
            onChange={(v: string) => setForm((p: any) => ({ ...p, professorDiretorId: v }))}
            options={professores.map(p => ({ value: p.id, label: p.nomeCompleto }))} />
          <FormInput label="Sala" value={form.sala} onChange={(v: string) => setForm((p: any) => ({ ...p, sala: v }))} />
          <FormInput label="Capacidade" type="number" value={form.capacidade} onChange={(v: string) => setForm((p: any) => ({ ...p, capacidade: v }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== TURNOS PAGE ====================
function TurnosPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = () => {
    if (!form.nome) { showToast('Preencha o nome!', 'error'); return; }
    const novo: Turno = { id: form.id || generateId(), nome: form.nome, horaInicio: form.horaInicio || '', horaFim: form.horaFim || '' };
    const exists = state.turnos.find(t => t.id === novo.id);
    const updated = exists ? state.turnos.map(t => t.id === novo.id ? novo : t) : [...state.turnos, novo];
    saveData('turnos', updated);
    setModal(false);
    setForm({});
    showToast('Turno salvo!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🕐 Gestão de Turnos</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Novo Turno
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.turnos.map(t => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{t.nome}</h3>
                <p className="text-sm text-gray-500 mt-1">{t.horaInicio} - {t.horaFim}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm(t); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">{Icons.edit}</button>
                <button onClick={() => { saveData('turnos', state.turnos.filter(x => x.id !== t.id)); showToast('Eliminado!'); }} className="p-1 text-red-600 hover:bg-red-50 rounded">{Icons.trash}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {state.turnos.length === 0 && <p className="text-center py-12 text-gray-400">Nenhum turno cadastrado</p>}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Turno">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput label="Nome" value={form.nome} onChange={(v: string) => setForm((p: any) => ({ ...p, nome: v }))} required placeholder="Ex: Manhã" />
          <FormInput label="Hora Início" type="time" value={form.horaInicio} onChange={(v: string) => setForm((p: any) => ({ ...p, horaInicio: v }))} />
          <FormInput label="Hora Fim" type="time" value={form.horaFim} onChange={(v: string) => setForm((p: any) => ({ ...p, horaFim: v }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== DISCIPLINAS PAGE ====================
function DisciplinasPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = () => {
    if (!form.nome || !form.classeId) { showToast('Preencha os campos!', 'error'); return; }
    const novo: Disciplina = {
      id: form.id || generateId(),
      nome: form.nome,
      codigo: form.codigo || '',
      classeId: form.classeId,
      cargaHoraria: form.cargaHoraria ? parseInt(form.cargaHoraria) : undefined,
    };
    const exists = state.disciplinas.find(d => d.id === novo.id);
    const updated = exists ? state.disciplinas.map(d => d.id === novo.id ? novo : d) : [...state.disciplinas, novo];
    saveData('disciplinas', updated);
    setModal(false);
    setForm({});
    showToast('Disciplina salva!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📚 Gestão de Disciplinas</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Nova Disciplina
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Disciplina</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">C/H</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {state.disciplinas.map(d => {
              const classe = state.classes.find(c => c.id === d.classeId);
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{d.codigo || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{d.nome}</td>
                  <td className="px-4 py-3 text-sm">{classe?.nome}</td>
                  <td className="px-4 py-3 text-sm">{d.cargaHoraria ? `${d.cargaHoraria}h` : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm(d); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">{Icons.edit}</button>
                      <button onClick={() => { saveData('disciplinas', state.disciplinas.filter(x => x.id !== d.id)); showToast('Eliminada!'); }} className="p-1 text-red-600 hover:bg-red-50 rounded">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {state.disciplinas.length === 0 && <p className="text-center py-8 text-gray-400">Nenhuma disciplina cadastrada</p>}
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Disciplina">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Nome da Disciplina" value={form.nome} onChange={(v: string) => setForm((p: any) => ({ ...p, nome: v }))} required placeholder="Ex: Matemática" />
          <FormInput label="Código" value={form.codigo} onChange={(v: string) => setForm((p: any) => ({ ...p, codigo: v }))} placeholder="Ex: MAT" />
          <FormInput label="Classe" type="select" value={form.classeId} required
            onChange={(v: string) => setForm((p: any) => ({ ...p, classeId: v }))}
            options={state.classes.map(c => ({ value: c.id, label: c.nome }))} />
          <FormInput label="Carga Horária (horas)" type="number" value={form.cargaHoraria} onChange={(v: string) => setForm((p: any) => ({ ...p, cargaHoraria: v }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== ATRIBUIR DISCIPLINAS PAGE ====================
function AtribuirDisciplinasPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const professores = state.users.filter(u => u.perfil === 'professor' && u.ativo);
  const anoAberto = state.anosLetivos.find(a => a.estado === 'aberto');

  const handleSave = () => {
    if (!form.professorId || !form.disciplinaId || !form.turmaId) {
      showToast('Preencha todos os campos!', 'error'); return;
    }
    const novo: DisciplinaProfessor = {
      id: form.id || generateId(),
      professorId: form.professorId,
      disciplinaId: form.disciplinaId,
      turmaId: form.turmaId,
      anoLetivoId: anoAberto?.id || '',
    };
    const exists = state.disciplinasProfessor.find(d => d.id === novo.id);
    const updated = exists ? state.disciplinasProfessor.map(d => d.id === novo.id ? novo : d) : [...state.disciplinasProfessor, novo];
    saveData('disciplinasProfessor', updated);
    setModal(false);
    setForm({});
    showToast('Disciplina atribuída!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📝 Atribuir Disciplinas aos Professores</h1>
        <button onClick={() => { setForm({}); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Atribuir
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Professor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Disciplina</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Turma</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {state.disciplinasProfessor.map(dp => {
              const prof = state.users.find(u => u.id === dp.professorId);
              const disc = state.disciplinas.find(d => d.id === dp.disciplinaId);
              const turma = state.turmas.find(t => t.id === dp.turmaId);
              const classe = state.classes.find(c => c.id === turma?.classeId);
              return (
                <tr key={dp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{prof?.nomeCompleto}</td>
                  <td className="px-4 py-3 text-sm">{disc?.nome}</td>
                  <td className="px-4 py-3 text-sm">{turma?.nome}</td>
                  <td className="px-4 py-3 text-sm">{classe?.nome}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { saveData('disciplinasProfessor', state.disciplinasProfessor.filter(x => x.id !== dp.id)); showToast('Removida!'); }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded">{Icons.trash}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {state.disciplinasProfessor.length === 0 && <p className="text-center py-8 text-gray-400">Nenhuma atribuição registada</p>}
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Atribuir Disciplina">
        <div className="grid grid-cols-1 gap-4">
          <FormInput label="Professor" type="select" value={form.professorId} required
            onChange={(v: string) => setForm((p: any) => ({ ...p, professorId: v }))}
            options={professores.map(p => ({ value: p.id, label: p.nomeCompleto }))} />
          <FormInput label="Disciplina" type="select" value={form.disciplinaId} required
            onChange={(v: string) => setForm((p: any) => ({ ...p, disciplinaId: v }))}
            options={state.disciplinas.map(d => ({ value: d.id, label: `${d.nome} (${state.classes.find(c => c.id === d.classeId)?.nome || ''})` }))} />
          <FormInput label="Turma" type="select" value={form.turmaId} required
            onChange={(v: string) => setForm((p: any) => ({ ...p, turmaId: v }))}
            options={state.turmas.map(t => ({ value: t.id, label: `${t.nome} - ${state.classes.find(c => c.id === t.classeId)?.nome || ''}` }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Atribuir</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== ALUNOS PAGE ====================
function AlunosPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [viewAluno, setViewAluno] = useState<Aluno | null>(null);

  const filteredAlunos = state.alunos.filter(a => {
    const matchSearch = a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || a.numeroMatricula.includes(search);
    const matchClasse = !filterClasse || a.classeId === filterClasse;
    return matchSearch && matchClasse;
  });

  const nextMatricula = () => {
    const year = new Date().getFullYear();
    const count = state.alunos.length + 1;
    return `CEN${year}${count.toString().padStart(4, '0')}`;
  };

  const handleSave = () => {
    if (!form.nomeCompleto || !form.classeId || !form.turmaId) { showToast('Preencha os campos obrigatórios!', 'error'); return; }
    const aluno: Aluno = {
      id: form.id || generateId(),
      numeroMatricula: form.numeroMatricula || nextMatricula(),
      nomeCompleto: form.nomeCompleto,
      dataNascimento: form.dataNascimento || '',
      genero: form.genero || '',
      naturalidade: form.naturalidade || '',
      provincia: form.provincia || '',
      municipio: form.municipio || '',
      bairro: form.bairro || '',
      nomePai: form.nomePai || '',
      nomeMae: form.nomeMae || '',
      encarregadoId: form.encarregadoId || '',
      nomeEncarregado: form.nomeEncarregado || '',
      telefoneEncarregado: form.telefoneEncarregado || '',
      classeId: form.classeId,
      turmaId: form.turmaId,
      turnoId: form.turnoId || '',
      foto: form.foto || '',
      grupoSanguineo: form.grupoSanguineo || '',
      doencaCronica: form.doencaCronica || '',
      necessidadeEspecial: form.necessidadeEspecial || '',
      documentoIdentificacao: form.documentoIdentificacao || '',
      ativo: form.ativo !== false,
      criadoEm: form.criadoEm || new Date().toISOString(),
    };
    const exists = state.alunos.find(a => a.id === aluno.id);
    const updated = exists ? state.alunos.map(a => a.id === aluno.id ? aluno : a) : [...state.alunos, aluno];
    saveData('alunos', updated);
    setModal(false);
    setForm({});
    showToast(`Aluno ${exists ? 'actualizado' : 'matriculado'} com sucesso!`);
  };

  const encarregados = state.users.filter(u => u.perfil === 'encarregado' && u.ativo);
  const updateForm = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">🎓 Gestão de Alunos</h1>
        <button onClick={() => { setForm({ numeroMatricula: nextMatricula() }); setModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Matricular Aluno
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{Icons.search}</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Pesquisar aluno..." />
        </div>
        <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">Todas as classes</option>
          {state.classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Foto</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nº Mat.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome Completo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Turma</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredAlunos.map(a => {
              const classe = state.classes.find(c => c.id === a.classeId);
              const turma = state.turmas.find(t => t.id === a.turmaId);
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {a.foto ? (
                      <img src={a.foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                        {a.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{a.numeroMatricula}</td>
                  <td className="px-4 py-3 text-sm font-medium">{a.nomeCompleto}</td>
                  <td className="px-4 py-3 text-sm">{classe?.nome}</td>
                  <td className="px-4 py-3 text-sm">{turma?.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${a.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {a.ativo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setViewAluno(a)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Ver">{Icons.eye}</button>
                      <button onClick={() => { setForm(a); setModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar">{Icons.edit}</button>
                      <button onClick={() => {
                        const updated = state.alunos.map(x => x.id === a.id ? { ...x, ativo: !x.ativo } : x);
                        saveData('alunos', updated);
                      }} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded">{a.ativo ? Icons.x : Icons.check}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredAlunos.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum aluno encontrado</p>}
      </div>

      {/* View Aluno Modal */}
      <Modal isOpen={!!viewAluno} onClose={() => setViewAluno(null)} title="Ficha do Aluno" size="lg">
        {viewAluno && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewAluno.foto ? (
                <img src={viewAluno.foto} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-blue-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl">
                  {viewAluno.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-800">{viewAluno.nomeCompleto}</h3>
                <p className="text-sm text-gray-500">Nº Matrícula: {viewAluno.numeroMatricula}</p>
                <p className="text-sm text-gray-500">
                  {state.classes.find(c => c.id === viewAluno.classeId)?.nome} - Turma {state.turmas.find(t => t.id === viewAluno.turmaId)?.nome}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="font-semibold text-gray-600">Data Nasc.:</span> {viewAluno.dataNascimento}</div>
              <div><span className="font-semibold text-gray-600">Género:</span> {viewAluno.genero}</div>
              <div><span className="font-semibold text-gray-600">Naturalidade:</span> {viewAluno.naturalidade}</div>
              <div><span className="font-semibold text-gray-600">Província:</span> {viewAluno.provincia}</div>
              <div><span className="font-semibold text-gray-600">Município:</span> {viewAluno.municipio}</div>
              <div><span className="font-semibold text-gray-600">Bairro:</span> {viewAluno.bairro}</div>
              <div><span className="font-semibold text-gray-600">Nome do Pai:</span> {viewAluno.nomePai}</div>
              <div><span className="font-semibold text-gray-600">Nome da Mãe:</span> {viewAluno.nomeMae}</div>
              <div><span className="font-semibold text-gray-600">Encarregado:</span> {viewAluno.nomeEncarregado}</div>
              <div><span className="font-semibold text-gray-600">Tel. Encarregado:</span> {viewAluno.telefoneEncarregado}</div>
              <div><span className="font-semibold text-gray-600">Grupo Sanguíneo:</span> {viewAluno.grupoSanguineo || '-'}</div>
              <div><span className="font-semibold text-gray-600">Doença Crónica:</span> {viewAluno.doencaCronica || 'Nenhuma'}</div>
              <div><span className="font-semibold text-gray-600">Nec. Especial:</span> {viewAluno.necessidadeEspecial || 'Nenhuma'}</div>
              <div><span className="font-semibold text-gray-600">Doc. Identificação:</span> {viewAluno.documentoIdentificacao || '-'}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Aluno Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={form.id ? 'Editar Aluno' : 'Matricular Aluno'} size="lg">
        <div className="space-y-6">
          <ImageUpload value={form.foto} onChange={(v: string) => updateForm('foto', v)} label="Fotografia do Aluno" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput label="Nº Matrícula" value={form.numeroMatricula} onChange={(v: string) => updateForm('numeroMatricula', v)} disabled />
            <FormInput label="Nome Completo" value={form.nomeCompleto} onChange={(v: string) => updateForm('nomeCompleto', v)} required />
            <FormInput label="Data de Nascimento" type="date" value={form.dataNascimento} onChange={(v: string) => updateForm('dataNascimento', v)} />
            <FormInput label="Género" type="select" value={form.genero} onChange={(v: string) => updateForm('genero', v)} options={generos} />
            <FormInput label="Naturalidade" value={form.naturalidade} onChange={(v: string) => updateForm('naturalidade', v)} />
            <FormInput label="Província" type="select" value={form.provincia} onChange={(v: string) => updateForm('provincia', v)} options={provincias} />
            <FormInput label="Município" value={form.municipio} onChange={(v: string) => updateForm('municipio', v)} />
            <FormInput label="Bairro" value={form.bairro} onChange={(v: string) => updateForm('bairro', v)} />
            <FormInput label="Nome do Pai" value={form.nomePai} onChange={(v: string) => updateForm('nomePai', v)} />
            <FormInput label="Nome da Mãe" value={form.nomeMae} onChange={(v: string) => updateForm('nomeMae', v)} />
            <FormInput label="Encarregado de Educação" type="select" value={form.encarregadoId}
              onChange={(v: string) => {
                updateForm('encarregadoId', v);
                const enc = encarregados.find(e => e.id === v);
                if (enc) {
                  updateForm('nomeEncarregado', enc.nomeCompleto);
                  updateForm('telefoneEncarregado', enc.telefone);
                }
              }}
              options={encarregados.map(e => ({ value: e.id, label: e.nomeCompleto }))} />
            <FormInput label="Nome do Encarregado" value={form.nomeEncarregado} onChange={(v: string) => updateForm('nomeEncarregado', v)} />
            <FormInput label="Telefone do Encarregado" value={form.telefoneEncarregado} onChange={(v: string) => updateForm('telefoneEncarregado', v)} />
            <FormInput label="Classe" type="select" value={form.classeId} required
              onChange={(v: string) => updateForm('classeId', v)}
              options={state.classes.map(c => ({ value: c.id, label: c.nome }))} />
            <FormInput label="Turma" type="select" value={form.turmaId} required
              onChange={(v: string) => updateForm('turmaId', v)}
              options={state.turmas.filter(t => !form.classeId || t.classeId === form.classeId).map(t => ({ value: t.id, label: t.nome }))} />
            <FormInput label="Turno" type="select" value={form.turnoId}
              onChange={(v: string) => updateForm('turnoId', v)}
              options={state.turnos.map(t => ({ value: t.id, label: t.nome }))} />
            <FormInput label="Grupo Sanguíneo" type="select" value={form.grupoSanguineo}
              onChange={(v: string) => updateForm('grupoSanguineo', v)} options={gruposSanguineos} />
            <FormInput label="Doença Crónica" value={form.doencaCronica} onChange={(v: string) => updateForm('doencaCronica', v)} />
            <FormInput label="Necessidade Especial" value={form.necessidadeEspecial} onChange={(v: string) => updateForm('necessidadeEspecial', v)} />
            <FormInput label="Doc. Identificação" value={form.documentoIdentificacao} onChange={(v: string) => updateForm('documentoIdentificacao', v)} placeholder="Nº Cédula / BI" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ==================== NOTAS PAGE (Professor) ====================
function NotasPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const user = state.currentUser!;
  const anoAberto = state.anosLetivos.find(a => a.estado === 'aberto');
  const trimestreAberto = state.trimestres.find(t => t.estado === 'aberto');

  const minhasDisciplinas = state.disciplinasProfessor.filter(dp => dp.professorId === user.id);
  const [selectedDP, setSelectedDP] = useState('');
  const [notasLocal, setNotasLocal] = useState<Record<string, any>>({});

  const dp = minhasDisciplinas.find(d => d.id === selectedDP);
  const turma = dp ? state.turmas.find(t => t.id === dp.turmaId) : null;
  const disciplina = dp ? state.disciplinas.find(d => d.id === dp.disciplinaId) : null;
  const alunosTurma = turma ? state.alunos.filter(a => a.turmaId === turma.id && a.ativo).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)) : [];

  useEffect(() => {
    if (dp && trimestreAberto) {
      const notas: Record<string, any> = {};
      alunosTurma.forEach(a => {
        const existing = state.notas.find(n => n.alunoId === a.id && n.disciplinaId === dp.disciplinaId && n.trimestreId === trimestreAberto.id);
        notas[a.id] = existing || { mac: '', npp: '', npt: '' };
      });
      setNotasLocal(notas);
    }
  }, [selectedDP, trimestreAberto?.id]);

  const updateNota = (alunoId: string, field: string, value: string) => {
    const numVal = value === '' ? '' : Math.min(20, Math.max(0, parseFloat(value) || 0));
    setNotasLocal(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [field]: numVal }
    }));
  };

  const calcularMT = (nota: any) => {
    const mac = parseFloat(nota.mac) || 0;
    const npp = parseFloat(nota.npp) || 0;
    const npt = parseFloat(nota.npt) || 0;
    if (!nota.mac && !nota.npp && !nota.npt) return null;
    return Math.round(((mac * 2 + npp * 3 + npt * 5) / 10) * 10) / 10;
  };

  const handleSaveNotas = () => {
    if (!dp || !trimestreAberto || !anoAberto) {
      showToast('Selecione a disciplina e verifique se há trimestre aberto!', 'error');
      return;
    }
    const newNotas = [...state.notas];
    Object.entries(notasLocal).forEach(([alunoId, nota]) => {
      const mt = calcularMT(nota);
      const existIdx = newNotas.findIndex(n => n.alunoId === alunoId && n.disciplinaId === dp.disciplinaId && n.trimestreId === trimestreAberto.id);
      const notaObj: Nota = {
        id: existIdx >= 0 ? newNotas[existIdx].id : generateId(),
        alunoId,
        disciplinaId: dp.disciplinaId,
        trimestreId: trimestreAberto.id,
        anoLetivoId: anoAberto.id,
        mac: nota.mac === '' ? null : parseFloat(nota.mac),
        npp: nota.npp === '' ? null : parseFloat(nota.npp),
        npt: nota.npt === '' ? null : parseFloat(nota.npt),
        mt,
      };
      if (existIdx >= 0) {
        newNotas[existIdx] = notaObj;
      } else {
        newNotas.push(notaObj);
      }
    });
    saveData('notas', newNotas);
    showToast('Notas salvas com sucesso!');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📝 Lançamento de Notas</h1>
      
      {!trimestreAberto && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
          ⚠️ Nenhum trimestre aberto. Contacte o Director para abrir um trimestre.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <FormInput label="Selecionar Disciplina / Turma" type="select" value={selectedDP}
          onChange={setSelectedDP}
          options={minhasDisciplinas.map(dp => {
            const disc = state.disciplinas.find(d => d.id === dp.disciplinaId);
            const turma = state.turmas.find(t => t.id === dp.turmaId);
            const classe = state.classes.find(c => c.id === turma?.classeId);
            return { value: dp.id, label: `${disc?.nome} - ${classe?.nome} / Turma ${turma?.nome}` };
          })} />
      </div>

      {selectedDP && trimestreAberto && (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <div className="p-4 border-b bg-blue-50">
            <p className="font-semibold text-blue-800">
              {disciplina?.nome} | {state.classes.find(c => c.id === turma?.classeId)?.nome} - Turma {turma?.nome} | {trimestreAberto.numero}º Trimestre
            </p>
            <p className="text-xs text-blue-600 mt-1">MAC = Média de Avaliação Contínua | NPP = Nota da Prova do Professor | NPT = Nota da Prova Trimestral</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-8">Nº</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aluno</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">MAC (20%)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">NPP (30%)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">NPT (50%)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-20">MT</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {alunosTurma.map((a, i) => {
                const nota = notasLocal[a.id] || {};
                const mt = calcularMT(nota);
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{i + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium">{a.nomeCompleto}</td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" max="20" step="0.1" value={nota.mac ?? ''}
                        onChange={e => updateNota(a.id, 'mac', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" max="20" step="0.1" value={nota.npp ?? ''}
                        onChange={e => updateNota(a.id, 'npp', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" max="20" step="0.1" value={nota.npt ?? ''}
                        onChange={e => updateNota(a.id, 'npt', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-bold text-sm ${mt !== null && mt < 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {mt !== null ? mt.toFixed(1) : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 border-t flex justify-end">
            <button onClick={handleSaveNotas} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
              💾 Salvar Notas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== PAUTAS PAGE ====================
function PautasPage({ showToast }: { showToast: any }) {
  const { state } = useContext(AppContext);
  const [turmaId, setTurmaId] = useState('');
  const [discId, setDiscId] = useState('');
  const [trimId, setTrimId] = useState('');

  const turma = state.turmas.find(t => t.id === turmaId);
  const disc = state.disciplinas.find(d => d.id === discId);
  const trim = state.trimestres.find(t => t.id === trimId);
  const anoAberto = state.anosLetivos.find(a => a.estado === 'aberto');

  const alunosTurma = turma ? state.alunos.filter(a => a.turmaId === turma.id && a.ativo).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📋 Pautas</h1>
      <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInput label="Turma" type="select" value={turmaId} onChange={setTurmaId}
          options={state.turmas.map(t => ({ value: t.id, label: `${t.nome} - ${state.classes.find(c => c.id === t.classeId)?.nome}` }))} />
        <FormInput label="Disciplina" type="select" value={discId} onChange={setDiscId}
          options={state.disciplinas.filter(d => !turmaId || d.classeId === turma?.classeId).map(d => ({ value: d.id, label: d.nome }))} />
        <FormInput label="Trimestre" type="select" value={trimId} onChange={setTrimId}
          options={state.trimestres.map(t => ({ value: t.id, label: `${t.numero}º Trimestre` }))} />
      </div>

      {turmaId && discId && trimId && (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Pauta: {disc?.nome} - {state.classes.find(c => c.id === turma?.classeId)?.nome} / Turma {turma?.nome}</h3>
            <button onClick={() => {
              if (turma && disc && trim && anoAberto) {
                gerarPautaPDF(turma, disc, trim, state.alunos, state.notas, state.classes, anoAberto);
                showToast('Pauta gerada em PDF!');
              }
            }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
              {Icons.download} Exportar PDF
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nº</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Aluno</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">MAC</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">NPP</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">NPT</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">MT</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {alunosTurma.map((a, i) => {
                const nota = state.notas.find(n => n.alunoId === a.id && n.disciplinaId === discId && n.trimestreId === trimId);
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{i + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium">{a.nomeCompleto}</td>
                    <td className="px-4 py-2 text-center text-sm">{nota?.mac ?? '-'}</td>
                    <td className="px-4 py-2 text-center text-sm">{nota?.npp ?? '-'}</td>
                    <td className="px-4 py-2 text-center text-sm">{nota?.npt ?? '-'}</td>
                    <td className={`px-4 py-2 text-center text-sm font-bold ${nota?.mt !== null && nota?.mt !== undefined && nota.mt < 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {nota?.mt != null ? nota.mt.toFixed(1) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== BOLETINS PAGE ====================
function BoletinsPage({ showToast }: { showToast: any }) {
  const { state } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const anoAberto = state.anosLetivos.find(a => a.estado === 'aberto');

  const filteredAlunos = state.alunos.filter(a =>
    a.ativo && (a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || a.numeroMatricula.includes(search))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🏆 Boletins de Notas</h1>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{Icons.search}</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Pesquisar aluno..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAlunos.map(a => {
          const classe = state.classes.find(c => c.id === a.classeId);
          return (
            <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              {a.foto ? (
                <img src={a.foto} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {a.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{a.nomeCompleto}</h3>
                <p className="text-xs text-gray-500">{classe?.nome} | {a.numeroMatricula}</p>
              </div>
              <button onClick={() => {
                if (anoAberto) {
                  gerarBoletimPDF(a, state.notas, state.disciplinas, state.trimestres, state.classes, state.turmas, anoAberto);
                  showToast('Boletim gerado!');
                } else showToast('Nenhum ano lectivo aberto!', 'error');
              }} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                📄 PDF
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== DOCUMENTOS PAGE ====================
function DocumentosPage({ showToast }: { showToast: any }) {
  const { state } = useContext(AppContext);
  const [alunoId, setAlunoId] = useState('');
  const aluno = state.alunos.find(a => a.id === alunoId);
  const anoAberto = state.anosLetivos.find(a => a.estado === 'aberto');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📄 Emissão de Documentos</h1>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <FormInput label="Selecionar Aluno" type="select" value={alunoId} onChange={setAlunoId}
          options={state.alunos.filter(a => a.ativo).map(a => ({
            value: a.id,
            label: `${a.nomeCompleto} - ${a.numeroMatricula}`
          }))} />
      </div>

      {aluno && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">📜</div>
            <h3 className="font-bold text-gray-800 mb-2">Declaração</h3>
            <p className="text-sm text-gray-500 mb-4">Declaração de frequência escolar</p>
            <div className="space-y-2">
              <button onClick={() => {
                if (anoAberto) { gerarDeclaracaoPDF(aluno, state.classes, state.turmas, anoAberto); showToast('Declaração PDF gerada!'); }
                else showToast('Abra um ano lectivo primeiro!', 'error');
              }} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                📄 Gerar PDF
              </button>
              <button onClick={() => {
                if (anoAberto) { gerarDeclaracaoDOCX(aluno, state.classes, state.turmas, anoAberto); showToast('Declaração DOCX gerada!'); }
                else showToast('Abra um ano lectivo primeiro!', 'error');
              }} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                📝 Gerar DOCX
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="font-bold text-gray-800 mb-2">Certificado</h3>
            <p className="text-sm text-gray-500 mb-4">Certificado de conclusão</p>
            <button onClick={() => {
              if (anoAberto) { gerarCertificadoPDF(aluno, state.classes, anoAberto); showToast('Certificado gerado!'); }
              else showToast('Abra um ano lectivo primeiro!', 'error');
            }} className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
              📄 Gerar PDF
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold text-gray-800 mb-2">Boletim</h3>
            <p className="text-sm text-gray-500 mb-4">Boletim de notas completo</p>
            <button onClick={() => {
              if (anoAberto) {
                gerarBoletimPDF(aluno, state.notas, state.disciplinas, state.trimestres, state.classes, state.turmas, anoAberto);
                showToast('Boletim gerado!');
              } else showToast('Abra um ano lectivo primeiro!', 'error');
            }} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              📄 Gerar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MENSAGENS PAGE ====================
function MensagensPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);
  const user = state.currentUser!;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ tipo: 'individual' });
  const [tab, setTab] = useState<'recebidas' | 'enviadas'>('recebidas');

  const mensagensRecebidas = state.mensagens.filter(m =>
    m.destinatarioId === user.id || m.destinatarioPerfil === user.perfil || m.tipo === 'todos'
  ).sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

  const mensagensEnviadas = state.mensagens.filter(m => m.remetenteId === user.id)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

  const handleSend = () => {
    if (!form.assunto || !form.corpo) { showToast('Preencha todos os campos!', 'error'); return; }
    const msg: Mensagem = {
      id: generateId(),
      remetenteId: user.id,
      destinatarioId: form.tipo === 'individual' ? form.destinatarioId : undefined,
      destinatarioPerfil: form.tipo === 'grupo' ? form.destinatarioPerfil : undefined,
      assunto: form.assunto,
      corpo: form.corpo,
      lida: false,
      criadoEm: new Date().toISOString(),
      tipo: form.tipo,
    };
    saveData('mensagens', [...state.mensagens, msg]);
    setModal(false);
    setForm({ tipo: 'individual' });
    showToast('Mensagem enviada!');
  };

  const marcarLida = (id: string) => {
    const updated = state.mensagens.map(m => m.id === id ? { ...m, lida: true } : m);
    saveData('mensagens', updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">✉️ Mensagens</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {Icons.plus} Nova Mensagem
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('recebidas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'recebidas' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          📥 Recebidas ({mensagensRecebidas.length})
        </button>
        <button onClick={() => setTab('enviadas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'enviadas' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          📤 Enviadas ({mensagensEnviadas.length})
        </button>
      </div>

      <div className="space-y-2">
        {(tab === 'recebidas' ? mensagensRecebidas : mensagensEnviadas).map(m => {
          const remetente = state.users.find(u => u.id === m.remetenteId);
          const destinatario = state.users.find(u => u.id === m.destinatarioId);
          return (
            <div key={m.id} className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${!m.lida && tab === 'recebidas' ? 'border-l-4 border-blue-500' : ''}`}
              onClick={() => tab === 'recebidas' && marcarLida(m.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm ${!m.lida && tab === 'recebidas' ? 'font-bold' : 'font-medium'}`}>{m.assunto}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {tab === 'recebidas' ? `De: ${remetente?.nomeCompleto}` : `Para: ${m.tipo === 'individual' ? destinatario?.nomeCompleto : m.tipo === 'grupo' ? perfilLabels[m.destinatarioPerfil || ''] : 'Todos'}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{new Date(m.criadoEm).toLocaleDateString('pt-AO')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{m.corpo}</p>
            </div>
          );
        })}
        {(tab === 'recebidas' ? mensagensRecebidas : mensagensEnviadas).length === 0 && (
          <p className="text-center py-8 text-gray-400">Nenhuma mensagem</p>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Nova Mensagem" size="md">
        <div className="space-y-4">
          <FormInput label="Tipo de Envio" type="select" value={form.tipo}
            onChange={(v: string) => setForm((p: any) => ({ ...p, tipo: v }))}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'grupo', label: 'Grupo (por perfil)' },
              { value: 'todos', label: 'Todos os utilizadores' },
            ]} />
          {form.tipo === 'individual' && (
            <FormInput label="Destinatário" type="select" value={form.destinatarioId}
              onChange={(v: string) => setForm((p: any) => ({ ...p, destinatarioId: v }))}
              options={state.users.filter(u => u.id !== user.id && u.ativo).map(u => ({ value: u.id, label: `${u.nomeCompleto} (${perfilLabels[u.perfil]})` }))} />
          )}
          {form.tipo === 'grupo' && (
            <FormInput label="Perfil Destinatário" type="select" value={form.destinatarioPerfil}
              onChange={(v: string) => setForm((p: any) => ({ ...p, destinatarioPerfil: v }))}
              options={Object.entries(perfilLabels).map(([k, v]) => ({ value: k, label: v }))} />
          )}
          <FormInput label="Assunto" value={form.assunto} onChange={(v: string) => setForm((p: any) => ({ ...p, assunto: v }))} required />
          <FormInput label="Mensagem" type="textarea" value={form.corpo} onChange={(v: string) => setForm((p: any) => ({ ...p, corpo: v }))} />
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleSend} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enviar</button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== ESTATISTICAS PAGE ====================
function EstatisticasPage() {
  const { state } = useContext(AppContext);
  
  const totalAlunos = state.alunos.filter(a => a.ativo).length;
  const totalMasculino = state.alunos.filter(a => a.ativo && a.genero === 'Masculino').length;
  const totalFeminino = state.alunos.filter(a => a.ativo && a.genero === 'Feminino').length;
  const totalProf = state.users.filter(u => u.perfil === 'professor' && u.ativo).length;

  // Calcular taxa de aprovação
  const alunosComNotas = state.alunos.filter(a => a.ativo && state.notas.some(n => n.alunoId === a.id));
  let aprovados = 0;
  alunosComNotas.forEach(a => {
    const discAluno = state.disciplinas.filter(d => d.classeId === a.classeId);
    const medias = discAluno.map(d => {
      const notasDisc = state.notas.filter(n => n.alunoId === a.id && n.disciplinaId === d.id && n.mt !== null);
      if (notasDisc.length === 0) return null;
      return notasDisc.reduce((sum, n) => sum + (n.mt || 0), 0) / notasDisc.length;
    }).filter(m => m !== null);
    if (medias.length > 0 && medias.every(m => m! >= 10)) aprovados++;
  });
  const taxaAprovacao = alunosComNotas.length > 0 ? ((aprovados / alunosComNotas.length) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📊 Estatísticas</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Alunos" value={totalAlunos} icon={Icons.student} color="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard title="Alunos (M)" value={totalMasculino} icon={Icons.users} color="bg-gradient-to-br from-cyan-500 to-cyan-700" />
        <StatCard title="Alunas (F)" value={totalFeminino} icon={Icons.users} color="bg-gradient-to-br from-pink-500 to-pink-700" />
        <StatCard title="Professores" value={totalProf} icon={Icons.users} color="bg-gradient-to-br from-green-500 to-green-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">📈 Distribuição por Género</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Masculino</span>
                <span className="font-bold">{totalAlunos > 0 ? ((totalMasculino / totalAlunos) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${totalAlunos > 0 ? (totalMasculino / totalAlunos) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Feminino</span>
                <span className="font-bold">{totalAlunos > 0 ? ((totalFeminino / totalAlunos) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-pink-500 h-4 rounded-full transition-all" style={{ width: `${totalAlunos > 0 ? (totalFeminino / totalAlunos) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">🏆 Taxa de Aprovação</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                <circle cx="64" cy="64" r="56" stroke="#22c55e" strokeWidth="8" fill="none"
                  strokeDasharray={`${parseFloat(taxaAprovacao) * 3.51} 351.68`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600">{taxaAprovacao}%</span>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">{aprovados} aprovados de {alunosComNotas.length} avaliados</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Resumo por Classe</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Classe</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Total Alunos</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Masculino</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Feminino</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Turmas</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Disciplinas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.classes.map(c => {
                const alunosClasse = state.alunos.filter(a => a.classeId === c.id && a.ativo);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.nome}</td>
                    <td className="px-4 py-3 text-center text-sm">{alunosClasse.length}</td>
                    <td className="px-4 py-3 text-center text-sm">{alunosClasse.filter(a => a.genero === 'Masculino').length}</td>
                    <td className="px-4 py-3 text-center text-sm">{alunosClasse.filter(a => a.genero === 'Feminino').length}</td>
                    <td className="px-4 py-3 text-center text-sm">{state.turmas.filter(t => t.classeId === c.id).length}</td>
                    <td className="px-4 py-3 text-center text-sm">{state.disciplinas.filter(d => d.classeId === c.id).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== MEU EDUCANDO PAGE ====================
function MeuEducandoPage({ showToast }: { showToast: any }) {
  const { state } = useContext(AppContext);
  const user = state.currentUser!;
  const anoAberto = state.anosLetivos.find(a => a.estado === 'aberto');

  const meusEducandos = state.alunos.filter(a => a.encarregadoId === user.id && a.ativo);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">👨‍👧‍👦 Meus Educandos</h1>
      
      {meusEducandos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-2">📚</p>
          <p>Nenhum educando vinculado à sua conta.</p>
          <p className="text-sm">Contacte a secretaria para vincular o(s) seu(s) educando(s).</p>
        </div>
      ) : (
        meusEducandos.map(aluno => {
          const classe = state.classes.find(c => c.id === aluno.classeId);
          const turma = state.turmas.find(t => t.id === aluno.turmaId);
          const discAluno = state.disciplinas.filter(d => d.classeId === aluno.classeId);
          
          return (
            <div key={aluno.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white flex items-center gap-4">
                {aluno.foto ? (
                  <img src={aluno.foto} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                    {aluno.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold">{aluno.nomeCompleto}</h3>
                  <p className="text-blue-200">{classe?.nome} - Turma {turma?.nome}</p>
                  <p className="text-blue-300 text-sm">Nº Mat.: {aluno.numeroMatricula}</p>
                </div>
                <button onClick={() => {
                  if (anoAberto) {
                    gerarBoletimPDF(aluno, state.notas, state.disciplinas, state.trimestres, state.classes, state.turmas, anoAberto);
                    showToast('Boletim gerado!');
                  }
                }} className="ml-auto px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm">
                  📄 Boletim PDF
                </button>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-700 mb-3">📊 Notas</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Disciplina</th>
                        {state.trimestres.filter(t => t.anoLetivoId === anoAberto?.id).map(t => (
                          <th key={t.id} className="px-3 py-2 text-center text-xs font-semibold">{t.numero}º T</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {discAluno.map(d => (
                        <tr key={d.id}>
                          <td className="px-3 py-2 text-xs">{d.nome}</td>
                          {state.trimestres.filter(t => t.anoLetivoId === anoAberto?.id).map(t => {
                            const nota = state.notas.find(n => n.alunoId === aluno.id && n.disciplinaId === d.id && n.trimestreId === t.id);
                            return (
                              <td key={t.id} className={`px-3 py-2 text-center text-xs font-bold ${nota?.mt && nota.mt < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                {nota?.mt != null ? nota.mt.toFixed(1) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ==================== BACKUP PAGE ====================
function BackupPage({ showToast }: { showToast: any }) {
  const { state, saveData } = useContext(AppContext);

  const handleExportXLS = () => {
    exportarBackupXLS(state);
    showToast('Backup XLS gerado com sucesso!');
  };

  const handleExportJSON = () => {
    const data = {
      users: state.users.map(u => ({ ...u, foto: '' })),
      alunos: state.alunos.map(a => ({ ...a, foto: '' })),
      anosLetivos: state.anosLetivos,
      trimestres: state.trimestres,
      classes: state.classes,
      turmas: state.turmas,
      turnos: state.turnos,
      disciplinas: state.disciplinas,
      disciplinasProfessor: state.disciplinasProfessor,
      notas: state.notas,
      mensagens: state.mensagens,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `Backup_CEN_${new Date().toISOString().split('T')[0]}.json`);
    showToast('Backup JSON gerado!');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const keys = ['users', 'alunos', 'anosLetivos', 'trimestres', 'classes', 'turmas', 'turnos', 'disciplinas', 'disciplinasProfessor', 'notas', 'mensagens'];
        keys.forEach(key => {
          if (data[key]) saveData(key, data[key]);
        });
        showToast('Dados importados com sucesso!');
      } catch (err) {
        showToast('Erro ao importar ficheiro!', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      showToast('Sem conexão à internet!', 'error');
      return;
    }
    const keys = ['users', 'alunos', 'anosLetivos', 'trimestres', 'classes', 'turmas', 'turnos', 'disciplinas', 'disciplinasProfessor', 'notas', 'mensagens'];
    for (const key of keys) {
      const data = loadFromLocal(key);
      if (data && data.length > 0) {
        await syncToFirebase(key, data);
      }
    }
    showToast('Dados sincronizados com o Firebase!');
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COMPLEXO ESCOLAR NKALAMBATA', 105, 20, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text('RELATÓRIO GERAL DO SISTEMA', 105, 30, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    let y = 50;
    pdf.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-AO')}`, 14, y); y += 10;
    pdf.text(`Total de Utilizadores: ${state.users.length}`, 14, y); y += 7;
    pdf.text(`Total de Alunos: ${state.alunos.filter(a => a.ativo).length}`, 14, y); y += 7;
    pdf.text(`Total de Professores: ${state.users.filter(u => u.perfil === 'professor').length}`, 14, y); y += 7;
    pdf.text(`Total de Classes: ${state.classes.length}`, 14, y); y += 7;
    pdf.text(`Total de Turmas: ${state.turmas.length}`, 14, y); y += 7;
    pdf.text(`Total de Disciplinas: ${state.disciplinas.length}`, 14, y); y += 7;

    if (state.alunos.length > 0) {
      y += 10;
      autoTable(pdf, {
        startY: y,
        head: [['Nº Mat.', 'Nome', 'Classe', 'Turma', 'Género']],
        body: state.alunos.filter(a => a.ativo).slice(0, 50).map(a => [
          a.numeroMatricula,
          a.nomeCompleto,
          state.classes.find(c => c.id === a.classeId)?.nome || '',
          state.turmas.find(t => t.id === a.turmaId)?.nome || '',
          a.genero,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 153] },
      });
    }

    pdf.save(`Relatorio_CEN_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Relatório PDF gerado!');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">💾 Backup e Sincronização</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="font-bold text-gray-800 mb-2">Exportar Excel (XLS)</h3>
          <p className="text-sm text-gray-500 mb-4">Exportar todos os dados em formato Excel</p>
          <button onClick={handleExportXLS} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            {Icons.download} Exportar XLS
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-bold text-gray-800 mb-2">Exportar JSON</h3>
          <p className="text-sm text-gray-500 mb-4">Backup completo em formato JSON</p>
          <button onClick={handleExportJSON} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {Icons.download} Exportar JSON
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="font-bold text-gray-800 mb-2">Relatório PDF</h3>
          <p className="text-sm text-gray-500 mb-4">Relatório geral do sistema em PDF</p>
          <button onClick={handleExportPDF} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            {Icons.download} Gerar Relatório
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-4xl mb-3">📥</div>
          <h3 className="font-bold text-gray-800 mb-2">Importar Dados</h3>
          <p className="text-sm text-gray-500 mb-4">Restaurar backup JSON</p>
          <label className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer inline-block">
            📁 Importar JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
          <div className="text-4xl mb-3">☁️</div>
          <h3 className="font-bold text-gray-800 mb-2">Sincronizar Firebase</h3>
          <p className="text-sm text-gray-500 mb-4">Enviar dados para a nuvem</p>
          <button onClick={handleSyncNow} className={`w-full px-4 py-2 rounded-lg text-white ${state.isOnline ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-400 cursor-not-allowed'}`} disabled={!state.isOnline}>
            🔄 Sincronizar Agora
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-4xl mb-3 text-center">📊</div>
          <h3 className="font-bold text-gray-800 mb-4 text-center">Estado do Sistema</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Utilizadores:</span><span className="font-bold">{state.users.length}</span></div>
            <div className="flex justify-between"><span>Alunos:</span><span className="font-bold">{state.alunos.length}</span></div>
            <div className="flex justify-between"><span>Classes:</span><span className="font-bold">{state.classes.length}</span></div>
            <div className="flex justify-between"><span>Turmas:</span><span className="font-bold">{state.turmas.length}</span></div>
            <div className="flex justify-between"><span>Disciplinas:</span><span className="font-bold">{state.disciplinas.length}</span></div>
            <div className="flex justify-between"><span>Notas:</span><span className="font-bold">{state.notas.length}</span></div>
            <div className="flex justify-between"><span>Mensagens:</span><span className="font-bold">{state.mensagens.length}</span></div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t">
              <span>Conexão:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${state.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {state.isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== PERFIL PAGE ====================
function PerfilPage({ showToast }: { showToast: any }) {
  const { state, dispatch, saveData } = useContext(AppContext);
  const user = state.currentUser!;
  const [form, setForm] = useState<any>({ ...user });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new1: '', new2: '' });

  const updateForm = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  const handleSave = () => {
    const updated = state.users.map(u => u.id === user.id ? {
      ...u,
      nome: form.nome,
      sobrenome: form.sobrenome,
      nomeCompleto: `${form.nome} ${form.sobrenome}`,
      telefone: form.telefone,
      telefone2: form.telefone2,
      bairro: form.bairro,
      rua: form.rua,
      foto: form.foto,
      atualizadoEm: new Date().toISOString(),
    } : u);
    saveData('users', updated);
    const updatedUser = updated.find(u => u.id === user.id)!;
    dispatch({ type: 'SET_USER', user: updatedUser });
    saveToLocal('currentUser', updatedUser);
    showToast('Perfil actualizado!');
  };

  const handleChangePassword = () => {
    if (passwords.current !== user.senha) {
      showToast('Senha actual incorrecta!', 'error');
      return;
    }
    if (passwords.new1 !== passwords.new2) {
      showToast('As senhas não coincidem!', 'error');
      return;
    }
    if (passwords.new1.length < 4) {
      showToast('A senha deve ter pelo menos 4 caracteres!', 'error');
      return;
    }
    const updated = state.users.map(u => u.id === user.id ? { ...u, senha: passwords.new1 } : u);
    saveData('users', updated);
    const updatedUser = updated.find(u => u.id === user.id)!;
    dispatch({ type: 'SET_USER', user: updatedUser });
    saveToLocal('currentUser', updatedUser);
    setChangingPassword(false);
    setPasswords({ current: '', new1: '', new2: '' });
    showToast('Senha alterada com sucesso!');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">👤 Meu Perfil</h1>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center text-white">
          <ImageUpload value={form.foto} onChange={(v: string) => updateForm('foto', v)} label="" />
          <h2 className="text-xl font-bold mt-2">{user.nomeCompleto}</h2>
          <p className="text-blue-200">{perfilLabels[user.perfil]}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Nome" value={form.nome} onChange={(v: string) => updateForm('nome', v)} />
            <FormInput label="Sobrenome" value={form.sobrenome} onChange={(v: string) => updateForm('sobrenome', v)} />
            <FormInput label="Email" value={user.email} onChange={() => {}} disabled />
            <FormInput label="Nº do BI" value={user.bi} onChange={() => {}} disabled />
            <FormInput label="Telefone" value={form.telefone} onChange={(v: string) => updateForm('telefone', v)} />
            <FormInput label="Telefone 2" value={form.telefone2} onChange={(v: string) => updateForm('telefone2', v)} />
            <FormInput label="Bairro" value={form.bairro} onChange={(v: string) => updateForm('bairro', v)} />
            <FormInput label="Rua" value={form.rua} onChange={(v: string) => updateForm('rua', v)} />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button onClick={() => setChangingPassword(!changingPassword)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              🔑 Alterar Senha
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              💾 Salvar Alterações
            </button>
          </div>

          {changingPassword && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-gray-700">Alterar Senha</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput label="Senha Actual" type="password" value={passwords.current}
                  onChange={(v: string) => setPasswords(p => ({ ...p, current: v }))} />
                <FormInput label="Nova Senha" type="password" value={passwords.new1}
                  onChange={(v: string) => setPasswords(p => ({ ...p, new1: v }))} />
                <FormInput label="Confirmar Nova Senha" type="password" value={passwords.new2}
                  onChange={(v: string) => setPasswords(p => ({ ...p, new2: v }))} />
              </div>
              <button onClick={handleChangePassword} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                Confirmar Alteração
              </button>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-700 mb-3">📋 Dados Completos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="font-semibold text-gray-500">Data Nasc.:</span> {user.dataNascimento}</div>
              <div><span className="font-semibold text-gray-500">Género:</span> {user.genero}</div>
              <div><span className="font-semibold text-gray-500">Estado Civil:</span> {user.estadoCivil}</div>
              <div><span className="font-semibold text-gray-500">Naturalidade:</span> {user.naturalidade}</div>
              <div><span className="font-semibold text-gray-500">Província:</span> {user.provincia}</div>
              <div><span className="font-semibold text-gray-500">Município:</span> {user.municipio}</div>
              <div><span className="font-semibold text-gray-500">Habilitações:</span> {user.habilitacoes}</div>
              <div><span className="font-semibold text-gray-500">Especialidade:</span> {user.especialidade || '-'}</div>
              <div><span className="font-semibold text-gray-500">Nº Agente:</span> {user.numeroAgente || '-'}</div>
              <div><span className="font-semibold text-gray-500">Categoria:</span> {user.categoria || '-'}</div>
              <div><span className="font-semibold text-gray-500">Experiência:</span> {user.anoExperiencia || '-'} anos</div>
              <div><span className="font-semibold text-gray-500">Data Admissão:</span> {user.dataAdmissao || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
