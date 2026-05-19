import { useState } from 'react';
import type { User } from '../types';
import { ROLE_LABELS } from '../types';
import { Input, Button, Avatar, PhotoUpload, Badge } from '../components/ui';

interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

export default function Perfil({ user, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(user);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', nova: '', confirmar: '' });
  const [msg, setMsg] = useState('');

  const handleSave = () => {
    onUpdate({ ...user, ...form, nomeCompleto: `${form.nome} ${form.sobrenome}` });
    setEditing(false);
    setMsg('Perfil actualizado com sucesso!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleChangePassword = () => {
    if (passwords.current !== user.senha) {
      setMsg('Senha actual incorrecta!');
      return;
    }
    if (passwords.nova.length < 6) {
      setMsg('A nova senha deve ter pelo menos 6 caracteres!');
      return;
    }
    if (passwords.nova !== passwords.confirmar) {
      setMsg('As senhas não coincidem!');
      return;
    }
    onUpdate({ ...user, senha: passwords.nova });
    setShowPasswordForm(false);
    setPasswords({ current: '', nova: '', confirmar: '' });
    setMsg('Senha alterada com sucesso!');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {msg && (
        <div className={`p-4 rounded-xl text-sm font-medium ${msg.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          <div className="absolute -bottom-12 left-6">
            {editing ? (
              <PhotoUpload currentPhoto={form.foto} onPhotoChange={foto => setForm({ ...form, foto })} />
            ) : (
              <Avatar src={user.foto} name={user.nomeCompleto} size="xl" />
            )}
          </div>
        </div>
        <div className="pt-16 px-6 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{user.nomeCompleto}</h2>
              <p className="text-gray-500">{user.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge color="purple">{ROLE_LABELS[user.perfil]}</Badge>
                <Badge color={user.ativo ? 'green' : 'red'}>{user.ativo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {!editing ? (
                <>
                  <Button variant="secondary" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                    🔒 Alterar Senha
                  </Button>
                  <Button onClick={() => { setForm(user); setEditing(true); }}>
                    ✏️ Editar Perfil
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button onClick={handleSave}>Guardar</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      {showPasswordForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🔒 Alterar Senha</h3>
          <div className="max-w-md space-y-4">
            <Input label="Senha Actual" type="password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} />
            <Input label="Nova Senha" type="password" value={passwords.nova} onChange={e => setPasswords({ ...passwords, nova: e.target.value })} />
            <Input label="Confirmar Nova Senha" type="password" value={passwords.confirmar} onChange={e => setPasswords({ ...passwords, confirmar: e.target.value })} />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowPasswordForm(false)}>Cancelar</Button>
              <Button onClick={handleChangePassword}>Alterar Senha</Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Dados Pessoais</h3>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            <Input label="Sobrenome" value={form.sobrenome} onChange={e => setForm({ ...form, sobrenome: e.target.value })} />
            <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            <Input label="Telefone 2" value={form.telefone2 || ''} onChange={e => setForm({ ...form, telefone2: e.target.value })} />
            <Input label="Endereço" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['Nome Completo', user.nomeCompleto],
              ['Email', user.email],
              ['Telefone', user.telefone],
              ['Telefone 2', user.telefone2],
              ['BI', user.bilheteIdentidade],
              ['Data Nascimento', user.dataNascimento ? new Date(user.dataNascimento).toLocaleDateString('pt-AO') : ''],
              ['Género', user.genero],
              ['Estado Civil', user.estadoCivil],
              ['Naturalidade', user.naturalidade],
              ['Província', user.provincia],
              ['Município', user.municipio],
              ['Endereço', user.endereco],
              ['Habilitações', user.habilitacoes],
              ['Formação Académica', user.formacaoAcademica],
              ['Especialidade', user.especialidade],
              ['Nº Agente', user.numeroAgente],
              ['Categoria Docente', user.categoriaDocente],
              ['Experiência', user.anoExperiencia ? `${user.anoExperiencia} anos` : ''],
              ['Data Admissão', user.dataAdmissao ? new Date(user.dataAdmissao).toLocaleDateString('pt-AO') : ''],
              ['IBAN', user.iban],
              ['NIF', user.nif],
              ['INSS', user.inss],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
