import { useState } from 'react';
import type { Presenca, Aluno, Disciplina, Turma, Classe, User, DisciplinaProfessor } from '../types';
import { Select, Button, Input } from '../components/ui';
import { generateId, getClassName, getDisciplinaName } from '../store';

interface Props {
  presencas: Presenca[];
  alunos: Aluno[];
  disciplinas: Disciplina[];
  turmas: Turma[];
  classes: Classe[];
  atribuicoes: DisciplinaProfessor[];
  currentUser: User;
  onUpdate: (p: Presenca[]) => void;
}

export default function PresencasPage({ presencas, alunos, disciplinas, turmas, classes, atribuicoes, currentUser, onUpdate }: Props) {
  const isProfessor = currentUser.perfil === 'professor';
  const profAtribuicoes = isProfessor ? atribuicoes.filter(a => a.professorId === currentUser.id) : [];
  const availableTurmas = isProfessor ? turmas.filter(t => profAtribuicoes.some(a => a.turmaId === t.id)) : turmas;

  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedTurma = turmas.find(t => t.id === selectedTurmaId);
  const availableDisciplinas = selectedTurma
    ? (isProfessor
      ? disciplinas.filter(d => profAtribuicoes.some(a => a.turmaId === selectedTurmaId && a.disciplinaId === d.id))
      : disciplinas.filter(d => d.classeId === selectedTurma.classeId))
    : [];

  const turmaAlunos = selectedTurmaId ? alunos.filter(a => a.turmaId === selectedTurmaId && a.situacao === 'Ativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)) : [];

  const getPresenca = (alunoId: string): boolean | null => {
    const p = presencas.find(p => p.alunoId === alunoId && p.turmaId === selectedTurmaId && p.disciplinaId === selectedDisciplinaId && p.data === selectedDate);
    return p ? p.presente : null;
  };

  const togglePresenca = (alunoId: string, presente: boolean) => {
    const existing = presencas.find(p => p.alunoId === alunoId && p.turmaId === selectedTurmaId && p.disciplinaId === selectedDisciplinaId && p.data === selectedDate);
    if (existing) {
      onUpdate(presencas.map(p => p.id === existing.id ? { ...p, presente } : p));
    } else {
      onUpdate([...presencas, { id: generateId(), alunoId, turmaId: selectedTurmaId, disciplinaId: selectedDisciplinaId, data: selectedDate, presente }]);
    }
  };

  const markAllPresent = () => {
    const newPresencas = [...presencas];
    turmaAlunos.forEach(aluno => {
      const existing = newPresencas.findIndex(p => p.alunoId === aluno.id && p.turmaId === selectedTurmaId && p.disciplinaId === selectedDisciplinaId && p.data === selectedDate);
      if (existing >= 0) {
        newPresencas[existing] = { ...newPresencas[existing], presente: true };
      } else {
        newPresencas.push({ id: generateId(), alunoId: aluno.id, turmaId: selectedTurmaId, disciplinaId: selectedDisciplinaId, data: selectedDate, presente: true });
      }
    });
    onUpdate(newPresencas);
  };

  const totalPresentes = turmaAlunos.filter(a => getPresenca(a.id) === true).length;
  const totalFaltas = turmaAlunos.filter(a => getPresenca(a.id) === false).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Controlo de Presenças</h2>
        <p className="text-sm text-gray-500 mt-1">Registe a presença dos alunos</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Select label="Turma" value={selectedTurmaId} onChange={e => { setSelectedTurmaId(e.target.value); setSelectedDisciplinaId(''); }} options={availableTurmas.map(t => ({ value: t.id, label: `${t.nome} (${getClassName(classes, t.classeId)})` }))} />
        <Select label="Disciplina" value={selectedDisciplinaId} onChange={e => setSelectedDisciplinaId(e.target.value)} options={availableDisciplinas.map(d => ({ value: d.id, label: d.nome }))} />
        <Input label="Data" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        {selectedTurmaId && selectedDisciplinaId && (
          <Button variant="success" onClick={markAllPresent}>✓ Marcar Todos</Button>
        )}
      </div>

      {selectedTurmaId && selectedDisciplinaId && (
        <>
          <div className="flex gap-4">
            <div className="bg-emerald-50 rounded-xl px-4 py-2 text-sm"><span className="font-bold text-emerald-700">{totalPresentes}</span> <span className="text-emerald-600">Presentes</span></div>
            <div className="bg-red-50 rounded-xl px-4 py-2 text-sm"><span className="font-bold text-red-700">{totalFaltas}</span> <span className="text-red-600">Faltas</span></div>
            <div className="bg-gray-50 rounded-xl px-4 py-2 text-sm"><span className="font-bold text-gray-700">{turmaAlunos.length - totalPresentes - totalFaltas}</span> <span className="text-gray-600">Pendentes</span></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{getDisciplinaName(disciplinas, selectedDisciplinaId)} • {new Date(selectedDate).toLocaleDateString('pt-AO')}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {turmaAlunos.map((aluno, idx) => {
                const estado = getPresenca(aluno.id);
                return (
                  <div key={aluno.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-6">{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-800">{aluno.nomeCompleto}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePresenca(aluno.id, true)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${estado === true ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-emerald-100'}`}
                      >
                        Presente
                      </button>
                      <button
                        onClick={() => togglePresenca(aluno.id, false)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${estado === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-100'}`}
                      >
                        Falta
                      </button>
                    </div>
                  </div>
                );
              })}
              {turmaAlunos.length === 0 && (
                <div className="py-12 text-center text-gray-400">Nenhum aluno nesta turma</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
