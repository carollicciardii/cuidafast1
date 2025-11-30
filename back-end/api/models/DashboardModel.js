const supabase = require('./db');

async function getDashboardData() {
    try {
        const dashboard = {};

        // Total de consultas
        const { count: totalConsultas, error: err1 } = await supabase
            .from('contratar')
            .select('*', { count: 'exact', head: true });
        if (err1) throw err1;
        dashboard.totalConsultas = totalConsultas || 0;

        // Valor arrecadado (soma de ganhos dos cuidadores)
        const { data: cuidadores, error: err2 } = await supabase
            .from('cuidador')
            .select('ganhos');
        if (err2) throw err2;
        dashboard.valorArrecadado = cuidadores?.reduce((sum, c) => sum + (parseFloat(c.ganhos) || 0), 0) || 0;

        // Usuários atendidos no mês atual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: contratosMes, error: err3 } = await supabase
            .from('contratar')
            .select('cliente_id')
            .gte('data_criacao', startOfMonth);
        if (err3) throw err3;
        const uniqueClientes = new Set(contratosMes?.map(c => c.cliente_id) || []);
        dashboard.usuariosAtendidos = uniqueClientes.size;

        // Avaliação média
        const { data: avaliacoes, error: err4 } = await supabase
            .from('cuidador')
            .select('avaliacao');
        if (err4) throw err4;
        const avaliacoesValidas = avaliacoes?.filter(a => a.avaliacao != null).map(a => parseFloat(a.avaliacao)) || [];
        dashboard.avaliacaoMedia = avaliacoesValidas.length > 0 
            ? avaliacoesValidas.reduce((sum, a) => sum + a, 0) / avaliacoesValidas.length 
            : 0;

        // Atividade consultas (últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: atividadeData, error: err5 } = await supabase
            .from('contratar')
            .select('data_criacao')
            .gte('data_criacao', thirtyDaysAgo.toISOString());
        if (err5) throw err5;
        
        const atividadePorDia = {};
        atividadeData?.forEach(item => {
            const date = new Date(item.data_criacao).toISOString().split('T')[0];
            atividadePorDia[date] = (atividadePorDia[date] || 0) + 1;
        });
        dashboard.atividadeConsultas = Object.entries(atividadePorDia)
            .map(([dia, total]) => ({ dia, total }))
            .sort((a, b) => a.dia.localeCompare(b.dia));

        // Performance mensal (últimos 6 meses) - precisa de RPC ou query manual
        // Por enquanto, vamos fazer uma versão simplificada
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: contratos6Meses, error: err6 } = await supabase
            .from('contratar')
            .select('data_criacao, cuidador_id')
            .gte('data_criacao', sixMonthsAgo.toISOString());
        if (err6) throw err6;

        const { data: todosCuidadores, error: err6b } = await supabase
            .from('cuidador')
            .select('usuario_id, ganhos');
        if (err6b) throw err6b;
        const ganhosMap = {};
        todosCuidadores?.forEach(c => {
            ganhosMap[c.usuario_id] = parseFloat(c.ganhos) || 0;
        });

        const performancePorMes = {};
        contratos6Meses?.forEach(ct => {
            const mes = new Date(ct.data_criacao).toISOString().substring(0, 7);
            if (!performancePorMes[mes]) {
                performancePorMes[mes] = { total_consultas: 0, receita: 0 };
            }
            performancePorMes[mes].total_consultas++;
            performancePorMes[mes].receita += ganhosMap[ct.cuidador_id] || 0;
        });
        dashboard.performanceMensal = Object.entries(performancePorMes)
            .map(([mes, dados]) => ({ mes, ...dados }))
            .sort((a, b) => a.mes.localeCompare(b.mes));

        // Distribuição de serviço
        const { data: tiposCuidado, error: err7 } = await supabase
            .from('cuidador')
            .select('tipos_cuidado');
        if (err7) throw err7;
        const distribuicao = {};
        tiposCuidado?.forEach(c => {
            const tipo = c.tipos_cuidado;
            distribuicao[tipo] = (distribuicao[tipo] || 0) + 1;
        });
        dashboard.distribuicaoServico = Object.entries(distribuicao)
            .map(([tipos_cuidado, total]) => ({ tipos_cuidado, total }));

        // Histórico de pagamento (últimos 50)
        const { data: historico, error: err8 } = await supabase
            .from('contratar')
            .select('id, cliente_id, cuidador_id, tipo_contratacao, data_inicio, data_fim, status, data_criacao')
            .order('data_criacao', { ascending: false })
            .limit(50);
        if (err8) throw err8;

        // Buscar dados dos cuidadores para pegar ganhos
        const cuidadorIds = [...new Set(historico?.map(h => h.cuidador_id).filter(Boolean) || [])];
        const { data: cuidadoresHist, error: err8b } = await supabase
            .from('cuidador')
            .select('usuario_id, ganhos')
            .in('usuario_id', cuidadorIds);
        if (err8b) throw err8b;
        const ganhosMapHist = {};
        cuidadoresHist?.forEach(c => {
            ganhosMapHist[c.usuario_id] = parseFloat(c.ganhos) || 0;
        });

        dashboard.historicoPagamento = historico?.map(h => ({
            contrato_id: h.id,
            cliente_id: h.cliente_id,
            cuidador_id: h.cuidador_id,
            tipo_contratacao: h.tipo_contratacao,
            data_inicio: h.data_inicio,
            data_fim: h.data_fim,
            valor: ganhosMapHist[h.cuidador_id] || 0,
            status: h.status
        })) || [];

        // Taxa de conversão
        const { count: totalUsuarios, error: err9 } = await supabase
            .from('usuario')
            .select('*', { count: 'exact', head: true });
        if (err9) throw err9;
        const { data: clientesContrataram, error: err9b } = await supabase
            .from('contratar')
            .select('cliente_id');
        if (err9b) throw err9b;
        const uniqueClientesContrataram = new Set(clientesContrataram?.map(c => c.cliente_id) || []);
        dashboard.taxaConversao = totalUsuarios > 0 
            ? Math.round((uniqueClientesContrataram.size / totalUsuarios) * 100 * 100) / 100 
            : 0;

        // Tempo médio de resposta (query complexa - simplificada)
        // Esta query é muito complexa, pode precisar de RPC no Supabase
        dashboard.tempoMedioResposta = 0; // TODO: Implementar com RPC se necessário

        // Clientes recorrentes
        const { data: contratosPorCliente, error: err10 } = await supabase
            .from('contratar')
            .select('cliente_id');
        if (err10) throw err10;
        const contagemPorCliente = {};
        contratosPorCliente?.forEach(c => {
            contagemPorCliente[c.cliente_id] = (contagemPorCliente[c.cliente_id] || 0) + 1;
        });
        const clientesRecorrentes = Object.values(contagemPorCliente).filter(c => c > 1);
        dashboard.clientesRecorrentes = contratosPorCliente?.length > 0
            ? Math.round((clientesRecorrentes.length / contratosPorCliente.length) * 100 * 100) / 100
            : 0;

        // Receita por hora
        const { data: contratosComCuidador, error: err11 } = await supabase
            .from('contratar')
            .select('cuidador_id');
        if (err11) throw err11;
        const cuidadorIdsReceita = [...new Set(contratosComCuidador?.map(c => c.cuidador_id).filter(Boolean) || [])];
        const { data: cuidadoresReceita, error: err11b } = await supabase
            .from('cuidador')
            .select('usuario_id, valor_hora')
            .in('usuario_id', cuidadorIdsReceita);
        if (err11b) throw err11b;
        const valorHoraMap = {};
        cuidadoresReceita?.forEach(c => {
            valorHoraMap[c.usuario_id] = parseFloat(c.valor_hora) || 0;
        });
        dashboard.receitaPorHora = contratosComCuidador?.reduce((sum, ct) => {
            return sum + (valorHoraMap[ct.cuidador_id] || 0);
        }, 0) || 0;

        return dashboard;

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        throw error;
    }
}

module.exports = { getDashboardData };

