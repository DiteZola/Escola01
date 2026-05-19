import { useState } from 'react';
import type { Comunicado, User, UserRole } from '../types';
import { ROLE_LABELS } from '../types';
import { Modal, Input, Select, Button, Badge, TextArea, ConfirmDialog } from '../components/ui';
import { generateId } from '../store';

interface Props {
  comunicados: Comunicado[];
  currentUser: User;
  onUpdate: (c: Comunicado[]) => void;
}

export default function ComunicadosPage({ comunicados, currentUser, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<Comunicado | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: '', mensagem: '', prioridade: 'Normal' as Comunicado['prioridade'], destinatarios: 'todos' as string });

  const canCreate = ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'].includes(currentUser.perfil);

  // Filter comunicados visible to current user
  const visible = comunicados.filter(c => {
    if (c.destinatarios === 'todos') return true;
    return (c.destinatarios as UserRole[]).includes(currentUser.perfil);
  }).sort((a, b) => new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime());

  const handleCreate = () => {
    if (!form.titulo || !form.mensagem) return;
    const novo: Comunicado = {
      id: generateId(),
      titulo: form.titulo,
      mensagem: form.mensagem,
      autorId: currentUser.id,
      autorNome: currentUser.nomeCompleto,
      destinatarios: form.destinatarios === 'todos' ? 'todos' : [form.destinatarios as UserRole],
      dataPublicacao: new Date().toISOString(),
      prioridade: form.prioridade,
    };
    onUpdate([...comunicados, novo]);
    setShowModal(false);
    setForm({ titulo: '', mensagem: '', prioridade: 'Normal', destinatarios: 'todos' });
  };

  const prioridadeColors: Record<string, 'blue' | 'yellow' | 'red'> = { Normal: 'blue', Importante: 'yellow', Urgente: 'red' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Comunicados</h2>
          <p className="text-sm text-gray-500 mt-1">Avisos e comunicações da escola</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Novo Comunicado
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {visible.map(c => (
          <div key={c.id} className={`bg-white rounded-2xl p-6 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition ${c.prioridade === 'Urgente' ? 'border-l-red-500' : c.prioridade === 'Importante' ? 'border-l-amber-500' : 'border-l-blue-500'} border border-gray-100`} onClick={() => setViewing(c)}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={prioridadeColors[c.prioridade]}>{c.prioridade}</Badge>
                  {c.destinatarios !== 'todos' && <Badge color="gray">Restrito</Badge>}
                </div>
                <h3 className="text-lg font-bold text-gray-800">{c.titulo}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.mensagem}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">{new Date(c.dataPublicacao).toLocaleDateString('pt-AO')}</p>
                <p className="text-xs text-gray-500 mt-1">Por: {c.autorNome}</p>
              </div>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400">Nenhum comunicado disponível</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Comunicado" size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge color={prioridadeColors[viewing.prioridade]}>{viewing.prioridade}</Badge>
            </div>
            <h3 className="text-xl font-bold text-gray-800">{viewing.titulo}</h3>
            <div className="text-sm text-gray-600 whitespace-pre-wrap">{viewing.mensagem}</div>
            <div className="pt-4 border-t text-xs text-gray-400">
              <p>Publicado por: {viewing.autorNome}</p>
              <p>Data: {new Date(viewing.dataPublicacao).toLocaleString('pt-AO')}</p>
            </div>
            {canCreate && viewing.autorId === currentUser.id && (
              <div className="flex justify-end">
                <Button variant="danger" size="sm" onClick={() => { setDeleteConfirm(viewing.id); setViewing(null); }}>Eliminar</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Comunicado" size="lg">
        <div className="space-y-4">
          <Input label="Título *" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Assunto do comunicado" />
          <TextArea label="Mensagem *" value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} placeholder="Escreva a mensagem..." />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Prioridade" value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value as Comunicado['prioridade'] })} options={[{ value: 'Normal', label: 'Normal' }, { value: 'Importante', label: 'Importante' }, { value: 'Urgente', label: 'Urgente' }]} />
            <Select label="Destinatários" value={form.destinatarios} onChange={e => setForm({ ...form, destinatarios: e.target.value })} options={[{ value: 'todos', label: 'Todos' }, ...Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }))]} />
          </div>
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Publicar</Button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} title="Eliminar Comunicado" message="Deseja eliminar este comunicado?" onConfirm={() => { deleteConfirm && onUpdate(comunicados.filter(c => c.id !== deleteConfirm)); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
