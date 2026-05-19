import { useState } from 'react';
import type { AnoLetivo, Trimestre } from '../types';
import { Modal, Input, Button, Badge, ConfirmDialog } from '../components/ui';
import { generateId } from '../store';

interface Props {
  anosLetivos: AnoLetivo[];
  onUpdate: (anos: AnoLetivo[]) => void;
}

export default function AnoLetivoPage({ anosLetivos, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string } | null>(null);
  const [form, setForm] = useState({ nome: '', dataInicio: '', dataFim: '' });

  const handleCreate = () => {
    if (!form.nome || !form.dataInicio || !form.dataFim) return;
    const novoAno: AnoLetivo = {
      id: generateId(),
      nome: form.nome,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      estado: 'Fechado',
      trimestres: [
        { id: generateId(), nome: '1º Trimestre', numero: 1, anoLetivoId: '', dataInicio: '', dataFim: '', estado: 'Fechado' },
        { id: generateId(), nome: '2º Trimestre', numero: 2, anoLetivoId: '', dataInicio: '', dataFim: '', estado: 'Fechado' },
        { id: generateId(), nome: '3º Trimestre', numero: 3, anoLetivoId: '', dataInicio: '', dataFim: '', estado: 'Fechado' },
      ]
    };
    novoAno.trimestres = novoAno.trimestres.map(t => ({ ...t, anoLetivoId: novoAno.id }));
    onUpdate([...anosLetivos, novoAno]);
    setShowModal(false);
    setForm({ nome: '', dataInicio: '', dataFim: '' });
  };

  const toggleAnoLetivo = (id: string) => {
    const ano = anosLetivos.find(a => a.id === id);
    if (!ano) return;
    const newEstado = ano.estado === 'Fechado' ? 'Aberto' : 'Fechado';
    // Se abrir, fechar todos os outros
    const updated = anosLetivos.map(a => {
      if (a.id === id) return { ...a, estado: newEstado as AnoLetivo['estado'] };
      if (newEstado === 'Aberto') return { ...a, estado: 'Fechado' as AnoLetivo['estado'] };
      return a;
    });
    onUpdate(updated);
    setConfirmAction(null);
  };

  const toggleTrimestre = (anoId: string, triId: string) => {
    const updated = anosLetivos.map(ano => {
      if (ano.id !== anoId) return ano;
      const trimestres = ano.trimestres.map(t => {
        if (t.id === triId) {
          const newEstado = t.estado === 'Fechado' ? 'Aberto' : 'Fechado';
          return { ...t, estado: newEstado as Trimestre['estado'] };
        }
        // Close other trimestres when opening one
        if (t.estado === 'Aberto' || t.estado === 'Em Andamento') {
          return { ...t, estado: 'Fechado' as Trimestre['estado'] };
        }
        return t;
      });
      return { ...ano, trimestres };
    });
    onUpdate(updated);
    setConfirmAction(null);
  };

  const updateTrimestreDates = (anoId: string, triId: string, field: 'dataInicio' | 'dataFim', value: string) => {
    const updated = anosLetivos.map(ano => {
      if (ano.id !== anoId) return ano;
      const trimestres = ano.trimestres.map(t => {
        if (t.id === triId) return { ...t, [field]: value };
        return t;
      });
      return { ...ano, trimestres };
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão do Ano Lectivo</h2>
          <p className="text-sm text-gray-500 mt-1">Crie, abra e feche anos lectivos e trimestres</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Novo Ano Lectivo
        </Button>
      </div>

      {anosLetivos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700">Nenhum ano lectivo criado</h3>
          <p className="text-sm text-gray-500 mt-2">Crie um novo ano lectivo para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {anosLetivos.map(ano => (
            <div key={ano.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ano.estado === 'Aberto' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <svg className={`w-6 h-6 ${ano.estado === 'Aberto' ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{ano.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(ano.dataInicio).toLocaleDateString('pt-AO')} — {new Date(ano.dataFim).toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={ano.estado === 'Aberto' ? 'green' : ano.estado === 'Em Andamento' ? 'yellow' : 'gray'}>
                      {ano.estado}
                    </Badge>
                    <Button
                      variant={ano.estado === 'Aberto' ? 'danger' : 'success'}
                      size="sm"
                      onClick={() => setConfirmAction({ type: 'ano', id: ano.id })}
                    >
                      {ano.estado === 'Aberto' ? 'Fechar' : 'Abrir'} Ano
                    </Button>
                  </div>
                </div>

                {/* Trimestres */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ano.trimestres.map(tri => (
                    <div key={tri.id} className={`rounded-xl border-2 p-4 transition ${tri.estado === 'Aberto' ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-700">{tri.nome}</h4>
                        <Badge color={tri.estado === 'Aberto' ? 'green' : 'gray'}>{tri.estado}</Badge>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div>
                          <label className="text-xs text-gray-500">Início</label>
                          <input
                            type="date"
                            value={tri.dataInicio}
                            onChange={e => updateTrimestreDates(ano.id, tri.id, 'dataInicio', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Fim</label>
                          <input
                            type="date"
                            value={tri.dataFim}
                            onChange={e => updateTrimestreDates(ano.id, tri.id, 'dataFim', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        variant={tri.estado === 'Aberto' ? 'danger' : 'success'}
                        size="sm"
                        className="w-full justify-center"
                        disabled={ano.estado === 'Fechado'}
                        onClick={() => setConfirmAction({ type: `tri_${ano.id}`, id: tri.id })}
                      >
                        {tri.estado === 'Aberto' ? 'Fechar' : 'Abrir'} Trimestre
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Ano Lectivo" size="md">
        <div className="space-y-4">
          <Input label="Nome do Ano Lectivo" placeholder="Ex: 2025" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          <Input label="Data de Início" type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
          <Input label="Data de Fim" type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Ano Lectivo</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmAction?.type === 'ano'}
        title="Confirmar Acção"
        message="Deseja alterar o estado deste ano lectivo?"
        onConfirm={() => confirmAction && toggleAnoLetivo(confirmAction.id)}
        onCancel={() => setConfirmAction(null)}
      />
      {anosLetivos.map(ano => (
        <ConfirmDialog
          key={`confirm-${ano.id}`}
          isOpen={confirmAction?.type === `tri_${ano.id}`}
          title="Confirmar Acção"
          message="Deseja alterar o estado deste trimestre?"
          onConfirm={() => confirmAction && toggleTrimestre(ano.id, confirmAction.id)}
          onCancel={() => setConfirmAction(null)}
        />
      ))}
    </div>
  );
}
