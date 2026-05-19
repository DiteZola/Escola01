import type { AppState } from '../types';
import { getClassName, getActiveAnoLetivo } from '../store';

export default function Relatorios({ state }: { state: AppState }) {
  const anoAtivo = getActiveAnoLetivo(state.anosLetivos);
  const alunosAtivos = state.alunos.filter(a => a.situacao === 'Ativo');

  // Stats per class
  const classStats = state.classes.map(c => {
    const alunosClasse = alunosAtivos.filter(a => a.classeId === c.id);
    const masc = alunosClasse.filter(a => a.genero === 'Masculino').length;
    const fem = alunosClasse.filter(a => a.genero === 'Feminino').length;
    return { classe: c, total: alunosClasse.length, masc, fem };
  }).filter(s => s.total > 0);

  // Stats per turma
  const turmaStats = state.turmas.map(t => {
    const alunosTurma = alunosAtivos.filter(a => a.turmaId === t.id);
    return { turma: t, total: alunosTurma.length, capacidade: t.capacidade };
  });

  // Nota stats per disciplina
  const disciplinaStats = state.disciplinas.map(d => {
    const notasDisciplina = state.notas.filter(n => n.disciplinaId === d.id && n.mt !== null);
    const total = notasDisciplina.length;
    const aprovados = notasDisciplina.filter(n => (n.mt ?? 0) >= 10).length;
    const media = total > 0 ? notasDisciplina.reduce((acc, n) => acc + (n.mt ?? 0), 0) / total : 0;
    return { disciplina: d, total, aprovados, reprovados: total - aprovados, media: Math.round(media * 10) / 10 };
  }).filter(s => s.total > 0);

  // Presence stats
  const totalPresencas = state.presencas.filter(p => p.presente).length;
  const totalFaltas = state.presencas.filter(p => !p.presente).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Relatórios Estatísticos</h2>
        <p className="text-sm text-gray-500 mt-1">{anoAtivo ? `Ano Lectivo ${anoAtivo.nome}` : 'Relatórios gerais'}</p>
      </div>

      {/* General Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-blue-600">{alunosAtivos.length}</p>
          <p className="text-sm text-gray-500">Alunos Activos</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-emerald-600">{state.users.filter(u => u.perfil === 'professor' && u.ativo).length}</p>
          <p className="text-sm text-gray-500">Professores</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-purple-600">{state.turmas.length}</p>
          <p className="text-sm text-gray-500">Turmas</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-orange-600">{state.ocorrencias.length}</p>
          <p className="text-sm text-gray-500">Ocorrências</p>
        </div>
      </div>

      {/* Alunos por Classe */}
      {classStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">📊 Alunos por Classe</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Classe</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Masculino</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Feminino</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Distribuição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classStats.map(s => (
                  <tr key={s.classe.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{s.classe.nome}</td>
                    <td className="px-4 py-3 text-sm text-center font-bold">{s.total}</td>
                    <td className="px-4 py-3 text-sm text-center text-blue-600">{s.masc}</td>
                    <td className="px-4 py-3 text-sm text-center text-pink-600">{s.fem}</td>
                    <td className="px-4 py-3">
                      <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 w-48">
                        <div className="bg-blue-500" style={{ width: `${(s.masc / s.total) * 100}%` }}></div>
                        <div className="bg-pink-500" style={{ width: `${(s.fem / s.total) * 100}%` }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-sm">Total</td>
                  <td className="px-4 py-3 text-sm text-center">{classStats.reduce((a, s) => a + s.total, 0)}</td>
                  <td className="px-4 py-3 text-sm text-center text-blue-600">{classStats.reduce((a, s) => a + s.masc, 0)}</td>
                  <td className="px-4 py-3 text-sm text-center text-pink-600">{classStats.reduce((a, s) => a + s.fem, 0)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ocupação das Turmas */}
      {turmaStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">🏫 Ocupação das Turmas</h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmaStats.map(s => {
              const pct = s.capacidade > 0 ? Math.round((s.total / s.capacidade) * 100) : 0;
              return (
                <div key={s.turma.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{s.turma.nome} ({getClassName(state.classes, s.turma.classeId)})</span>
                    <span className="text-xs text-gray-500">{s.total}/{s.capacidade}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% ocupado</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desempenho por Disciplina */}
      {disciplinaStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">📈 Desempenho por Disciplina</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Disciplina</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Avaliados</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Aprovados</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Reprovados</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Média</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Taxa Aprovação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {disciplinaStats.map(s => {
                  const taxa = s.total > 0 ? Math.round((s.aprovados / s.total) * 100) : 0;
                  return (
                    <tr key={s.disciplina.id}>
                      <td className="px-4 py-3 text-sm font-medium">{s.disciplina.nome}</td>
                      <td className="px-4 py-3 text-sm text-center">{s.total}</td>
                      <td className="px-4 py-3 text-sm text-center text-emerald-600 font-bold">{s.aprovados}</td>
                      <td className="px-4 py-3 text-sm text-center text-red-600 font-bold">{s.reprovados}</td>
                      <td className="px-4 py-3 text-sm text-center font-bold">{s.media}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${taxa >= 60 ? 'text-emerald-600' : 'text-red-600'}`}>{taxa}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Presence Stats */}
      {(totalPresencas > 0 || totalFaltas > 0) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">📋 Resumo de Presenças</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-600">{totalPresencas}</p>
              <p className="text-sm text-gray-500">Presenças</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-600">{totalFaltas}</p>
              <p className="text-sm text-gray-500">Faltas</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{totalPresencas + totalFaltas > 0 ? Math.round((totalPresencas / (totalPresencas + totalFaltas)) * 100) : 0}%</p>
              <p className="text-sm text-gray-500">Taxa Presença</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
