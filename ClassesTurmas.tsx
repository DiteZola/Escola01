import { useState } from 'react';
import type { Classe, Turma, Turno, User, AnoLetivo } from '../types';
import { NIVEIS_ENSINO } from '../types';
import { Modal, Input, Select, Button, Badge, Tabs, ConfirmDialog } from '../components/ui';
import { generateId, getClassName, getTurnoName, getUserName, getActiveAnoLetivo } from '../store';

interface Props {
  classes: Classe[];
  turmas: Turma[];
  turnos: Turno[];
  users: User[];
  anosLetivos: AnoLetivo[];
  onUpdateClasses: (c: Classe[]) => void;
  onUpdateTurmas: (t: Turma[]) => void;
  onUpdateTurnos: (t: Turno[]) => void;
}

export default function ClassesTurmas({ classes, turmas, turnos, users, anosLetivos, onUpdateClasses, onUpdateTurmas, onUpdateTurnos }: Props) {
  const [activeTab, setActiveTab] = useState('turmas');
  const [showClasseModal, setShowClasseModal] = useState(false);
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  const [classeForm, setClasseForm] = useState({ nome: '', nivel: '', descricao: '' });
  const [turmaForm, setTurmaForm] = useState({ nome: '', classeId: '', turnoId: '', professorDiretorTurmaId: '', sala: '', capacidade: 40, anoLetivoId: '' });
  const [turnoForm, setTurnoForm] = useState({ nome: '', horaInicio: '', horaFim: '' });

  const anoAtivo = getActiveAnoLetivo(anosLetivos);
  const professores = users.filter(u => u.perfil === 'professor' && u.ativo);

  const handleCreateClasse = () => {
    if (!classeForm.nome || !classeForm.nivel) return;
    onUpdateClasses([...classes, { id: generateId(), ...classeForm }]);
    setShowClasseModal(false);
    setClasseForm({ nome: '', nivel: '', descricao: '' });
  };

  const openTurmaCreate = () => {
    setTurmaForm({ nome: '', classeId: '', turnoId: '', professorDiretorTurmaId: '', sala: '', capacidade: 40, anoLetivoId: anoAtivo?.id || '' });
    setEditingTurma(null);
    setShowTurmaModal(true);
  };

  const openTurmaEdit = (t: Turma) => {
    setTurmaForm({ nome: t.nome, classeId: t.classeId, turnoId: t.turnoId, professorDiretorTurmaId: t.professorDiretorTurmaId || '', sala: t.sala || '', capacidade: t.capacidade, anoLetivoId: t.anoLetivoId });
    setEditingTurma(t);
    setShowTurmaModal(true);
  };

  const handleSaveTurma = () => {
    if (!turmaForm.nome || !turmaForm.classeId) return;
    if (editingTurma) {
      onUpdateTurmas(turmas.map(t => t.id === editingTurma.id ? { ...t, ...turmaForm } : t));
    } else {
      onUpdateTurmas([...turmas, { id: generateId(), ...turmaForm }]);
    }
    setShowTurmaModal(false);
  };

  const openTurnoCreate = () => {
    setTurnoForm({ nome: '', horaInicio: '', horaFim: '' });
    setEditingTurno(null);
    setShowTurnoModal(true);
  };

  const openTurnoEdit = (t: Turno) => {
    setTurnoForm({ nome: t.nome, horaInicio: t.horaInicio, horaFim: t.horaFim });
    setEditingTurno(t);
    setShowTurnoModal(true);
  };

  const handleSaveTurno = () => {
    if (!turnoForm.nome) return;
    if (editingTurno) {
      onUpdateTurnos(turnos.map(t => t.id === editingTurno.id ? { ...t, ...turnoForm } : t));
    } else {
      onUpdateTurnos([...turnos, { id: generateId(), ...turnoForm }]);
    }
    setShowTurnoModal(false);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'classe') onUpdateClasses(classes.filter(c => c.id !== deleteConfirm.id));
    if (deleteConfirm.type === 'turma') onUpdateTurmas(turmas.filter(t => t.id !== deleteConfirm.id));
    if (deleteConfirm.type === 'turno') onUpdateTurnos(turnos.filter(t => t.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Classes, Turmas e Turnos</h2>
        <p className="text-sm text-gray-500 mt-1">Gerencie a estrutura académica da escola</p>
      </div>

      <Tabs
        tabs={[
          { id: 'turmas', label: 'Turmas' },
          { id: 'classes', label: 'Classes' },
          { id: 'turnos', label: 'Turnos' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Turmas Tab */}
      {activeTab === 'turmas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openTurmaCreate}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nova Turma
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmas.map(turma => (
              <div key={turma.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{turma.nome}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => openTurmaEdit(turma)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => setDeleteConfirm({ type: 'turma', id: turma.id })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Classe:</span><span className="font-medium">{getClassName(classes, turma.classeId)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Turno:</span><span className="font-medium">{getTurnoName(turnos, turma.turnoId)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sala:</span><span className="font-medium">{turma.sala || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Capacidade:</span><span className="font-medium">{turma.capacidade}</span></div>
                  {turma.professorDiretorTurmaId && (
                    <div className="flex justify-between"><span className="text-gray-500">Dir. Turma:</span><span className="font-medium text-blue-600">{getUserName(users, turma.professorDiretorTurmaId)}</span></div>
                  )}
                </div>
              </div>
            ))}
            {turmas.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">Nenhuma turma criada</div>
            )}
          </div>
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowClasseModal(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nova Classe
            </Button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nível</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Turmas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{c.nome}</td>
                    <td className="px-4 py-3"><Badge color="blue">{c.nivel}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{turmas.filter(t => t.classeId === c.id).length}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleteConfirm({ type: 'classe', id: c.id })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Turnos Tab */}
      {activeTab === 'turnos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openTurnoCreate}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Novo Turno
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {turnos.map(turno => (
              <div key={turno.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{turno.nome}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => openTurnoEdit(turno)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => setDeleteConfirm({ type: 'turno', id: turno.id })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{turno.horaInicio}</span> — <span className="font-medium text-gray-700">{turno.horaFim}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showClasseModal} onClose={() => setShowClasseModal(false)} title="Nova Classe" size="md">
        <div className="space-y-4">
          <Input label="Nome da Classe" value={classeForm.nome} onChange={e => setClasseForm({ ...classeForm, nome: e.target.value })} placeholder="Ex: 7ª Classe" />
          <Select label="Nível de Ensino" value={classeForm.nivel} onChange={e => setClasseForm({ ...classeForm, nivel: e.target.value })} options={NIVEIS_ENSINO.map(n => ({ value: n, label: n }))} />
          <Input label="Descrição" value={classeForm.descricao} onChange={e => setClasseForm({ ...classeForm, descricao: e.target.value })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowClasseModal(false)}>Cancelar</Button><Button onClick={handleCreateClasse}>Criar Classe</Button></div>
        </div>
      </Modal>

      <Modal isOpen={showTurmaModal} onClose={() => setShowTurmaModal(false)} title={editingTurma ? 'Editar Turma' : 'Nova Turma'} size="md">
        <div className="space-y-4">
          <Input label="Nome da Turma" value={turmaForm.nome} onChange={e => setTurmaForm({ ...turmaForm, nome: e.target.value })} placeholder="Ex: A, B, C" />
          <Select label="Classe" value={turmaForm.classeId} onChange={e => setTurmaForm({ ...turmaForm, classeId: e.target.value })} options={classes.map(c => ({ value: c.id, label: c.nome }))} />
          <Select label="Turno" value={turmaForm.turnoId} onChange={e => setTurmaForm({ ...turmaForm, turnoId: e.target.value })} options={turnos.map(t => ({ value: t.id, label: t.nome }))} />
          <Input label="Sala" value={turmaForm.sala} onChange={e => setTurmaForm({ ...turmaForm, sala: e.target.value })} placeholder="Ex: Sala 1" />
          <Input label="Capacidade" type="number" value={turmaForm.capacidade} onChange={e => setTurmaForm({ ...turmaForm, capacidade: parseInt(e.target.value) || 0 })} />
          <Select label="Director de Turma" value={turmaForm.professorDiretorTurmaId} onChange={e => setTurmaForm({ ...turmaForm, professorDiretorTurmaId: e.target.value })} options={professores.map(p => ({ value: p.id, label: p.nomeCompleto }))} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowTurmaModal(false)}>Cancelar</Button><Button onClick={handleSaveTurma}>{editingTurma ? 'Guardar' : 'Criar Turma'}</Button></div>
        </div>
      </Modal>

      <Modal isOpen={showTurnoModal} onClose={() => setShowTurnoModal(false)} title={editingTurno ? 'Editar Turno' : 'Novo Turno'} size="md">
        <div className="space-y-4">
          <Input label="Nome do Turno" value={turnoForm.nome} onChange={e => setTurnoForm({ ...turnoForm, nome: e.target.value })} placeholder="Ex: Manhã" />
          <Input label="Hora de Início" type="time" value={turnoForm.horaInicio} onChange={e => setTurnoForm({ ...turnoForm, horaInicio: e.target.value })} />
          <Input label="Hora de Fim" type="time" value={turnoForm.horaFim} onChange={e => setTurnoForm({ ...turnoForm, horaFim: e.target.value })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowTurnoModal(false)}>Cancelar</Button><Button onClick={handleSaveTurno}>{editingTurno ? 'Guardar' : 'Criar Turno'}</Button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} title="Confirmar Eliminação" message="Deseja realmente eliminar este item?" onConfirm={handleDelete} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
