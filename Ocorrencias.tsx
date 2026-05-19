import { useState } from 'react';
import type { Ocorrencia, Aluno, User, Classe } from '../types';
import { Modal, Select, Button, Badge, TextArea, SearchBar, ConfirmDialog } from '../components/ui';
import { generateId, getUserName, getClassName } from '../store';

interface Props {
  ocorrencias: Ocorrencia[];
  alunos: Aluno[];
  users: User[];
  classes: Classe[];
  currentUser: User;
  onUpdate: (o: Ocorrencia[]) => void;
}

export default function OcorrenciasPage({ ocorrencias, alunos, users, classes, currentUser, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ alunoId: '', tipo: 'Disciplinar' as Ocorrencia['tipo'], descricao: '', gravidade: 'Leve' as Ocorrencia['gravidade'] });

  const canCreate = ['director_geral', 'subdiretor_pedagogico', 'professor', 'secretaria'].includes(currentUser.perfil);

  const filtered = ocorrencias.filter(o => {
    const aluno = alunos.find(a => a.id === o.alunoId);
    return aluno?.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || o.descricao.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const handleCreate = () => {
    if (!form.alunoId || !form.descricao) return;
    onUpdate([...ocorrencias, {
      id: generateId(),
      ...form,
      data: new Date().toISOString(),
      registradoPor: currentUser.id,
    }]);
    setShowModal(false);
    setForm({ alunoId: '', tipo: 'Disciplinar', descricao: '', gravidade: 'Leve' });
  };

  const tipoColors: Record<string, 'red' | 'green' | 'blue'> = { Disciplinar: 'red', Mérito: 'green', Observação: 'blue' };
  const gravidadeColors: Record<string, 'yellow' | 'orange' | 'red'> = { Leve: 'yellow', Moderada: 'orange', Grave: 'red' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Ocorrências</h2>
          <p className="text-sm text-gray-500 mt-1">Registo de ocorrências disciplinares e de mérito</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nova Ocorrência
          </Button>
        )}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar por aluno ou descrição..." />

      <div className="space-y-3">
        {filtered.map(o => {
          const aluno = alunos.find(a => a.id === o.alunoId);
          return (
            <div key={o.id} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 border border-gray-100 ${o.tipo === 'Disciplinar' ? 'border-l-red-500' : o.tipo === 'Mérito' ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={tipoColors[o.tipo]}>{o.tipo}</Badge>
                    {o.gravidade && <Badge color={gravidadeColors[o.gravidade]}>{o.gravidade}</Badge>}
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">{aluno?.nomeCompleto || 'Aluno desconhecido'}</h3>
                  {aluno && <p className="text-xs text-gray-400">{getClassName(classes, aluno.classeId)} • Mat: {aluno.numeroMatricula}</p>}
                  <p className="text-sm text-gray-600 mt-2">{o.descricao}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{new Date(o.data).toLocaleDateString('pt-AO')}</p>
                  <p className="text-xs text-gray-500">Por: {getUserName(users, o.registradoPor)}</p>
                  {canCreate && (
                    <button onClick={() => setDeleteConfirm(o.id)} className="mt-2 text-xs text-red-500 hover:underline">Eliminar</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400">Nenhuma ocorrência registada</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Ocorrência" size="md">
        <div className="space-y-4">
          <Select label="Aluno *" value={form.alunoId} onChange={e => setForm({ ...form, alunoId: e.target.value })} options={alunos.filter(a => a.situacao === 'Ativo').map(a => ({ value: a.id, label: `${a.nomeCompleto} (${getClassName(classes, a.classeId)})` }))} />
          <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as Ocorrencia['tipo'] })} options={[{ value: 'Disciplinar', label: 'Disciplinar' }, { value: 'Mérito', label: 'Mérito' }, { value: 'Observação', label: 'Observação' }]} />
          <Select label="Gravidade" value={form.gravidade || ''} onChange={e => setForm({ ...form, gravidade: e.target.value as Ocorrencia['gravidade'] })} options={[{ value: 'Leve', label: 'Leve' }, { value: 'Moderada', label: 'Moderada' }, { value: 'Grave', label: 'Grave' }]} />
          <TextArea label="Descrição *" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva a ocorrência..." />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Registar</Button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} title="Eliminar Ocorrência" message="Deseja eliminar esta ocorrência?" onConfirm={() => { deleteConfirm && onUpdate(ocorrencias.filter(o => o.id !== deleteConfirm)); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
