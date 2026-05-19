import { useState } from 'react';
import type { Aluno, Classe, Turma, Turno, User, AnoLetivo } from '../types';
import { PROVINCIAS_ANGOLA, GRAUS_PARENTESCO, GRUPOS_SANGUINEOS } from '../types';
import { Modal, Input, Select, Button, Badge, SearchBar, Avatar, PhotoUpload, TextArea, ConfirmDialog } from '../components/ui';
import { generateId, getClassName, getTurmaName, getTurnoName, getActiveAnoLetivo } from '../store';

interface Props {
  alunos: Aluno[];
  classes: Classe[];
  turmas: Turma[];
  turnos: Turno[];
  users: User[];
  anosLetivos: AnoLetivo[];
  currentUser: User;
  onUpdate: (alunos: Aluno[]) => void;
}

const emptyAluno: Omit<Aluno, 'id' | 'dataCriacao' | 'numeroMatricula'> = {
  nomeCompleto: '', dataNascimento: '', genero: 'Masculino', foto: '',
  bilheteIdentidade: '', naturalidade: '', provincia: '', municipio: '', endereco: '',
  grupoSanguineo: '', doencaCronica: '', nomeDoEncarregado: '', encarregadoId: '',
  telefoneEncarregado: '', grauParentesco: '', classeId: '', turmaId: '', turnoId: '',
  anoLetivoMatricula: '', situacao: 'Ativo', observacoes: '',
};

