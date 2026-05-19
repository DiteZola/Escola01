import { useState } from 'react';
import type { User, Disciplina, DisciplinaProfessor, Turma, Classe } from '../types';
import { Modal, Badge, SearchBar, Avatar } from '../components/ui';
import { getDisciplinaName, getTurmaName, getClassName } from '../store';

interface Props {
  users: User[];
  disciplinas: Disciplina[];
  atribuicoes: DisciplinaProfessor[];
  turmas: Turma[];
  classes: Classe[];
}

export default function Professores({ users, disciplinas, atribuicoes, turmas, classes }: Props) {
  const [viewing, setViewing] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const professores = users.filter(u => u.perfil === 'professor').filter(p =>
    p.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || (p.especialidade || '').toLowerCase().includes(search.toLowerCase())
  );

  const getProfAtribuicoes = (profId: string) => atribuicoes.filter(a => a.professorId === profId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Corpo Docente</h2>
        <p className="text-sm text-gray-500 mt-1">{professores.length} professor(es) registado(s)</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar professor..." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {professores.map(prof => {
          const attrs = getProfAtribuicoes(prof.id);
          return (
            <div key={prof.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer" onClick={() => setViewing(prof)}>
              <div className="flex items-center gap-4 mb-4">
                <Avatar src={prof.foto} name={prof.nomeCompleto} size="lg" />
                <div>
                  <h3 className="font-bold text-gray-800">{prof.nomeCompleto}</h3>
                  <p className="text-xs text-gray-500">{prof.especialidade || prof.formacaoAcademica || 'Professor'}</p>
                  <Badge color={prof.ativo ? 'green' : 'red'}>{prof.ativo ? 'Activo' : 'Inactivo'}</Badge>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Categoria:</span><span className="text-gray-700 text-xs">{prof.categoriaDocente || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Experiência:</span><span className="text-gray-700">{prof.anoExperiencia} anos</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Disciplinas:</span><span className="text-gray-700">{attrs.length}</span></div>
              </div>
              {attrs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {attrs.slice(0, 3).map(a => (
                    <span key={a.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{getDisciplinaName(disciplinas, a.disciplinaId)}</span>
                  ))}
                  {attrs.length > 3 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">+{attrs.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
        {professores.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">Nenhum professor encontrado</div>
        )}
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Perfil do Professor" size="xl">
        {viewing && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar src={viewing.foto} name={viewing.nomeCompleto} size="xl" />
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-gray-800">{viewing.nomeCompleto}</h3>
                <p className="text-gray-500">{viewing.especialidade || 'Professor'}</p>
                <div className="flex gap-2 mt-2">
                  <Badge color="purple">{viewing.categoriaDocente || 'Professor'}</Badge>
                  <Badge color={viewing.ativo ? 'green' : 'red'}>{viewing.ativo ? 'Activo' : 'Inactivo'}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Email', viewing.email], ['Telefone', viewing.telefone],
                ['BI', viewing.bilheteIdentidade],
                ['Data Nascimento', viewing.dataNascimento ? new Date(viewing.dataNascimento).toLocaleDateString('pt-AO') : ''],
                ['Género', viewing.genero], ['Estado Civil', viewing.estadoCivil],
                ['Naturalidade', viewing.naturalidade], ['Província', viewing.provincia],
                ['Município', viewing.municipio], ['Endereço', viewing.endereco],
                ['Habilitações', viewing.habilitacoes], ['Formação', viewing.formacaoAcademica],
                ['Nº Agente', viewing.numeroAgente], ['Experiência', `${viewing.anoExperiencia} anos`],
                ['Data Admissão', viewing.dataAdmissao ? new Date(viewing.dataAdmissao).toLocaleDateString('pt-AO') : ''],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Atribuições */}
            <div>
              <h4 className="font-bold text-gray-800 mb-3">Disciplinas Atribuídas</h4>
              {getProfAtribuicoes(viewing.id).length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma disciplina atribuída</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getProfAtribuicoes(viewing.id).map(a => {
                    const turma = turmas.find(t => t.id === a.turmaId);
                    return (
                      <div key={a.id} className="p-3 bg-blue-50 rounded-xl">
                        <p className="text-sm font-medium text-blue-800">{getDisciplinaName(disciplinas, a.disciplinaId)}</p>
                        <p className="text-xs text-blue-600">{getTurmaName(turmas, a.turmaId)} • {turma ? getClassName(classes, turma.classeId) : ''}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
