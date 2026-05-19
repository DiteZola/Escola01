import { useState } from 'react';
import type { User, UserRole } from '../types';
import { ROLE_LABELS, PROVINCIAS_ANGOLA, ESTADOS_CIVIS, HABILITACOES, CATEGORIAS_DOCENTES } from '../types';
import { Modal, Input, Select, Button, Badge, SearchBar, Avatar, PhotoUpload, TextArea, ConfirmDialog } from '../components/ui';
import { generateId } from '../store';

interface Props {
  users: User[];
  currentUser: User;
  onUpdate: (users: User[]) => void;
}

const emptyUser: Omit<User, 'id' | 'dataCriacao'> = {
  nome: '', sobrenome: '', nomeCompleto: '', email: '', senha: '', perfil: 'professor',
  foto: '', telefone: '', telefone2: '', bilheteIdentidade: '', dataNascimento: '',
  genero: 'Masculino', estadoCivil: '', naturalidade: '', provincia: '', municipio: '',
  endereco: '', habilitacoes: '', formacaoAcademica: '', anoExperiencia: 0,
  especialidade: '', numeroAgente: '', categoriaDocente: '', dataAdmissao: '',
  iban: '', nif: '', inss: '', observacoes: '', ativo: true,
};

export default function Usuarios({ users, currentUser, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [form, setForm] = useState(emptyUser);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = users.filter(u => {
    const matchSearch = u.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.perfil === filterRole;
    return matchSearch && matchRole;
  });

  const canManageRole = (role: UserRole): boolean => {
    if (currentUser.perfil === 'director_geral') return true;
    if (currentUser.perfil === 'subdiretor_administrativo') return ['secretaria', 'professor'].includes(role);
    if (currentUser.perfil === 'secretaria') return ['encarregado'].includes(role);
    return false;
  };

  const availableRoles = Object.entries(ROLE_LABELS).filter(([role]) => canManageRole(role as UserRole));

  const openCreate = () => {
    setForm(emptyUser);
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setForm(user);
    setEditing(user);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.sobrenome || !form.email || !form.senha) {
      alert('Preencha os campos obrigatórios: Nome, Sobrenome, Email e Senha');
      return;
    }
    const nomeCompleto = `${form.nome} ${form.sobrenome}`;
    if (editing) {
      const updated = users.map(u => u.id === editing.id ? { ...u, ...form, nomeCompleto } : u);
      onUpdate(updated);
    } else {
      const newUser: User = { ...form, nomeCompleto, id: generateId(), dataCriacao: new Date().toISOString() };
      onUpdate([...users, newUser]);
    }
    setShowModal(false);
  };

  const toggleActive = (id: string) => {
    onUpdate(users.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
  };

  const deleteUser = (id: string) => {
    onUpdate(users.filter(u => u.id !== id));
    setDeleteConfirm(null);
  };

  const updateForm = (field: string, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Utilizadores</h2>
          <p className="text-sm text-gray-500 mt-1">Cadastre e gerencie os utilizadores do sistema</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Novo Utilizador
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar por nome ou email..." />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"
        >
          <option value="">Todos os perfis</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Utilizador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.foto} name={user.nomeCompleto} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{user.nomeCompleto}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={
                      user.perfil === 'director_geral' ? 'purple' :
                      user.perfil === 'professor' ? 'blue' :
                      user.perfil === 'encarregado' ? 'orange' : 'gray'
                    }>
                      {ROLE_LABELS[user.perfil]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.telefone}</td>
                  <td className="px-4 py-3">
                    <Badge color={user.ativo ? 'green' : 'red'}>{user.ativo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewing(user)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition" title="Ver">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {canManageRole(user.perfil) && (
                        <>
                          <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition" title="Editar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => toggleActive(user.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title={user.ativo ? 'Desactivar' : 'Activar'}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={user.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                          </button>
                          {user.id !== currentUser.id && (
                            <button onClick={() => setDeleteConfirm(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhum utilizador encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Detalhes do Utilizador" size="xl">
        {viewing && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar src={viewing.foto} name={viewing.nomeCompleto} size="xl" />
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-gray-800">{viewing.nomeCompleto}</h3>
                <p className="text-gray-500">{ROLE_LABELS[viewing.perfil]}</p>
                <Badge color={viewing.ativo ? 'green' : 'red'}>{viewing.ativo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Email', viewing.email], ['Telefone', viewing.telefone], ['Telefone 2', viewing.telefone2],
                ['BI', viewing.bilheteIdentidade], ['Data Nascimento', viewing.dataNascimento ? new Date(viewing.dataNascimento).toLocaleDateString('pt-AO') : ''],
                ['Género', viewing.genero], ['Estado Civil', viewing.estadoCivil],
                ['Naturalidade', viewing.naturalidade], ['Província', viewing.provincia],
                ['Município', viewing.municipio], ['Endereço', viewing.endereco],
                ['Habilitações', viewing.habilitacoes], ['Formação', viewing.formacaoAcademica],
                ['Especialidade', viewing.especialidade], ['Nº Agente', viewing.numeroAgente],
                ['Categoria Docente', viewing.categoriaDocente], ['Experiência', `${viewing.anoExperiencia} anos`],
                ['Data Admissão', viewing.dataAdmissao ? new Date(viewing.dataAdmissao).toLocaleDateString('pt-AO') : ''],
                ['IBAN', viewing.iban], ['NIF', viewing.nif], ['INSS', viewing.inss],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            {viewing.observacoes && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-medium">Observações</p>
                <p className="text-sm text-gray-800 mt-0.5">{viewing.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Utilizador' : 'Novo Utilizador'} size="2xl">
        <div className="space-y-6">
          <PhotoUpload currentPhoto={form.foto} onPhotoChange={foto => updateForm('foto', foto)} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome *" value={form.nome} onChange={e => updateForm('nome', e.target.value)} placeholder="João" />
            <Input label="Sobrenome *" value={form.sobrenome} onChange={e => updateForm('sobrenome', e.target.value)} placeholder="Silva" />
            <Select label="Perfil *" value={form.perfil} onChange={e => updateForm('perfil', e.target.value)} options={availableRoles.map(([k, v]) => ({ value: k, label: v }))} />
            <Input label="Email *" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="email@escola.ao" />
            <Input label="Senha *" type="text" value={form.senha} onChange={e => updateForm('senha', e.target.value)} placeholder="********" />
            <Input label="Telefone" value={form.telefone} onChange={e => updateForm('telefone', e.target.value)} placeholder="+244 9XX XXX XXX" />
            <Input label="Telefone 2" value={form.telefone2 || ''} onChange={e => updateForm('telefone2', e.target.value)} />
            <Input label="Bilhete de Identidade" value={form.bilheteIdentidade} onChange={e => updateForm('bilheteIdentidade', e.target.value)} placeholder="000000000LA042" />
            <Input label="Data de Nascimento" type="date" value={form.dataNascimento} onChange={e => updateForm('dataNascimento', e.target.value)} />
            <Select label="Género" value={form.genero} onChange={e => updateForm('genero', e.target.value)} options={[{ value: 'Masculino', label: 'Masculino' }, { value: 'Feminino', label: 'Feminino' }]} />
            <Select label="Estado Civil" value={form.estadoCivil} onChange={e => updateForm('estadoCivil', e.target.value)} options={ESTADOS_CIVIS.map(e => ({ value: e, label: e }))} />
            <Input label="Naturalidade" value={form.naturalidade} onChange={e => updateForm('naturalidade', e.target.value)} />
            <Select label="Província" value={form.provincia} onChange={e => updateForm('provincia', e.target.value)} options={PROVINCIAS_ANGOLA.map(p => ({ value: p, label: p }))} />
            <Input label="Município" value={form.municipio} onChange={e => updateForm('municipio', e.target.value)} />
            <Input label="Endereço" value={form.endereco} onChange={e => updateForm('endereco', e.target.value)} className="sm:col-span-2" />
            <Select label="Habilitações Literárias" value={form.habilitacoes} onChange={e => updateForm('habilitacoes', e.target.value)} options={HABILITACOES.map(h => ({ value: h, label: h }))} />
            <Input label="Formação Académica" value={form.formacaoAcademica} onChange={e => updateForm('formacaoAcademica', e.target.value)} />
            <Input label="Especialidade" value={form.especialidade || ''} onChange={e => updateForm('especialidade', e.target.value)} />
            <Select label="Categoria Docente" value={form.categoriaDocente || ''} onChange={e => updateForm('categoriaDocente', e.target.value)} options={CATEGORIAS_DOCENTES.map(c => ({ value: c, label: c }))} />
            <Input label="Nº Agente" value={form.numeroAgente || ''} onChange={e => updateForm('numeroAgente', e.target.value)} />
            <Input label="Anos de Experiência" type="number" value={form.anoExperiencia} onChange={e => updateForm('anoExperiencia', parseInt(e.target.value) || 0)} />
            <Input label="Data de Admissão" type="date" value={form.dataAdmissao} onChange={e => updateForm('dataAdmissao', e.target.value)} />
            <Input label="IBAN" value={form.iban || ''} onChange={e => updateForm('iban', e.target.value)} placeholder="AO06..." />
            <Input label="NIF" value={form.nif || ''} onChange={e => updateForm('nif', e.target.value)} />
            <Input label="INSS" value={form.inss || ''} onChange={e => updateForm('inss', e.target.value)} />
          </div>
          <TextArea label="Observações" value={form.observacoes || ''} onChange={e => updateForm('observacoes', e.target.value)} />
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar Alterações' : 'Criar Utilizador'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Eliminar Utilizador"
        message="Esta acção é irreversível. Deseja eliminar este utilizador?"
        onConfirm={() => deleteConfirm && deleteUser(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
