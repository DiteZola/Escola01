import { useState } from 'react';
import type { Nota, Aluno, Disciplina, Turma, Classe, AnoLetivo, User, DisciplinaProfessor } from '../types';
import { Select, Badge } from '../components/ui';
import { generateId, getClassName, getDisciplinaName, getActiveAnoLetivo, getActiveTrimestre, calcularMediaTrimestral } from '../store';

interface Props {
  notas: Nota[];
  alunos: Aluno[];
  disciplinas: Disciplina[];
  turmas: Turma[];
  classes: Classe[];
  anosLetivos: AnoLetivo[];
  atribuicoes: DisciplinaProfessor[];
  currentUser: User;
  onUpdate: (n: Nota[]) => void;
}

export default function NotasPage({ notas, alunos, disciplinas, turmas, classes, anosLetivos, atribuicoes, currentUser, onUpdate }: Props) {
  const anoAtivo = getActiveAnoLetivo(anosLetivos);
  const trimestreAtivo = getActiveTrimestre(anoAtivo);
  
  const isProfessor = currentUser.perfil === 'professor';
  const isEncarregado = currentUser.perfil === 'encarregado';

  // Professor: show only assigned turmas/disciplinas
  const profAtribuicoes = isProfessor ? atribuicoes.filter(a => a.professorId === currentUser.id) : [];
  const availableTurmas = isProfessor
    ? turmas.filter(t => profAtribuicoes.some(a => a.turmaId === t.id))
    : turmas;

  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState('');

  const selectedTurma = turmas.find(t => t.id === selectedTurmaId);
  const availableDisciplinas = selectedTurma
    ? (isProfessor
      ? disciplinas.filter(d => profAtribuicoes.some(a => a.turmaId === selectedTurmaId && a.disciplinaId === d.id))
      : disciplinas.filter(d => d.classeId === selectedTurma.classeId))
    : [];

  // For encarregado: show their children's notes
  const encarregadoAlunos = isEncarregado ? alunos.filter(a => a.encarregadoId === currentUser.id) : [];

  const turmaAlunos = selectedTurmaId ? alunos.filter(a => a.turmaId === selectedTurmaId && a.situacao === 'Ativo') : [];

  const getOrCreateNota = (alunoId: string): Nota => {
    const existing = notas.find(n =>
      n.alunoId === alunoId &&
      n.disciplinaId === selectedDisciplinaId &&
      n.turmaId === selectedTurmaId &&
      n.trimestreId === trimestreAtivo?.id
    );
    if (existing) return existing;
    return {
      id: generateId(),
      alunoId,
      disciplinaId: selectedDisciplinaId,
      turmaId: selectedTurmaId,
      trimestreId: trimestreAtivo?.id || '',
      anoLetivoId: anoAtivo?.id || '',
      mac: null, npp: null, npt: null, mt: null,
    };
  };

  const updateNota = (alunoId: string, field: 'mac' | 'npp' | 'npt', value: string) => {
    const numValue = value === '' ? null : Math.min(20, Math.max(0, parseFloat(value)));
    const nota = getOrCreateNota(alunoId);
    const updated = { ...nota, [field]: numValue };
    updated.mt = calcularMediaTrimestral(updated.mac, updated.npp, updated.npt);
    
    const existingIndex = notas.findIndex(n => n.id === nota.id);
    if (existingIndex >= 0) {
      const newNotas = [...notas];
      newNotas[existingIndex] = updated;
      onUpdate(newNotas);
    } else {
      onUpdate([...notas, updated]);
    }
  };

  const getNotaColor = (mt: number | null): string => {
    if (mt === null) return '';
    if (mt >= 14) return 'text-emerald-600 font-bold';
    if (mt >= 10) return 'text-blue-600 font-bold';
    return 'text-red-600 font-bold';
  };

  // Encarregado view
  if (isEncarregado) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Notas dos Meus Educandos</h2>
          <p className="text-sm text-gray-500 mt-1">Consulte as notas dos seus educandos</p>
        </div>
        {encarregadoAlunos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400">Nenhum educando associado à sua conta</p>
          </div>
        ) : (
          encarregadoAlunos.map(aluno => {
            const alunoNotas = notas.filter(n => n.alunoId === aluno.id);
            return (
              <div key={aluno.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">{aluno.nomeCompleto}</h3>
                  <p className="text-sm text-gray-500">{getClassName(classes, aluno.classeId)} • Matrícula: {aluno.numeroMatricula}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Disciplina</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">MAC</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">NPP</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">NPT</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">MT</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {alunoNotas.map(n => (
                        <tr key={n.id}>
                          <td className="px-4 py-2 text-sm">{getDisciplinaName(disciplinas, n.disciplinaId)}</td>
                          <td className="px-4 py-2 text-sm text-center">{n.mac ?? '-'}</td>
                          <td className="px-4 py-2 text-sm text-center">{n.npp ?? '-'}</td>
                          <td className="px-4 py-2 text-sm text-center">{n.npt ?? '-'}</td>
                          <td className={`px-4 py-2 text-sm text-center ${getNotaColor(n.mt)}`}>{n.mt ?? '-'}</td>
                          <td className="px-4 py-2 text-center">
                            {n.mt !== null && (
                              <Badge color={n.mt >= 10 ? 'green' : 'red'}>{n.mt >= 10 ? 'Aprovado' : 'Reprovado'}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {alunoNotas.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma nota registada</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Gestão de Notas</h2>
        <p className="text-sm text-gray-500 mt-1">
          {trimestreAtivo ? `${trimestreAtivo.nome} - ${anoAtivo?.nome}` : 'Nenhum trimestre activo'}
        </p>
      </div>

      {!trimestreAtivo ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-amber-800 font-medium">⚠️ Nenhum trimestre activo. Abra um trimestre para lançar notas.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Select
              label="Turma"
              value={selectedTurmaId}
              onChange={e => { setSelectedTurmaId(e.target.value); setSelectedDisciplinaId(''); }}
              options={availableTurmas.map(t => ({ value: t.id, label: `${t.nome} (${getClassName(classes, t.classeId)})` }))}
            />
            <Select
              label="Disciplina"
              value={selectedDisciplinaId}
              onChange={e => setSelectedDisciplinaId(e.target.value)}
              options={availableDisciplinas.map(d => ({ value: d.id, label: d.nome }))}
            />
          </div>

          {selectedTurmaId && selectedDisciplinaId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">{getDisciplinaName(disciplinas, selectedDisciplinaId)}</h3>
                  <p className="text-xs text-gray-500">{turmaAlunos.length} alunos • {trimestreAtivo.nome}</p>
                </div>
                <Badge color="blue">MAC + NPP + NPT×2 ÷ 4</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nº</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Aluno</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">MAC (0-20)</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">NPP (0-20)</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">NPT (0-20)</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">MT</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {turmaAlunos.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)).map((aluno, idx) => {
                      const nota = getOrCreateNota(aluno.id);
                      return (
                        <tr key={aluno.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-800">{aluno.nomeCompleto}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number" min="0" max="20" step="0.1"
                              value={nota.mac ?? ''}
                              onChange={e => updateNota(aluno.id, 'mac', e.target.value)}
                              className="w-16 mx-auto block text-center px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              disabled={!isProfessor && !['director_geral', 'subdiretor_pedagogico'].includes(currentUser.perfil)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number" min="0" max="20" step="0.1"
                              value={nota.npp ?? ''}
                              onChange={e => updateNota(aluno.id, 'npp', e.target.value)}
                              className="w-16 mx-auto block text-center px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              disabled={!isProfessor && !['director_geral', 'subdiretor_pedagogico'].includes(currentUser.perfil)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number" min="0" max="20" step="0.1"
                              value={nota.npt ?? ''}
                              onChange={e => updateNota(aluno.id, 'npt', e.target.value)}
                              className="w-16 mx-auto block text-center px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              disabled={!isProfessor && !['director_geral', 'subdiretor_pedagogico'].includes(currentUser.perfil)}
                            />
                          </td>
                          <td className={`px-4 py-2 text-center text-lg ${getNotaColor(nota.mt)}`}>
                            {nota.mt ?? '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {nota.mt !== null && (
                              <Badge color={nota.mt >= 10 ? 'green' : 'red'}>{nota.mt >= 10 ? 'Aprovado' : 'Reprovado'}</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {turmaAlunos.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhum aluno nesta turma</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
