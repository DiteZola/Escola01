import { useState } from 'react';
import type { DisciplinaProfessor, User, Disciplina, Turma, Classe, AnoLetivo } from '../types';
import { Modal, Select, Button, Badge, ConfirmDialog } from '../components/ui';
import { generateId, getClassName, getTurmaName, getDisciplinaName, getUserName, getActiveAnoLetivo } from '../store';

interface Props {
  atribuicoes: DisciplinaProfessor[];
  users: User[];
  disciplinas: Disciplina[];
  turmas: Turma[];
  classes: Classe[];
  anosLetivos: AnoLetivo[];
  onUpdate: (a: DisciplinaProfessor[]) => void;
}

export default function Atribuicoes({ atribuicoes, users, disciplinas, turmas, classes, anosLetivos, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ professorId: '', disciplinaId: '', turmaId: '', anoLetivoId: '' });

  const anoAtivo = getActiveAnoLetivo(anosLetivos);
  const professores = users.filter(u => u.perfil === 'professor' && u.ativo);
  const selectedTurma = turmas.find(t => t.id === form.turmaId);
  const filteredDisciplinas = selectedTurma ? disciplinas.filter(d => d.classeId === selectedTurma.classeId) : disciplinas;

  const openCreate = () => {
    setForm({ professorId: '', disciplinaId: '', turmaId: '', anoLetivoId: anoAtivo?.id || '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.professorId || !form.disciplinaId || !form.turmaId) return;
    const exists = atribuicoes.some(a => a.professorId === form.professorId && a.disciplinaId === form.disciplinaId && a.turmaId === form.turmaId);
    if (exists) { alert('Esta atribuição já existe!'); return; }
    onUpdate([...atribuicoes, { id: generateId(), ...form }]);
    setShowModal(false);
  };

  // Group by professor
  const byProfessor = professores.map(prof => ({
    professor: prof,
    items: atribuicoes.filter(a => a.professorId === prof.id),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Atribuições</h2>
          <p className="text-sm text-gray-500 mt-1">Atribua disciplinas e turmas aos professores</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nova Atribuição
        </Button>
      </div>

      {byProfessor.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Nenhuma atribuição registada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byProfessor.map(({ professor, items }) => (
            <div key={professor.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {professor.nome[0]}{professor.sobrenome[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{professor.nomeCompleto}</h3>
                  <p className="text-xs text-gray-500">{professor.especialidade || 'Professor'}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(item => {
                    const turma = turmas.find(t => t.id === item.turmaId);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{getDisciplinaName(disciplinas, item.disciplinaId)}</p>
                          <p className="text-xs text-gray-500">{getTurmaName(turmas, item.turmaId)} • {turma ? getClassName(classes, turma.classeId) : ''}</p>
                        </div>
                        <button onClick={() => setDeleteConfirm(item.id)} className="p-1 rounded hover:bg-red-50 text-red-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Atribuições Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Todas as Atribuições ({atribuicoes.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Professor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Disciplina</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Classe</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Acção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {atribuicoes.map(a => {
                const turma = turmas.find(t => t.id === a.turmaId);
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{getUserName(users, a.professorId)}</td>
                    <td className="px-4 py-3 text-sm"><Badge color="blue">{getDisciplinaName(disciplinas, a.disciplinaId)}</Badge></td>
                    <td className="px-4 py-3 text-sm">{getTurmaName(turmas, a.turmaId)}</td>
                    <td className="px-4 py-3 text-sm">{turma ? getClassName(classes, turma.classeId) : ''}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Atribuição" size="md">
        <div className="space-y-4">
          <Select label="Professor *" value={form.professorId} onChange={e => setForm({ ...form, professorId: e.target.value })} options={professores.map(p => ({ value: p.id, label: p.nomeCompleto }))} />
          <Select label="Turma *" value={form.turmaId} onChange={e => setForm({ ...form, turmaId: e.target.value })} options={turmas.map(t => ({ value: t.id, label: `${t.nome} (${getClassName(classes, t.classeId)})` }))} />
          <Select label="Disciplina *" value={form.disciplinaId} onChange={e => setForm({ ...form, disciplinaId: e.target.value })} options={filteredDisciplinas.map(d => ({ value: d.id, label: d.nome }))} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>Atribuir</Button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} title="Remover Atribuição" message="Deseja remover esta atribuição?" onConfirm={() => { deleteConfirm && onUpdate(atribuicoes.filter(a => a.id !== deleteConfirm)); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