export default function Alunos({ alunos, classes, turmas, turnos, users, anosLetivos, currentUser, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Aluno | null>(null);
  const [viewing, setViewing] = useState<Aluno | null>(null);
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterTurma, setFilterTurma] = useState('');
  const [form, setForm] = useState(emptyAluno);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const anoAtivo = getActiveAnoLetivo(anosLetivos);
  const canEdit = ['director_geral', 'subdiretor_pedagogico', 'subdiretor_administrativo', 'secretaria'].includes(currentUser.perfil);

  // For encarregado, show only their children
  const visibleAlunos = currentUser.perfil === 'encarregado'
    ? alunos.filter(a => a.encarregadoId === currentUser.id)
    : alunos;

  const filtered = visibleAlunos.filter(a => {
    const matchSearch = a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || a.numeroMatricula.includes(search);
    const matchClasse = !filterClasse || a.classeId === filterClasse;
    const matchTurma = !filterTurma || a.turmaId === filterTurma;
    return matchSearch && matchClasse && matchTurma;
  });

  const filteredTurmas = form.classeId ? turmas.filter(t => t.classeId === form.classeId) : turmas;
  const encarregados = users.filter(u => u.perfil === 'encarregado' && u.ativo);

  const generateMatricula = () => {
    const year = new Date().getFullYear();
    const count = alunos.length + 1;
    return `${year}${String(count).padStart(5, '0')}`;
  };

  const openCreate = () => {
    setForm({ ...emptyAluno, anoLetivoMatricula: anoAtivo?.id || '' });
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (aluno: Aluno) => {
    setForm(aluno);
    setEditing(aluno);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.nomeCompleto || !form.classeId || !form.turmaId) {
      alert('Preencha os campos obrigatórios: Nome, Classe e Turma');
      return;
    }
    if (editing) {
      onUpdate(alunos.map(a => a.id === editing.id ? { ...a, ...form } as Aluno : a));
    } else {
      const newAluno: Aluno = {
        ...form,
        id: generateId(),
        numeroMatricula: generateMatricula(),
        dataCriacao: new Date().toISOString(),
      } as Aluno;
      onUpdate([...alunos, newAluno]);
    }
    setShowModal(false);
  };

  const deleteAluno = (id: string) => {
    onUpdate(alunos.filter(a => a.id !== id));
    setDeleteConfirm(null);
  };

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Alunos</h2>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} aluno(s) encontrado(s)</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Matricular Aluno
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar por nome ou matrícula..." />
        </div>
        <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <option value="">Todas as classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filterTurma} onChange={e => setFilterTurma(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <option value="">Todas as turmas</option>
          {turmas.filter(t => !filterClasse || t.classeId === filterClasse).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Matrícula</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Turno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Situação</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(aluno => (
                <tr key={aluno.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={aluno.foto} name={aluno.nomeCompleto} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{aluno.nomeCompleto}</p>
                        <p className="text-xs text-gray-400">{aluno.genero}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{aluno.numeroMatricula}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getClassName(classes, aluno.classeId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getTurmaName(turmas, aluno.turmaId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getTurnoName(turnos, aluno.turnoId)}</td>
                  <td className="px-4 py-3">
                    <Badge color={aluno.situacao === 'Ativo' ? 'green' : aluno.situacao === 'Transferido' ? 'yellow' : aluno.situacao === 'Concluído' ? 'blue' : 'red'}>
                      {aluno.situacao}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewing(aluno)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition" title="Ver">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(aluno)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition" title="Editar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setDeleteConfirm(aluno.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition" title="Eliminar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhum aluno encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Ficha do Aluno" size="xl">
        {viewing && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar src={viewing.foto} name={viewing.nomeCompleto} size="xl" />
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-gray-800">{viewing.nomeCompleto}</h3>
                <p className="text-gray-500 font-mono">Matrícula: {viewing.numeroMatricula}</p>
                <div className="flex gap-2 mt-2">
                  <Badge color={viewing.situacao === 'Ativo' ? 'green' : 'red'}>{viewing.situacao}</Badge>
                  <Badge color="blue">{getClassName(classes, viewing.classeId)}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Data Nascimento', viewing.dataNascimento ? new Date(viewing.dataNascimento).toLocaleDateString('pt-AO') : ''],
                ['Género', viewing.genero], ['BI', viewing.bilheteIdentidade],
                ['Naturalidade', viewing.naturalidade], ['Província', viewing.provincia],
                ['Município', viewing.municipio], ['Endereço', viewing.endereco],
                ['Grupo Sanguíneo', viewing.grupoSanguineo], ['Doença Crónica', viewing.doencaCronica],
                ['Classe', getClassName(classes, viewing.classeId)], ['Turma', getTurmaName(turmas, viewing.turmaId)],
                ['Turno', getTurnoName(turnos, viewing.turnoId)],
                ['Encarregado', viewing.nomeDoEncarregado], ['Tel. Encarregado', viewing.telefoneEncarregado],
                ['Parentesco', viewing.grauParentesco],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Aluno' : 'Matricular Aluno'} size="2xl">
        <div className="space-y-6">
          <PhotoUpload currentPhoto={form.foto} onPhotoChange={foto => updateForm('foto', foto)} label="Fotografia do Aluno" />
          
          <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Dados Pessoais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome Completo *" value={form.nomeCompleto} onChange={e => updateForm('nomeCompleto', e.target.value)} className="sm:col-span-2" />
            <Input label="Data de Nascimento" type="date" value={form.dataNascimento} onChange={e => updateForm('dataNascimento', e.target.value)} />
            <Select label="Género" value={form.genero} onChange={e => updateForm('genero', e.target.value)} options={[{ value: 'Masculino', label: 'Masculino' }, { value: 'Feminino', label: 'Feminino' }]} />
            <Input label="Bilhete de Identidade" value={form.bilheteIdentidade || ''} onChange={e => updateForm('bilheteIdentidade', e.target.value)} />
            <Input label="Naturalidade" value={form.naturalidade} onChange={e => updateForm('naturalidade', e.target.value)} />
            <Select label="Província" value={form.provincia} onChange={e => updateForm('provincia', e.target.value)} options={PROVINCIAS_ANGOLA.map(p => ({ value: p, label: p }))} />
            <Input label="Município" value={form.municipio} onChange={e => updateForm('municipio', e.target.value)} />
            <Input label="Endereço" value={form.endereco} onChange={e => updateForm('endereco', e.target.value)} className="sm:col-span-2" />
            <Select label="Grupo Sanguíneo" value={form.grupoSanguineo || ''} onChange={e => updateForm('grupoSanguineo', e.target.value)} options={GRUPOS_SANGUINEOS.map(g => ({ value: g, label: g }))} />
            <Input label="Doença Crónica" value={form.doencaCronica || ''} onChange={e => updateForm('doencaCronica', e.target.value)} />
          </div>

          <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Dados Académicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select label="Classe *" value={form.classeId} onChange={e => updateForm('classeId', e.target.value)} options={classes.map(c => ({ value: c.id, label: c.nome }))} />
            <Select label="Turma *" value={form.turmaId} onChange={e => updateForm('turmaId', e.target.value)} options={filteredTurmas.map(t => ({ value: t.id, label: t.nome }))} />
            <Select label="Turno" value={form.turnoId} onChange={e => updateForm('turnoId', e.target.value)} options={turnos.map(t => ({ value: t.id, label: t.nome }))} />
            <Select label="Situação" value={form.situacao} onChange={e => updateForm('situacao', e.target.value)} options={[
              { value: 'Ativo', label: 'Ativo' }, { value: 'Transferido', label: 'Transferido' },
              { value: 'Desistente', label: 'Desistente' }, { value: 'Concluído', label: 'Concluído' },
            ]} />
          </div>

          <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Dados do Encarregado de Educação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome do Encarregado" value={form.nomeDoEncarregado} onChange={e => updateForm('nomeDoEncarregado', e.target.value)} className="sm:col-span-2" />
            <Select label="Encarregado (Utilizador)" value={form.encarregadoId || ''} onChange={e => updateForm('encarregadoId', e.target.value)} options={encarregados.map(e => ({ value: e.id, label: e.nomeCompleto }))} />
            <Input label="Telefone do Encarregado" value={form.telefoneEncarregado} onChange={e => updateForm('telefoneEncarregado', e.target.value)} />
            <Select label="Grau de Parentesco" value={form.grauParentesco} onChange={e => updateForm('grauParentesco', e.target.value)} options={GRAUS_PARENTESCO.map(g => ({ value: g, label: g }))} />
          </div>

          <TextArea label="Observações" value={form.observacoes || ''} onChange={e => updateForm('observacoes', e.target.value)} />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar Alterações' : 'Matricular Aluno'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} title="Eliminar Aluno" message="Deseja eliminar este aluno? Esta acção é irreversível." onConfirm={() => deleteConfirm && deleteAluno(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
