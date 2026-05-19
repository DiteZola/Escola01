import { useState } from 'react';
import type { Disciplina, Classe } from '../types';
import { Modal, Input, Select, Button, Badge, SearchBar, ConfirmDialog } from '../components/ui';
import { generateId, getClassName } from '../store';

interface Props {
  disciplinas: Disciplina[];
  classes: Classe[];
  onUpdate: (d: Disciplina[]) => void;
}

export default function DisciplinasPage({ disciplinas, classes, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', codigo: '', classeId: '', cargaHoraria: 2, descricao: '' });

  const filtered = disciplinas.filter(d => {
    const matchSearch = d.nome.toLowerCase().includes(search.toLowerCase()) || d.codigo.toLowerCase().includes(search.toLowerCase());
    const matchClasse = !filterClasse || d.classeId === filterClasse;
    return matchSearch && matchClasse;
  });

  const openCreate = () => {
    setForm({ nome: '', codigo: '', classeId: '', cargaHoraria: 2, descricao: '' });
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (d: Disciplina) => {
    setForm({ nome: d.nome, codigo: d.codigo, classeId: d.classeId, cargaHoraria: d.cargaHoraria, descricao: d.descricao || '' });
    setEditing(d);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.classeId) return;
    if (editing) {
      onUpdate(disciplinas.map(d => d.id === editing.id ? { ...d, ...form } : d));
    } else {
      onUpdate([...disciplinas, { id: generateId(), ...form }]);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Disciplinas</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie as disciplinas de cada classe</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nova Disciplina
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Pesquisar disciplina..." /></div>
        <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <option value="">Todas as classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(d => (
          <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{d.nome}</h3>
                <p className="text-xs text-gray-400 font-mono">{d.codigo}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button onClick={() => setDeleteConfirm(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Classe:</span><Badge color="blue">{getClassName(classes, d.classeId)}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-500">Carga Horária:</span><span className="font-medium">{d.cargaHoraria}h/semana</span></div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">Nenhuma disciplina encontrada</div>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Disciplina' : 'Nova Disciplina'} size="md">
        <div className="space-y-4">
          <Input label="Nome da Disciplina *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Matemática" />
          <Input label="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: MAT" />
          <Select label="Classe *" value={form.classeId} onChange={e => setForm({ ...form, classeId: e.target.value })} options={classes.map(c => ({ value: c.id, label: c.nome }))} />
          <Input label="Carga Horária (h/semana)" type="number" value={form.cargaHoraria} onChange={e => setForm({ ...form, cargaHoraria: parseInt(e.target.value) || 0 })} />
          <Input label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>{editing ? 'Guardar' : 'Criar'}</Button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} title="Eliminar Disciplina" message="Deseja eliminar esta disciplina?" onConfirm={() => { deleteConfirm && onUpdate(disciplinas.filter(d => d.id !== deleteConfirm)); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
