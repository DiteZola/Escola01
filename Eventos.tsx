import { useState } from 'react';
import type { Evento, User } from '../types';
import { Modal, Input, Select, Button, Badge, TextArea, ConfirmDialog } from '../components/ui';
import { generateId } from '../store';

interface Props {
  eventos: Evento[];
  currentUser: User;
  onUpdate: (e: Evento[]) => void;
}

export default function EventosPage({ eventos, currentUser, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: '', descricao: '', dataInicio: '', dataFim: '', tipo: 'Atividade' as Evento['tipo'] });

  const canCreate = ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'].includes(currentUser.perfil);

  const sorted = [...eventos].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
  const upcoming = sorted.filter(e => new Date(e.dataInicio) >= new Date());
  const past = sorted.filter(e => new Date(e.dataInicio) < new Date()).reverse();

  const tipoColors: Record<string, 'blue' | 'red' | 'green' | 'purple' | 'gray'> = { Reunião: 'blue', Feriado: 'red', Exame: 'purple', Atividade: 'green', Outro: 'gray' };

  const handleCreate = () => {
    if (!form.titulo || !form.dataInicio) return;
    onUpdate([...eventos, { id: generateId(), ...form, criadoPor: currentUser.id }]);
    setShowModal(false);
    setForm({ titulo: '', descricao: '', dataInicio: '', dataFim: '', tipo: 'Atividade' });
  };

  const EventCard = ({ evento }: { evento: Evento }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <Badge color={tipoColors[evento.tipo]}>{evento.tipo}</Badge>
        {canCreate && (
          <button onClick={() => setDeleteConfirm(evento.id)} className="p-1 rounded hover:bg-red-50 text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{evento.titulo}</h3>
      {evento.descricao && <p className="text-sm text-gray-500 mb-3">{evento.descricao}</p>}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span>{new Date(evento.dataInicio).toLocaleDateString('pt-AO')}</span>
        {evento.dataFim && <span>— {new Date(evento.dataFim).toLocaleDateString('pt-AO')}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Eventos</h2>
          <p className="text-sm text-gray-500 mt-1">Calendário de eventos da escola</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Novo Evento
          </Button>
        )}
      </div>

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">📅 Próximos Eventos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(e => <EventCard key={e.id} evento={e} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">📋 Eventos Passados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map(e => <EventCard key={e.id} evento={e} />)}
          </div>
        </div>
      )}

      {eventos.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Nenhum evento registado</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Evento" size="md">
        <div className="space-y-4">
          <Input label="Título *" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Nome do evento" />
          <TextArea label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data Início *" type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
            <Input label="Data Fim" type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} />
          </div>
          <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as Evento['tipo'] })} options={[{ value: 'Reunião', label: 'Reunião' }, { value: 'Feriado', label: 'Feriado' }, { value: 'Exame', label: 'Exame' }, { value: 'Atividade', label: 'Atividade' }, { value: 'Outro', label: 'Outro' }]} />
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar Evento</Button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} title="Eliminar Evento" message="Deseja eliminar este evento?" onConfirm={() => { deleteConfirm && onUpdate(eventos.filter(e => e.id !== deleteConfirm)); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
