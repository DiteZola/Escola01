import type { AppState } from '../types';
import { ROLE_LABELS } from '../types';
import { StatCard, Badge } from '../components/ui';
import { getActiveAnoLetivo, getActiveTrimestre } from '../store';

export default function Dashboard({ state }: { state: AppState }) {
  const user = state.currentUser!;
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const trimestreAtivo = anoAtivo ? getActiveTrimestre(anoAtivo) : undefined;

  const totalAlunos = state.alunos.filter(a => a.situacao === 'Ativo').length;
  const totalProfessores = state.users.filter(u => u.perfil === 'professor' && u.ativo).length;
  const totalTurmas = state.turmas.length;
  const totalDisciplinas = state.disciplinas.length;
  const totalFuncionarios = state.users.filter(u => u.ativo && u.perfil !== 'encarregado').length;
  const totalComunicados = state.comunicados.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
        <div className="relative z-10">
          <p className="text-blue-200 text-sm">Bem-vindo(a) de volta,</p>
          <h1 className="text-2xl lg:text-3xl font-bold mt-1">{user.nomeCompleto}</h1>
          <p className="text-blue-200 mt-1">{ROLE_LABELS[user.perfil]}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {anoAtivo ? (
              <Badge color="green">Ano Lectivo: {anoAtivo.nome}</Badge>
            ) : (
              <Badge color="red">Nenhum ano lectivo activo</Badge>
            )}
            {trimestreAtivo && (
              <Badge color="blue">{trimestreAtivo.nome}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Alunos Activos"
          value={totalAlunos}
          icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle="Matriculados"
        />
        <StatCard
          title="Professores"
          value={totalProfessores}
          icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle="Activos"
        />
        <StatCard
          title="Turmas"
          value={totalTurmas}
          icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle="Criadas"
        />
        <StatCard
          title="Disciplinas"
          value={totalDisciplinas}
          icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        {(user.perfil === 'director_geral' || user.perfil === 'subdiretor_administrativo') && (
          <StatCard
            title="Funcionários"
            value={totalFuncionarios}
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            color="bg-gradient-to-br from-teal-500 to-teal-600"
            subtitle="Total"
          />
        )}
        <StatCard
          title="Comunicados"
          value={totalComunicados}
          icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
          color="bg-gradient-to-br from-pink-500 to-pink-600"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Comunicados */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            Últimos Comunicados
          </h3>
          {state.comunicados.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum comunicado publicado</p>
          ) : (
            <div className="space-y-3">
              {state.comunicados.slice(-5).reverse().map(c => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">{c.titulo}</h4>
                    <Badge color={c.prioridade === 'Urgente' ? 'red' : c.prioridade === 'Importante' ? 'yellow' : 'blue'}>
                      {c.prioridade}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.mensagem}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(c.dataPublicacao).toLocaleDateString('pt-AO')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Informações Rápidas
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Ano Lectivo</span>
              <span className="text-sm font-semibold text-gray-800">{anoAtivo?.nome || 'Não definido'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Trimestre Actual</span>
              <span className="text-sm font-semibold text-gray-800">{trimestreAtivo?.nome || 'Não definido'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Classes Disponíveis</span>
              <span className="text-sm font-semibold text-gray-800">{state.classes.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Turnos</span>
              <span className="text-sm font-semibold text-gray-800">{state.turnos.map(t => t.nome).join(', ')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Eventos Próximos</span>
              <span className="text-sm font-semibold text-gray-800">{state.eventos.filter(e => new Date(e.dataInicio) >= new Date()).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alunos por Classe */}
      {state.alunos.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Alunos por Classe</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {state.classes.map(cl => {
              const count = state.alunos.filter(a => a.classeId === cl.id && a.situacao === 'Ativo').length;
              if (count === 0) return null;
              return (
                <div key={cl.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{count}</p>
                  <p className="text-xs text-gray-600 mt-1">{cl.nome}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
