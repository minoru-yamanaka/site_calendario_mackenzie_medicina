// State Management
let appData = {
    eventos: [],
    aulas: [],
    turmas: [],
    professores: [],
    disciplinas: []
};

let state = {
    turmaAtiva: "Todas", // 'Todas' para ver Geral, ou turma específica
    dataReferencia: new Date(2026, 7, 10), // Começa em Agosto de 2026 (Semestre 2026.2)
    busca: "",
    filtrosTipos: {
        estudantes: true,
        professores: true,
        feriados: true
    },
    visaoAtiva: "monthly", // 'monthly' | 'weekly' | 'agenda'
    limiteProfessores: true, // true limita a 10, false mostra todos
    unidadeHoraria: "aulas" // "aulas" | "horas"
};

// Instâncias dos gráficos para limpeza/destruição correta ao atualizar
let chartsInstance = {
    teachers: null,
    courses: null,
    days: null,
    partners: null
};

// Mapeamento de Meses em Português
const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Mapeamento de Nome de Turma para Semestre amigável
function obterNomeExibicaoTurma(turma) {
    if (turma === "Turma 2M" || turma === "2M") return "2° Semestre";
    if (turma === "Turma 4M" || turma === "4M") return "4° Semestre";
    return turma;
}

// Horários estimados dos períodos letivos
const HORARIOS_PERIODOS = {
    "1": "07:30 - 08:20",
    "2": "08:20 - 09:10",
    "3": "09:10 - 10:00",
    "4": "10:20 - 11:10",
    "5": "11:10 - 12:00",
    "6": "12:00 - 12:50",
    "7": "13:30 - 14:20",
    "8": "14:20 - 15:10",
    "9": "15:10 - 16:00",
    "10": "16:20 - 17:10",
    "11": "17:10 - 18:00",
    "12": "18:00 - 18:50"
};

// Elementos do DOM
const elements = {
    classSelector: document.getElementById("class-selector"),
    searchInput: document.getElementById("search-input"),
    clearSearchBtn: document.getElementById("clear-search-btn"),
    searchSuggestions: document.getElementById("search-suggestions"),
    showStudentsEvents: document.getElementById("show-students-events"),
    showTeachersEvents: document.getElementById("show-teachers-events"),
    showHolidays: document.getElementById("show-holidays"),
    
    // Stats
    statsCourses: document.getElementById("stats-courses"),
    statsTeachers: document.getElementById("stats-teachers"),
    statsClasses: document.getElementById("stats-classes"),
    statsAvgClasses: document.getElementById("stats-avg-classes"),
    statsAvgHours: document.getElementById("stats-avg-hours"),
    kpiAvgHours: document.getElementById("kpi-avg-hours"),
    kpiAvgClasses: document.getElementById("kpi-avg-classes"),
    kpiTotalTeachers: document.getElementById("kpi-total-teachers"),
    kpiTotalClasses: document.getElementById("kpi-total-classes"),
    
    // Navigation Tabs
    tabMonthly: document.getElementById("tab-monthly"),
    tabWeekly: document.getElementById("tab-weekly"),
    tabAgenda: document.getElementById("tab-agenda"),
    tabCharts: document.getElementById("tab-charts"),
    
    // Views
    viewMonthly: document.getElementById("view-monthly"),
    viewWeekly: document.getElementById("view-weekly"),
    viewAgenda: document.getElementById("view-agenda"),
    viewCharts: document.getElementById("view-charts"),
    
    // Monthly View elements
    prevMonthBtn: document.getElementById("prev-month-btn"),
    nextMonthBtn: document.getElementById("next-month-btn"),
    currentMonthYear: document.getElementById("current-month-year"),
    calendarDaysContainer: document.getElementById("calendar-days-container"),
    
    // Weekly View elements
    weeklyTableBody: document.getElementById("weekly-table-body"),
    
    // Agenda View elements
    agendaTimelineContainer: document.getElementById("agenda-timeline-container"),
    agendaSearch: document.getElementById("agenda-search"),
    
    // Detail Panel
    detailPanel: document.getElementById("detail-panel"),
    detailPanelBackdrop: document.getElementById("detail-panel-backdrop"),
    detailDateTitle: document.getElementById("detail-date-title"),
    closeDetailBtn: document.getElementById("close-detail-btn"),
    detailPanelBodyContent: document.getElementById("detail-panel-body-content"),
    
    // Theme
    themeToggleBtn: document.getElementById("theme-toggle-btn")
};

// Inicialização da Aplicação
document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    setupEventListeners();
    await carregarDados();
});

// Inicialização do Tema (Light / Dark)
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
}

// Configuração dos Event Listeners do Dashboard
function setupEventListeners() {
    // Alternar Tema
    elements.themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);

        // Se estivermos visualizando gráficos, re-renderizar para ajustar as cores ao novo tema
        if (state.visaoAtiva === "charts") {
            renderizarGraficos();
        }
    });

    // Abas de Navegação (Views)
    const tabs = [elements.tabMonthly, elements.tabWeekly, elements.tabAgenda, elements.tabCharts];
    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            const targetView = e.currentTarget.getAttribute("data-view");
            switchView(targetView);
        });
    });

    // Navegação de Meses no Calendário
    elements.prevMonthBtn.addEventListener("click", () => navegarMes(-1));
    elements.nextMonthBtn.addEventListener("click", () => navegarMes(1));

    // Busca Interativa de Aulas com Autocomplete
    elements.searchInput.addEventListener("input", (e) => {
        state.busca = e.target.value.toLowerCase().trim();
        elements.clearSearchBtn.style.display = state.busca ? "block" : "none";
        renderizarVisaoAtiva();
        atualizarEstatisticas();
        atualizarSugestoes(e.target.value.trim());
    });

    elements.searchInput.addEventListener("focus", (e) => {
        if (e.target.value.trim().length > 0) {
            atualizarSugestoes(e.target.value.trim());
        }
    });

    elements.searchInput.addEventListener("keydown", (e) => {
        if (elements.searchSuggestions && elements.searchSuggestions.style.display === "block") {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                moverFocoTeclado(1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moverFocoTeclado(-1);
            } else if (e.key === "Enter") {
                if (sugestaoFocadaIndex >= 0 && sugestaoFocadaIndex < sugestoesAtuais.length) {
                    e.preventDefault();
                    selecionarSugestao(sugestoesAtuais[sugestaoFocadaIndex].valor);
                }
            } else if (e.key === "Escape") {
                fecharSugestoes();
            }
        }
    });

    // Limpar Busca
    elements.clearSearchBtn.addEventListener("click", () => {
        elements.searchInput.value = "";
        state.busca = "";
        elements.clearSearchBtn.style.display = "none";
        fecharSugestoes();
        renderizarVisaoAtiva();
        atualizarEstatisticas();
    });

    // Fechar sugestões ao clicar fora do campo de busca
    document.addEventListener("click", (e) => {
        if (elements.searchSuggestions && 
            !elements.searchInput.contains(e.target) && 
            !elements.searchSuggestions.contains(e.target)) {
            fecharSugestoes();
        }
    });

    // Filtros de Evento
    const checkboxes = [elements.showStudentsEvents, elements.showTeachersEvents, elements.showHolidays];
    checkboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            state.filtrosTipos.estudantes = elements.showStudentsEvents.checked;
            state.filtrosTipos.professores = elements.showTeachersEvents.checked;
            state.filtrosTipos.feriados = elements.showHolidays.checked;
            renderizarVisaoAtiva();
        });
    });

    // Busca na Agenda/Linha do tempo
    elements.agendaSearch.addEventListener("input", (e) => {
        renderizarAgenda(e.target.value.toLowerCase().trim());
    });

    // Fechar Detalhes Lateral
    elements.closeDetailBtn.addEventListener("click", fecharDetalhes);
    elements.detailPanelBackdrop.addEventListener("click", fecharDetalhes);

    // Fechar ao pressionar ESC
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            fecharDetalhes();
        }
    });

    // Alternar Limite de Professores no Gráfico
    const toggleLimitBtn = document.getElementById("toggle-teachers-limit-btn");
    if (toggleLimitBtn) {
        toggleLimitBtn.addEventListener("click", (e) => {
            state.limiteProfessores = !state.limiteProfessores;
            e.target.textContent = state.limiteProfessores ? "Ver Todos" : "Ver Top 10";
            
            // Ajustar a altura do contêiner para comportar todas as barras sem amassar
            const container = document.getElementById("teachers-chart-container");
            if (container) {
                container.style.height = state.limiteProfessores ? "300px" : "650px";
            }
            
        });
    }

    // Alternar Unidade Horária no Gráfico (Aulas vs Horas)
    const unitAulasBtn = document.getElementById("unit-aulas-btn");
    const unitHorasBtn = document.getElementById("unit-horas-btn");
    
    if (unitAulasBtn && unitHorasBtn) {
        unitAulasBtn.addEventListener("click", () => {
            if (state.unidadeHoraria === "aulas") return;
            state.unidadeHoraria = "aulas";
            unitAulasBtn.classList.add("active");
            unitHorasBtn.classList.remove("active");
            renderizarGraficos();
        });
        
        unitHorasBtn.addEventListener("click", () => {
            if (state.unidadeHoraria === "horas") return;
            state.unidadeHoraria = "horas";
            unitHorasBtn.classList.add("active");
            unitAulasBtn.classList.remove("active");
            renderizarGraficos();
        });
    }
}

// Carrega os dados do arquivo JSON local
async function carregarDados() {
    try {
        const response = await fetch("dados_calendario.json");
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        appData = await response.json();
        
        // Define turma padrão
        if (appData.turmas && appData.turmas.length > 0) {
            state.turmaAtiva = "Todas";
            criarBotoesTurma();
            renderizarVisaoAtiva();
            atualizarEstatisticas();
        } else {
            console.error("Nenhuma turma encontrada nos dados.");
        }
    } catch (error) {
        console.error("Erro ao carregar dados do calendário:", error);
        elements.calendarDaysContainer.innerHTML = `
            <div class="weekly-cell-empty" style="grid-column: span 7; padding: 3rem; text-align: center;">
                <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">Erro ao carregar os dados das escalas.</p>
                <p style="color: var(--text-secondary);">Certifique-se de que o arquivo <code>dados_calendario.json</code> foi gerado e o site está rodando a partir de um servidor local.</p>
            </div>
        `;
    }
}

// Cria os botões de seleção de Turma de forma dinâmica
function criarBotoesTurma() {
    elements.classSelector.innerHTML = "";
    
    // Botão Geral / Todas as turmas
    const btnGeral = document.createElement("button");
    btnGeral.className = `class-btn ${state.turmaAtiva === "Todas" ? "active" : ""}`;
    btnGeral.textContent = "Geral";
    btnGeral.addEventListener("click", () => {
        document.querySelectorAll(".class-btn").forEach(b => b.classList.remove("active"));
        btnGeral.classList.add("active");
        state.turmaAtiva = "Todas";
        renderizarVisaoAtiva();
        atualizarEstatisticas();
    });
    elements.classSelector.appendChild(btnGeral);

    // Botões das turmas individuais
    appData.turmas.forEach(turma => {
        const btn = document.createElement("button");
        btn.className = `class-btn ${turma === state.turmaAtiva ? "active" : ""}`;
        btn.textContent = obterNomeExibicaoTurma(turma);
        btn.addEventListener("click", () => {
            document.querySelectorAll(".class-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.turmaAtiva = turma;
            renderizarVisaoAtiva();
            atualizarEstatisticas();
        });
        elements.classSelector.appendChild(btn);
    });
}

// Controla a troca de abas (mensal, semanal, cronograma)
function switchView(viewName) {
    state.visaoAtiva = viewName;
    
    // Atualiza classes dos botões das abas
    const tabs = [elements.tabMonthly, elements.tabWeekly, elements.tabAgenda, elements.tabCharts];
    tabs.forEach(tab => {
        if (tab && tab.getAttribute("data-view") === viewName) {
            tab.classList.add("active");
        } else if (tab) {
            tab.classList.remove("active");
        }
    });

    // Exibe a seção de visualização correspondente
    const views = [elements.viewMonthly, elements.viewWeekly, elements.viewAgenda, elements.viewCharts];
    views.forEach(view => {
        if (view && view.id === `view-${viewName}`) {
            view.classList.add("active");
        } else if (view) {
            view.classList.remove("active");
        }
    });

    renderizarVisaoAtiva();
}

// Renderiza a visão que estiver atualmente selecionada
function renderizarVisaoAtiva() {
    if (state.visaoAtiva === "monthly") {
        renderizarCalendarioMensal();
    } else if (state.visaoAtiva === "weekly") {
        renderizarGradeSemanal();
    } else if (state.visaoAtiva === "agenda") {
        renderizarAgenda();
    } else if (state.visaoAtiva === "charts") {
        renderizarGraficos();
    }
}

// Atualiza o painel de estatísticas rápidas na lateral e o painel de KPIs de métricas
function atualizarEstatisticas() {
    const aulasFiltradas = appData.aulas.filter(aula => {
        const matchTurma = state.turmaAtiva === "Todas" || aula.turma === state.turmaAtiva;
        const matchBusca = !state.busca || 
            aula.disciplina.toLowerCase().includes(state.busca) || 
            aula.professor.toLowerCase().includes(state.busca);
        
        // Ignora a Área Verde das estatísticas e da carga média
        const isAreaVerde = aula.disciplina === "AREA VERDE" || aula.professor === "ÁREA VERDE";
        return matchTurma && matchBusca && !isAreaVerde;
    });

    const disciplinasUnicas = new Set(aulasFiltradas.map(a => a.disciplina));
    
    // Filtra apenas aulas com professor atribuído válido
    const aulasComProfAtivo = aulasFiltradas.filter(a => a.professor && a.professor !== "Novo Professor");
    const professoresUnicos = new Set(aulasComProfAtivo.map(a => a.professor.split("-")[0].trim()));

    // Atualiza estatísticas rápidas do semestre/busca
    elements.statsCourses.textContent = disciplinasUnicas.size;
    elements.statsTeachers.textContent = professoresUnicos.size;
    elements.statsClasses.textContent = aulasFiltradas.length;

    // Calcular Carga Média do Filtro Ativo
    let mediaAulasAtiva = 0;
    let mediaHorasAtiva = 0;
    if (professoresUnicos.size > 0) {
        mediaAulasAtiva = aulasComProfAtivo.length / professoresUnicos.size;
        mediaHorasAtiva = mediaAulasAtiva * 50 / 60; // 50 min de período escolar
    }

    // Exibir carga média na barra lateral
    if (elements.statsAvgClasses) {
        elements.statsAvgClasses.textContent = mediaAulasAtiva.toFixed(1);
    }
    if (elements.statsAvgHours) {
        elements.statsAvgHours.textContent = mediaHorasAtiva.toFixed(1) + "h";
    }

    // Atualizar painel de KPI na aba de gráficos
    if (elements.kpiAvgHours && elements.kpiAvgClasses && elements.kpiTotalTeachers && elements.kpiTotalClasses) {
        elements.kpiAvgHours.textContent = mediaHorasAtiva.toFixed(1) + " horas";
        elements.kpiAvgClasses.textContent = `${mediaAulasAtiva.toFixed(1)} aulas / períodos semanais (50min)`;
        
        elements.kpiTotalTeachers.textContent = `${professoresUnicos.size} professor${professoresUnicos.size !== 1 ? 'es' : ''}`;
        elements.kpiTotalClasses.textContent = `${aulasFiltradas.length} aula${aulasFiltradas.length !== 1 ? 's' : ''} no filtro ativo`;

        // Se estiver selecionado um semestre específico, exibe a comparação com a média geral do Mackenzie
        if (state.turmaAtiva !== "Todas") {
            const aulasGeralValidas = appData.aulas.filter(a => 
                a.professor && 
                a.professor !== "Novo Professor" && 
                a.professor !== "ÁREA VERDE" && 
                a.disciplina !== "AREA VERDE"
            );
            const profsGeralUnicos = new Set(aulasGeralValidas.map(a => a.professor.split("-")[0].trim()));
            let mediaAulasGeral = 0;
            let mediaHorasGeral = 0;
            if (profsGeralUnicos.size > 0) {
                mediaAulasGeral = aulasGeralValidas.length / profsGeralUnicos.size;
                mediaHorasGeral = mediaAulasGeral * 50 / 60;
            }

            elements.kpiAvgClasses.innerHTML = `${mediaAulasAtiva.toFixed(1)} aulas/semana <span style="color: var(--text-muted); font-size: 0.72rem; margin-left: 0.5rem;">(Média Geral: ${mediaAulasGeral.toFixed(1)})</span>`;
            elements.kpiAvgHours.innerHTML = `${mediaHorasAtiva.toFixed(1)} horas <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: normal; margin-left: 0.5rem;">(Média Geral: ${mediaHorasGeral.toFixed(1)}h)</span>`;
        }
    }

    atualizarParceirosProfessor();
}

// Atualiza a lista de professores parceiros que dividem disciplinas com o professor selecionado
function atualizarParceirosProfessor() {
    const card = document.getElementById("partners-card");
    const container = document.getElementById("partners-list-container");
    const nameSpan = document.getElementById("partner-prof-name");
    
    if (!card || !container || !nameSpan) return;

    if (!state.busca) {
        card.style.display = "none";
        return;
    }

    const termoBusca = state.busca.trim().toLowerCase();
    
    // Tenta encontrar o professor correspondente na lista de aulas
    const aulaProf = appData.aulas.find(a => a.professor && a.professor.toLowerCase().includes(termoBusca));
    
    if (!aulaProf) {
        card.style.display = "none";
        return;
    }

    const nomeProfSelecionado = aulaProf.professor;
    nameSpan.textContent = nomeProfSelecionado.split("-")[0].trim();

    // 1. Identificar as disciplinas lecionadas por este professor
    const disciplinasDoProf = new Set(
        appData.aulas
            .filter(a => a.professor === nomeProfSelecionado)
            .map(a => a.disciplina)
    );

    // 2. Identificar outros professores que lecionam qualquer uma dessas disciplinas e contar as aulas
    const parceirosMap = {}; // nome -> { disciplinas: Set, aulasCont: number }
    appData.aulas.forEach(a => {
        if (disciplinasDoProf.has(a.disciplina) && a.professor && a.professor !== nomeProfSelecionado && a.professor !== "Novo Professor") {
            const nomeParceiro = a.professor.split("-")[0].trim();
            const nomeDisciplina = a.disciplina.split("-")[0].trim();
            
            if (!parceirosMap[nomeParceiro]) {
                parceirosMap[nomeParceiro] = {
                    disciplinas: new Set(),
                    aulasCont: 0
                };
            }
            parceirosMap[nomeParceiro].disciplinas.add(nomeDisciplina);
            parceirosMap[nomeParceiro].aulasCont++;
        }
    });

    // 3. Renderizar a lista de parceiros ordenada pela quantidade de aulas em comum
    container.innerHTML = "";
    const parceirosArray = Object.entries(parceirosMap).map(([nome, info]) => ({
        nome,
        disciplinas: Array.from(info.disciplinas).join(", "),
        aulasCont: info.aulasCont
    })).sort((a, b) => b.aulasCont - a.aulasCont);

    if (parceirosArray.length === 0) {
        container.innerHTML = `<div class="weekly-cell-empty" style="font-size: 0.72rem; padding: 0.75rem 0; text-align: center; color: var(--text-muted);">Leciona suas disciplinas individualmente.</div>`;
    } else {
        parceirosArray.forEach(p => {
            const item = document.createElement("div");
            item.className = "partner-item";
            item.title = `Clique para filtrar as aulas de ${p.nome}`;
            item.innerHTML = `
                <div class="partner-name">
                    <span>${p.nome}</span>
                    <span class="partner-count">${p.aulasCont} aula${p.aulasCont > 1 ? 's' : ''}</span>
                </div>
                <div class="partner-disciplines">${p.disciplinas}</div>
            `;
            
            // Ao clicar no parceiro, muda o filtro do dashboard para ele!
            item.addEventListener("click", () => {
                elements.searchInput.value = p.nome;
                state.busca = p.nome.toLowerCase();
                elements.clearSearchBtn.style.display = "block";
                renderizarVisaoAtiva();
                atualizarEstatisticas();
            });
            
            container.appendChild(item);
        });
    }

    card.style.display = "block";
}

// Navegação de meses (Anterior / Próximo)
function navegarMes(passo) {
    const ano = state.dataReferencia.getFullYear();
    const mes = state.dataReferencia.getMonth();
    state.dataReferencia = new Date(ano, mes + passo, 1);
    renderizarCalendarioMensal();
}

// Helper para converter data YYYY-MM-DD para Date em fuso local sem problemas de timezone UTC
function parseLocalDate(dateStr) {
    const parts = dateStr.split("-");
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// Formatar data em string compacta (DD/MM)
function formatDayMonth(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
}

// Verifica se duas datas caem no mesmo dia
function mesmoDia(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// Obtém os eventos e feriados de um dia específico
function obterEventosDia(data) {
    return appData.eventos.filter(ev => {
        const inicio = parseLocalDate(ev.data_inicio);
        const fim = parseLocalDate(ev.data_fim);
        
        // Zera as horas para comparação pura
        inicio.setHours(0,0,0,0);
        fim.setHours(0,0,0,0);
        
        const ref = new Date(data);
        ref.setHours(0,0,0,0);

        const matchDate = ref >= inicio && ref <= fim;
        if (!matchDate) return false;

        // Filtragem por checkbox ativo
        if (ev.tipo === "feriado" && !state.filtrosTipos.feriados) return false;
        if (ev.tipo === "evento") {
            if (ev.grupo === "Estudantes" && !state.filtrosTipos.estudantes) return false;
            if (ev.grupo === "Professores" && !state.filtrosTipos.professores) return false;
        }
        
        return true;
    });
}

// Obtém as aulas semanais de um dia específico (baseado no dia da semana)
function obterAulasDiaSemana(data) {
    const diaSemanaNum = data.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    
    // Se for sábado ou domingo, não tem aula normal recorrente
    if (diaSemanaNum === 0 || diaSemanaNum === 6) {
        return [];
    }

    return appData.aulas.filter(aula => {
        const matchTurma = state.turmaAtiva === "Todas" || aula.turma === state.turmaAtiva;
        const matchDia = aula.dia_semana === diaSemanaNum;
        const matchBusca = !state.busca || 
            aula.disciplina.toLowerCase().includes(state.busca) || 
            aula.professor.toLowerCase().includes(state.busca);
        return matchTurma && matchDia && matchBusca;
    }).sort((a, b) => parseInt(a.periodo) - parseInt(b.periodo));
}

// ==========================================
// 1. RENDERIZAÇÃO DO CALENDÁRIO MENSAL
// ==========================================
function renderizarCalendarioMensal() {
    const ano = state.dataReferencia.getFullYear();
    const mes = state.dataReferencia.getMonth();

    // Rótulo de Cabeçalho do Mês
    elements.currentMonthYear.textContent = `${MESES[mes]} ${ano}`;

    // Limpar dias
    elements.calendarDaysContainer.innerHTML = "";

    // Primeiro dia do mês de referência
    const primeiroDia = new Date(ano, mes, 1);
    // Dia da semana do primeiro dia (0 = Dom, 1 = Seg...)
    const diaSemanaInicial = primeiroDia.getDay();
    // Total de dias no mês
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    // Preencher dias do mês anterior
    const totalDiasMesAnterior = new Date(ano, mes, 0).getDate();
    for (let i = diaSemanaInicial - 1; i >= 0; i--) {
        const diaNum = totalDiasMesAnterior - i;
        const diaEl = document.createElement("div");
        diaEl.className = "calendar-day other-month";
        diaEl.innerHTML = `<span class="calendar-day-num">${diaNum}</span>`;
        elements.calendarDaysContainer.appendChild(diaEl);
    }

    // Preencher dias do mês atual
    const hoje = new Date();
    for (let dia = 1; dia <= totalDias; dia++) {
        const dataDia = new Date(ano, mes, dia);
        const diaEl = document.createElement("div");
        diaEl.className = "calendar-day";
        
        if (mesmoDia(dataDia, hoje)) {
            diaEl.classList.add("today");
        }

        // Criar conteúdo do dia
        const dayHeader = document.createElement("span");
        dayHeader.className = "calendar-day-num";
        dayHeader.textContent = dia;
        diaEl.appendChild(dayHeader);

        // Obter eventos e feriados do dia
        const eventosDia = obterEventosDia(dataDia);
        const feriado = eventosDia.find(e => e.tipo === "feriado");
        
        if (feriado) {
            diaEl.classList.add("has-holiday");
        }

        // Obter aulas recorrentes se não for feriado
        const aulasDia = feriado ? [] : obterAulasDiaSemana(dataDia);

        // Renderizar badges e indicadores
        const badgesContainer = document.createElement("div");
        badgesContainer.className = "day-badges";

        // Adicionar Badges de Feriados ou Eventos (Até 2 no calendário para não quebrar)
        let totalRenderizados = 0;

        eventosDia.forEach(ev => {
            if (totalRenderizados < 2) {
                const badge = document.createElement("span");
                badge.className = `badge-item ${ev.tipo === "feriado" ? "holiday" : ev.grupo.toLowerCase()}`;
                badge.textContent = ev.descricao;
                badge.title = ev.descricao;
                badgesContainer.appendChild(badge);
                totalRenderizados++;
            }
        });

        // Adicionar aulas do dia se não for fim de semana ou feriado
        if (aulasDia.length > 0 && totalRenderizados < 2) {
            const badgeAulas = document.createElement("span");
            badgeAulas.className = "badge-item class-occurrence";
            badgeAulas.textContent = `${aulasDia.length} aula${aulasDia.length > 1 ? 's' : ''}`;
            badgeAulas.title = aulasDia.map(a => `Período ${a.periodo}: ${a.disciplina}`).join('\n');
            badgesContainer.appendChild(badgeAulas);
            totalRenderizados++;
        }

        diaEl.appendChild(badgesContainer);

        // Indicadores visuais discretos para dispositivos móveis
        const indicatorsContainer = document.createElement("div");
        indicatorsContainer.className = "day-indicators";
        indicatorsContainer.style.display = "none"; // Controlado pelo CSS de responsividade, mas criado aqui

        eventosDia.forEach(ev => {
            const ind = document.createElement("div");
            ind.className = `indicator ${ev.tipo === "feriado" ? "holiday" : ev.grupo.toLowerCase()}`;
            indicatorsContainer.appendChild(ind);
        });

        if (aulasDia.length > 0) {
            const ind = document.createElement("div");
            ind.className = "indicator class-occurrence";
            indicatorsContainer.appendChild(ind);
        }
        diaEl.appendChild(indicatorsContainer);

        // Clique no dia abre a barra de detalhes
        diaEl.addEventListener("click", () => abrirDetalhes(dataDia, eventosDia, aulasDia));

        elements.calendarDaysContainer.appendChild(diaEl);
    }

    // Preencher dias do próximo mês para completar o grid de 42 células (6 semanas)
    const celulasTotais = diaSemanaInicial + totalDias;
    const celulasFaltantes = celulasTotais <= 35 ? 35 - celulasTotais : 42 - celulasTotais;
    for (let i = 1; i <= celulasFaltantes; i++) {
        const diaEl = document.createElement("div");
        diaEl.className = "calendar-day other-month";
        diaEl.innerHTML = `<span class="calendar-day-num">${i}</span>`;
        elements.calendarDaysContainer.appendChild(diaEl);
    }
}

// ==========================================
// 2. RENDERIZAÇÃO DA GRADE SEMANAL
// ==========================================
function renderizarGradeSemanal() {
    elements.weeklyTableBody.innerHTML = "";

    // Mapear os períodos relevantes
    const aulasTurma = appData.aulas.filter(a => state.turmaAtiva === "Todas" || a.turma === state.turmaAtiva);
    const periodosSet = new Set(aulasTurma.map(a => a.periodo));
    const periodosOrdenados = Array.from(periodosSet).sort((a, b) => parseInt(a) - parseInt(b));

    if (periodosOrdenados.length === 0) {
        elements.weeklyTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="weekly-cell-empty">
                    Nenhuma escala semanal cadastrada.
                </td>
            </tr>
        `;
        return;
    }

    periodosOrdenados.forEach(periodo => {
        const tr = document.createElement("tr");

        // Coluna Período
        const tdPeriodo = document.createElement("td");
        tdPeriodo.innerHTML = `
            ${periodo}º
            <span class="period-subtitle">${HORARIOS_PERIODOS[periodo] || "Horário"}</span>
        `;
        tr.appendChild(tdPeriodo);

        // Dias da semana (1 a 5 = Seg a Sex)
        for (let dia = 1; dia <= 5; dia++) {
            const tdDia = document.createElement("td");

            // Buscar se há aulas correspondentes
            const aulasFiltradas = appData.aulas.filter(a => {
                const matchTurma = state.turmaAtiva === "Todas" || a.turma === state.turmaAtiva;
                const matchDia = a.dia_semana === dia;
                const matchPeriodo = a.periodo === periodo;
                const matchBusca = !state.busca || 
                    a.disciplina.toLowerCase().includes(state.busca) || 
                    a.professor.toLowerCase().includes(state.busca);
                return matchTurma && matchDia && matchPeriodo && matchBusca;
            });

            if (aulasFiltradas.length > 0) {
                const cellContainer = document.createElement("div");
                cellContainer.style.display = "flex";
                cellContainer.style.flexDirection = "column";
                cellContainer.style.gap = "0.4rem";
                cellContainer.style.height = "100%";

                aulasFiltradas.forEach(aula => {
                    const card = document.createElement("div");
                    card.className = "class-card";
                    
                    const hue = Math.abs(aula.disciplina.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
                    card.style.borderLeftColor = `hsl(${hue}, 70%, 45%)`;

                    const classHeader = state.turmaAtiva === "Todas" 
                        ? `<span class="class-room" style="background-color: var(--primary-light); color: var(--primary-color); font-size: 0.65rem; margin-bottom: 0.25rem;">${obterNomeExibicaoTurma(aula.turma)}</span>`
                        : "";

                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                            ${classHeader}
                            ${aula.sala ? `<span class="class-room">Sala ${aula.sala}</span>` : ""}
                        </div>
                        <div class="class-title" title="${aula.disciplina}">${aula.disciplina}</div>
                        <div class="class-teacher" title="${aula.professor}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${aula.professor.split("-")[0].trim()}
                        </div>
                    `;
                    cellContainer.appendChild(card);
                });
                tdDia.appendChild(cellContainer);
            } else {
                tdDia.innerHTML = `<div class="weekly-cell-empty">-</div>`;
            }
            tr.appendChild(tdDia);
        }

        elements.weeklyTableBody.appendChild(tr);
    });
}

// ==========================================
// 3. RENDERIZAÇÃO DA AGENDA / CRONOGRAMA
// ==========================================
function renderizarAgenda(filtroBusca = "") {
    elements.agendaTimelineContainer.innerHTML = "";

    // Filtrar e ordenar eventos
    let eventosFiltrados = appData.eventos.filter(ev => {
        // Filtragem por checkbox ativo
        if (ev.tipo === "feriado" && !state.filtrosTipos.feriados) return false;
        if (ev.tipo === "evento") {
            if (ev.grupo === "Estudantes" && !state.filtrosTipos.estudantes) return false;
            if (ev.grupo === "Professores" && !state.filtrosTipos.professores) return false;
        }

        // Filtro de Busca por texto
        const texto = ev.descricao.toLowerCase();
        const matchFiltro = !filtroBusca || texto.includes(filtroBusca);
        const matchBuscaGeral = !state.busca || texto.includes(state.busca);

        return matchFiltro && matchBuscaGeral;
    });

    // Ordenar por data de início
    eventosFiltrados.sort((a, b) => parseLocalDate(a.data_inicio) - parseLocalDate(b.data_inicio));

    if (eventosFiltrados.length === 0) {
        elements.agendaTimelineContainer.innerHTML = `
            <div class="weekly-cell-empty" style="padding: 3rem;">
                Nenhum evento acadêmico corresponde aos filtros ativos.
            </div>
        `;
        return;
    }

    // Agrupar eventos por mês
    let ultimoMesGrupo = "";

    eventosFiltrados.forEach(ev => {
        const dataInicio = parseLocalDate(ev.data_inicio);
        const mesAnoGrupo = `${MESES[dataInicio.getMonth()]} ${dataInicio.getFullYear()}`;

        // Se mudou de mês, cria o divisor de cabeçalho do mês
        if (mesAnoGrupo !== ultimoMesGrupo) {
            ultimoMesGrupo = mesAnoGrupo;
            const header = document.createElement("div");
            header.className = "agenda-group-month";
            header.textContent = mesAnoGrupo;
            elements.agendaTimelineContainer.appendChild(header);
        }

        // Criar item da agenda
        const item = document.createElement("div");
        item.className = `agenda-item ${ev.tipo} ${ev.tipo === 'evento' ? ev.grupo.toLowerCase() : ''}`;

        const dataStr = ev.data_inicio === ev.data_fim 
            ? formatDayMonth(dataInicio)
            : `${formatDayMonth(dataInicio)} a ${formatDayMonth(parseLocalDate(ev.data_fim))}`;

        const labelGrupo = ev.tipo === 'feriado' ? 'Feriado/Recesso' : `Calendário ${ev.grupo}`;

        item.innerHTML = `
            <div class="agenda-item-left">
                <span class="agenda-date-badge">${dataStr}</span>
                <span class="agenda-desc">${ev.descricao}</span>
            </div>
            <span class="agenda-type-badge ${ev.tipo === 'feriado' ? 'feriado' : ev.grupo.toLowerCase()}">${labelGrupo}</span>
        `;

        // Permitir clicar no item da agenda para focar no calendário
        item.addEventListener("click", () => {
            state.dataReferencia = new Date(dataInicio);
            switchView("monthly");
            
            // Highlight temporário no dia
            setTimeout(() => {
                const diasCalendar = document.querySelectorAll(".calendar-day");
                diasCalendar.forEach(diaEl => {
                    const num = parseInt(diaEl.querySelector(".calendar-day-num").textContent);
                    if (num === dataInicio.getDate() && !diaEl.classList.contains("other-month")) {
                        diaEl.style.transform = "scale(1.08)";
                        diaEl.style.borderColor = "var(--primary-color)";
                        diaEl.style.boxShadow = "var(--shadow-lg)";
                        diaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        setTimeout(() => {
                            diaEl.style.transform = "";
                            diaEl.style.borderColor = "";
                            diaEl.style.boxShadow = "";
                        }, 2500);
                        
                        // Abre a sidebar de detalhes
                        diaEl.click();
                    }
                });
            }, 300);
        });

        elements.agendaTimelineContainer.appendChild(item);
    });
}

// ==========================================
// 4. DETALHES DO DIA (SIDEBAR / SLIDE OUT)
// ==========================================
function abrirDetalhes(data, eventos, aulas) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dataFormatada = data.toLocaleDateString('pt-BR', options);
    
    // Capitaliza primeira letra do dia da semana
    elements.detailDateTitle.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    
    // Limpar conteúdo
    elements.detailPanelBodyContent.innerHTML = "";

    // 1. Renderizar Seção de Eventos / Feriados do dia
    const secEventos = document.createElement("div");
    secEventos.className = "detail-section";
    secEventos.innerHTML = `<h4>Eventos e Compromissos</h4>`;

    if (eventos.length === 0) {
        secEventos.innerHTML += `<p class="detail-no-data">Nenhum evento institucional ou feriado neste dia.</p>`;
    } else {
        eventos.forEach(ev => {
            const evCard = document.createElement("div");
            evCard.className = `detail-event-card ${ev.tipo} ${ev.tipo === 'evento' ? ev.grupo.toLowerCase() : ''}`;
            
            const tipoLabel = ev.tipo === "feriado" ? "Feriado ou Recesso Letivo" : `Calendário de ${ev.grupo}`;
            
            evCard.innerHTML = `
                <div class="detail-event-title">${ev.descricao}</div>
                <div class="detail-event-type">${tipoLabel}</div>
            `;
            secEventos.appendChild(evCard);
        });
    }
    elements.detailPanelBodyContent.appendChild(secEventos);

    // 2. Renderizar Seção de Grade de Aulas (Recorrentes) do dia
    const secAulas = document.createElement("div");
    secAulas.className = "detail-section";
    const labelTurma = state.turmaAtiva === "Todas" ? "Todos os Semestres" : obterNomeExibicaoTurma(state.turmaAtiva);
    secAulas.innerHTML = `<h4>Aulas - ${labelTurma}</h4>`;

    const feriado = eventos.find(e => e.tipo === "feriado");

    if (feriado) {
        secAulas.innerHTML += `
            <div class="weekly-cell-empty" style="color: var(--holiday-color); border: 1px dashed var(--holiday-color); padding: 1.5rem; border-radius: 8px; font-weight: 500;">
                Aulas suspensas devido ao feriado / recesso letivo: "${feriado.descricao}".
            </div>
        `;
    } else if (data.getDay() === 0 || data.getDay() === 6) {
        secAulas.innerHTML += `<p class="detail-no-data">Fim de semana. Não há aulas programadas.</p>`;
    } else if (aulas.length === 0) {
        secAulas.innerHTML += `<p class="detail-no-data">Nenhuma aula programada ou filtrada para este dia.</p>`;
    } else {
        const classList = document.createElement("div");
        classList.className = "detail-class-list";

        aulas.forEach(aula => {
            const item = document.createElement("div");
            item.className = "detail-class-item";

            // Atribuir cor da matéria
            const hue = Math.abs(aula.disciplina.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
            item.style.borderLeftColor = `hsl(${hue}, 70%, 45%)`;

            const horario = HORARIOS_PERIODOS[aula.periodo] || "Horário Indisponível";

            // Badge da turma
            const badgeTurmaHtml = state.turmaAtiva === "Todas"
                ? `<span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="11" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Semestre: ${obterNomeExibicaoTurma(aula.turma)}
                   </span>`
                : "";

            item.innerHTML = `
                <div class="detail-class-time">
                    ${aula.periodo}º
                    <span>Período</span>
                </div>
                <div class="detail-class-info">
                    <div class="detail-class-name">${aula.disciplina}</div>
                    <div class="detail-class-meta">
                        ${badgeTurmaHtml}
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${aula.professor}
                        </span>
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /></svg>
                            Sala/Local: ${aula.sala || "Não especificada"}
                        </span>
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            Horário: ${horario}
                        </span>
                    </div>
                </div>
            `;
            classList.appendChild(item);
        });
        secAulas.appendChild(classList);
    }
    elements.detailPanelBodyContent.appendChild(secAulas);

    // Abrir painel com transição de slide-in
    elements.detailPanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // Desativa scroll na página atrás do painel
}

// Fecha o painel de detalhes lateral
function fecharDetalhes() {
    elements.detailPanel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // Reativa scroll
}

// Renderiza a página dedicada de gráficos estatísticos usando Chart.js
function renderizarGraficos() {
    // 1. Obter dados filtrados ativos
    const aulasFiltradas = appData.aulas.filter(aula => {
        const matchTurma = state.turmaAtiva === "Todas" || aula.turma === state.turmaAtiva;
        const matchBusca = !state.busca || 
            aula.disciplina.toLowerCase().includes(state.busca) || 
            aula.professor.toLowerCase().includes(state.busca);
        
        // Ignora a Área Verde de todos os gráficos
        const isAreaVerde = aula.disciplina === "AREA VERDE" || aula.professor === "ÁREA VERDE";
        return matchTurma && matchBusca && !isAreaVerde;
    });

    // Atualizar título do gráfico de disciplinas com base no filtro de professor
    const discTitle = document.getElementById("disciplines-chart-title");
    if (discTitle) {
        if (state.busca) {
            const termoBusca = state.busca.trim();
            const matchesProf = appData.aulas.some(a => a.professor && a.professor.toLowerCase().includes(termoBusca));
            if (matchesProf) {
                const aulaProf = appData.aulas.find(a => a.professor && a.professor.toLowerCase().includes(termoBusca));
                const nomeProfCompleto = aulaProf.professor.split("-")[0].trim();
                discTitle.textContent = `Aulas Semanais por Disciplina (${nomeProfCompleto})`;
            } else {
                discTitle.textContent = `Aulas Semanais por Disciplina (${termoBusca})`;
            }
        } else {
            discTitle.textContent = "Aulas Semanais por Disciplina";
        }
    }

    // Atualizar título do gráfico de professores com base no filtro de disciplina
    const teachersTitle = document.getElementById("teachers-chart-title");
    if (teachersTitle) {
        const labelUnidade = state.unidadeHoraria === "horas" ? "Horas Semanais" : "Aulas Semanais";
        if (state.busca) {
            const termoBusca = state.busca.trim();
            // Verifica se o termo de busca corresponde a uma disciplina nos dados
            const matchesDisc = appData.aulas.some(a => a.disciplina && a.disciplina.toLowerCase().includes(termoBusca));
            if (matchesDisc) {
                const aulaDisc = appData.aulas.find(a => a.disciplina && a.disciplina.toLowerCase().includes(termoBusca));
                const nomeDiscCompleto = aulaDisc.disciplina.split("-")[0].trim();
                teachersTitle.textContent = `${labelUnidade} por Professor (Disciplina: ${nomeDiscCompleto})`;
            } else {
                teachersTitle.textContent = `${labelUnidade} por Professor`;
            }
        } else {
            teachersTitle.textContent = `${labelUnidade} por Professor`;
        }
    }

    // Atualizar legendas do Farol baseadas na unidade horária
    const farolHigh = document.getElementById("farol-leg-high");
    const farolMedium = document.getElementById("farol-leg-medium");
    const farolLow = document.getElementById("farol-leg-low");
    if (farolHigh && farolMedium && farolLow) {
        if (state.unidadeHoraria === "horas") {
            farolHigh.innerHTML = `<span class="legend-dot status-high"></span> Alto (&ge; 10.0 h)`;
            farolMedium.innerHTML = `<span class="legend-dot status-medium"></span> Médio (5.0 a 9.9 h)`;
            farolLow.innerHTML = `<span class="legend-dot status-low"></span> Baixo (&le; 4.9 h)`;
        } else {
            farolHigh.innerHTML = `<span class="legend-dot status-high"></span> Alto (&ge; 12 aulas)`;
            farolMedium.innerHTML = `<span class="legend-dot status-medium"></span> Médio (6 a 11 aulas)`;
            farolLow.innerHTML = `<span class="legend-dot status-low"></span> Baixo (&le; 5 aulas)`;
        }
    }

    // 2. Agregação - Professores (Top 10)
    const profCont = {};
    aulasFiltradas.forEach(a => {
        if (a.professor && a.professor !== "Novo Professor") {
            const nome = a.professor.split("-")[0].trim();
            profCont[nome] = (profCont[nome] || 0) + 1;
        }
    });
    const topProfs = state.limiteProfessores
        ? Object.entries(profCont).map(([name, val]) => ({ name, val })).sort((a, b) => b.val - a.val).slice(0, 10)
        : Object.entries(profCont).map(([name, val]) => ({ name, val })).sort((a, b) => b.val - a.val);

    // 3. Agregação - Disciplinas (Top 8)
    const discCont = {};
    aulasFiltradas.forEach(a => {
        if (a.disciplina) {
            // Simplifica o nome da disciplina cortando o código
            const nome = a.disciplina.split("-")[0].trim();
            discCont[nome] = (discCont[nome] || 0) + 1;
        }
    });
    const topDiscs = Object.entries(discCont)
        .map(([name, val]) => ({ name, val }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 8);

    // 4. Agregação - Professores Únicos por Dia da Semana
    const professoresPorDia = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
    aulasFiltradas.forEach(a => {
        if (a.dia_semana >= 1 && a.dia_semana <= 5 && a.professor && a.professor !== "Novo Professor") {
            const nomeProf = a.professor.split("-")[0].trim();
            professoresPorDia[a.dia_semana].add(nomeProf);
        }
    });
    // 6. Configurações de Design e Cores dependendo do Tema Ativo
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const textColor = isDark ? "#e5e7eb" : "#1f2937";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
    const primaryColor = isDark ? "#e51b23" : "#cc1414";
    const accentColor = isDark ? "#3b82f6" : "#2563eb";
    const colorsPalette = [
        "#e51b23", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
        "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#2563eb"
    ];

    // Destruir gráficos anteriores para evitar sobreposição ao renderizar novamente
    if (chartsInstance.teachers) chartsInstance.teachers.destroy();
    if (chartsInstance.courses) chartsInstance.courses.destroy();
    if (chartsInstance.days) chartsInstance.days.destroy();
    if (chartsInstance.partners) chartsInstance.partners.destroy();

    // Opções Globais de Configuração dos Gráficos
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: textColor,
                    font: { family: 'Inter', size: 11 }
                }
            }
        },
        scales: {
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { family: 'Inter' } }
            },
            y: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { family: 'Inter' } }
            }
        }
    };

    // --- GRÁFICO 1: Professores Mais Alocados (Barras Horizontais) ---
    const containerTeachers = document.getElementById("teachers-chart-container");
    if (containerTeachers) {
        containerTeachers.innerHTML = '<canvas id="chart-teachers"></canvas>';
    }
    const ctxTeachers = document.getElementById("chart-teachers");
    if (ctxTeachers && topProfs.length > 0) {
        chartsInstance.teachers = new Chart(ctxTeachers, {
            type: 'bar',
            data: {
                labels: topProfs.map(p => p.name),
                datasets: [{
                    label: state.unidadeHoraria === "horas" ? 'Horas de Aula (Relógio)' : 'Aulas Semanais',
                    data: topProfs.map(p => {
                        return state.unidadeHoraria === "horas" 
                            ? Math.round((p.val * 50 / 60) * 10) / 10 
                            : p.val;
                    }),
                    backgroundColor: topProfs.map(p => {
                        if (p.val >= 12) return 'rgba(239, 68, 68, 0.8)';  // Vermelho
                        if (p.val >= 6) return 'rgba(245, 158, 11, 0.8)';   // Amarelo
                        return 'rgba(16, 185, 129, 0.8)';    // Verde
                    }),
                    borderColor: topProfs.map(p => {
                        if (p.val >= 12) return '#ef4444';
                        if (p.val >= 6) return '#f59e0b';
                        return '#10b981';
                    }),
                    borderRadius: 5,
                    borderWidth: 1
                }]
            },
            options: {
                ...chartOptions,
                indexAxis: 'y', // Faz a barra ser horizontal
                plugins: {
                    legend: { display: false }, // Oculta legenda redundante
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw;
                                const unidade = state.unidadeHoraria === "horas" ? " h" : " períodos/aulas";
                                return `Carga horária: ${val}${unidade}`;
                            }
                        }
                    }
                },
                onClick: (event, elementsArray) => {
                    if (elementsArray.length > 0) {
                        const index = elementsArray[0].index;
                        const professorSelecionado = topProfs[index].name;
                        const profLower = professorSelecionado.toLowerCase();
                        
                        if (state.busca === profLower) {
                            // Se clicou no professor já selecionado, desfaz a busca
                            elements.searchInput.value = "";
                            state.busca = "";
                            elements.clearSearchBtn.style.display = "none";
                        } else {
                            // Seleciona o novo professor clicado
                            elements.searchInput.value = professorSelecionado;
                            state.busca = profLower;
                            elements.clearSearchBtn.style.display = "block";
                        }
                    } else {
                        // Se clicar fora de qualquer barra, limpa a seleção
                        if (state.busca) {
                            elements.searchInput.value = "";
                            state.busca = "";
                            elements.clearSearchBtn.style.display = "none";
                        }
                    }
                    
                    // Renderiza e atualiza estatísticas e gráficos
                    renderizarVisaoAtiva();
                    atualizarEstatisticas();
                }
            }
        });
    }

    // --- GRÁFICO 2: Distribuição de Disciplinas (Doughnut / Rosca) ---
    const containerCourses = document.getElementById("courses-chart-container");
    if (containerCourses) {
        containerCourses.innerHTML = '<canvas id="chart-courses"></canvas>';
    }
    const ctxCourses = document.getElementById("chart-courses");
    if (ctxCourses && topDiscs.length > 0) {
        chartsInstance.courses = new Chart(ctxCourses, {
            type: 'doughnut',
            data: {
                labels: topDiscs.map(d => d.name),
                datasets: [{
                    data: topDiscs.map(d => d.val),
                    backgroundColor: colorsPalette.slice(0, topDiscs.length),
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? "#141620" : "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: { family: 'Inter', size: 10 },
                            boxWidth: 12
                        }
                    }
                },
                onClick: (event, elementsArray) => {
                    if (elementsArray.length > 0) {
                        const index = elementsArray[0].index;
                        const disciplinaSelecionada = topDiscs[index].name;
                        const discLower = disciplinaSelecionada.toLowerCase();
                        
                        if (state.busca === discLower) {
                            // Se clicou na disciplina já selecionada, desfaz o filtro
                            elements.searchInput.value = "";
                            state.busca = "";
                            elements.clearSearchBtn.style.display = "none";
                        } else {
                            // Filtra pela disciplina clicada
                            elements.searchInput.value = disciplinaSelecionada;
                            state.busca = discLower;
                            elements.clearSearchBtn.style.display = "block";
                        }
                    } else {
                        // Se clicar fora de qualquer fatia, limpa a seleção
                        if (state.busca) {
                            elements.searchInput.value = "";
                            state.busca = "";
                            elements.clearSearchBtn.style.display = "none";
                        }
                    }
                    
                    // Renderiza e atualiza estatísticas e gráficos
                    renderizarVisaoAtiva();
                    atualizarEstatisticas();
                }
            }
        });
    }

    // --- GRÁFICO 3: Distribuição de Professores por Dia (Barras Verticais) ---
    const containerDays = document.getElementById("days-chart-container");
    if (containerDays) {
        containerDays.innerHTML = '<canvas id="chart-days"></canvas>';
    }
    const ctxDays = document.getElementById("chart-days");
    if (ctxDays) {
        chartsInstance.days = new Chart(ctxDays, {
            type: 'bar',
            data: {
                labels: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"],
                datasets: [{
                    label: 'Professores em Atividade',
                    data: [
                        professoresPorDia[1].size,
                        professoresPorDia[2].size,
                        professoresPorDia[3].size,
                        professoresPorDia[4].size,
                        professoresPorDia[5].size
                    ],
                    backgroundColor: accentColor,
                    borderRadius: 6,
                    barPercentage: 0.5
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    ...chartOptions.scales,
                    y: {
                        ...chartOptions.scales.y,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 2,
                            color: textColor
                        }
                    }
                }
            }
        });
    }

    // --- GRÁFICO DE COLEGAS DE PARCERIA (Se houver professor selecionado no filtro de busca) ---
    const partnerCard = document.getElementById("partner-chart-card");
    const partnerNameSpan = document.getElementById("partner-chart-prof-name");
    
    if (partnerCard && partnerNameSpan) {
        let matchesProf = false;
        let nomeProfSelecionado = "";
        
        if (state.busca) {
            const termoBusca = state.busca.trim().toLowerCase();
            const aulaProf = appData.aulas.find(a => a.professor && a.professor.toLowerCase().includes(termoBusca));
            if (aulaProf) {
                matchesProf = true;
                nomeProfSelecionado = aulaProf.professor;
            }
        }
        
        if (matchesProf && nomeProfSelecionado) {
            // 1. Identificar disciplinas do professor selecionado
            const disciplinasDoProf = new Set(
                appData.aulas
                    .filter(a => a.professor === nomeProfSelecionado)
                    .map(a => a.disciplina)
            );
            
            // 2. Identificar outros professores e contar aulas em comum nas disciplinas compartilhadas
            const parceirosMap = {};
            appData.aulas.forEach(a => {
                if (disciplinasDoProf.has(a.disciplina) && a.professor && a.professor !== nomeProfSelecionado && a.professor !== "Novo Professor") {
                    const nomeParceiro = a.professor.split("-")[0].trim();
                    const nomeDisciplina = a.disciplina.split("-")[0].trim();
                    
                    if (!parceirosMap[nomeParceiro]) {
                        parceirosMap[nomeParceiro] = {
                            disciplinas: new Set(),
                            aulasCont: 0
                        };
                    }
                    parceirosMap[nomeParceiro].disciplinas.add(nomeDisciplina);
                    parceirosMap[nomeParceiro].aulasCont++;
                }
            });
            
            const parceirosArray = Object.entries(parceirosMap).map(([nome, info]) => ({
                nome,
                aulasCont: info.aulasCont
            })).sort((a, b) => b.aulasCont - a.aulasCont);
            
            if (parceirosArray.length > 0) {
                partnerNameSpan.textContent = nomeProfSelecionado.split("-")[0].trim();
                partnerCard.style.display = "block";
                
                const containerPartners = document.getElementById("partners-chart-container");
                if (containerPartners) {
                    containerPartners.innerHTML = '<canvas id="chart-partners"></canvas>';
                }
                const ctxPartners = document.getElementById("chart-partners");
                if (ctxPartners) {
                    chartsInstance.partners = new Chart(ctxPartners, {
                        type: 'bar',
                        data: {
                            labels: parceirosArray.map(p => p.nome),
                            datasets: [{
                                label: 'Aulas em Comum',
                                data: parceirosArray.map(p => p.aulasCont),
                                backgroundColor: 'rgba(59, 130, 246, 0.8)', // Azul estilizado para diferenciar
                                borderColor: accentColor,
                                borderWidth: 1,
                                borderRadius: 5
                            }]
                        },
                        options: {
                            ...chartOptions,
                            indexAxis: 'y', // Barra horizontal para legibilidade dos nomes dos professores
                            plugins: {
                                legend: { display: false }
                            },
                            onClick: (event, elementsArray) => {
                                if (elementsArray.length > 0) {
                                    const index = elementsArray[0].index;
                                    const professorSelecionadoNome = parceirosArray[index].nome;
                                    const profLower = professorSelecionadoNome.toLowerCase();
                                    
                                    // Filtra por esse novo professor ao clicar na barra dele!
                                    elements.searchInput.value = professorSelecionadoNome;
                                    state.busca = profLower;
                                    elements.clearSearchBtn.style.display = "block";
                                    
                                    renderizarVisaoAtiva();
                                    atualizarEstatisticas();
                                }
                            },
                            scales: {
                                ...chartOptions.scales,
                                x: {
                                    ...chartOptions.scales.x,
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1,
                                        color: textColor
                                    }
                                }
                            }
                        }
                    });
                }
            } else {
                partnerCard.style.display = "none";
            }
        } else {
            partnerCard.style.display = "none";
        }
    }
}

// ==========================================
// 5. AUTOCOMPLETE DA BUSCA
// ==========================================
let sugestaoFocadaIndex = -1;
let sugestoesAtuais = []; // Array de { tipo: 'professor'|'disciplina', valor: string }

function fecharSugestoes() {
    if (elements.searchSuggestions) {
        elements.searchSuggestions.style.display = "none";
        elements.searchSuggestions.innerHTML = "";
    }
    sugestaoFocadaIndex = -1;
    sugestoesAtuais = [];
}

function destacarTermo(texto, termo) {
    if (!termo) return texto;
    const index = texto.toLowerCase().indexOf(termo.toLowerCase());
    if (index === -1) return texto;
    const substringOriginal = texto.substring(index, index + termo.length);
    return texto.substring(0, index) + `<span class="suggestion-highlight">${substringOriginal}</span>` + texto.substring(index + termo.length);
}

function atualizarSugestoes(termo) {
    if (!termo) {
        fecharSugestoes();
        return;
    }

    // 1. Coleta dados com base no semestre ativo
    const aulasSemestre = appData.aulas.filter(a => state.turmaAtiva === "Todas" || a.turma === state.turmaAtiva);
    
    // Coleta professores únicos e válidos
    const profsValidos = Array.from(new Set(
        aulasSemestre
            .map(a => a.professor)
            .filter(p => p && p !== "Novo Professor" && p !== "ÁREA VERDE")
    )).map(p => p.split("-")[0].trim());
    
    // Coleta disciplinas únicas
    const disciplinasValidas = Array.from(new Set(
        aulasSemestre
            .map(a => a.disciplina)
            .filter(d => d && d !== "AREA VERDE")
    )).map(d => d.split("-")[0].trim());

    // 2. Filtra pelas que coincidem com o termo
    const termoMin = termo.toLowerCase();
    const profsFiltrados = profsValidos
        .filter(p => p.toLowerCase().includes(termoMin))
        .sort()
        .slice(0, 5);
        
    const discsFiltradas = disciplinasValidas
        .filter(d => d.toLowerCase().includes(termoMin))
        .sort()
        .slice(0, 5);

    if (profsFiltrados.length === 0 && discsFiltradas.length === 0) {
        fecharSugestoes();
        return;
    }

    // 3. Monta o array de sugestões estruturado
    sugestoesAtuais = [];
    profsFiltrados.forEach(p => sugestoesAtuais.push({ tipo: 'professor', valor: p }));
    discsFiltradas.forEach(d => sugestoesAtuais.push({ tipo: 'disciplina', valor: d }));

    sugestaoFocadaIndex = -1; // reseta o foco

    // 4. Renderiza o HTML das sugestões por categoria
    let html = "";
    
    if (profsFiltrados.length > 0) {
        html += `<div class="suggestion-group-title">Professores</div>`;
        profsFiltrados.forEach((prof, idx) => {
            html += `
                <div class="suggestion-item" data-index="${idx}" data-valor="${prof}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    <span>${destacarTermo(prof, termo)}</span>
                </div>
            `;
        });
    }

    if (discsFiltradas.length > 0) {
        html += `<div class="suggestion-group-title">Disciplinas</div>`;
        discsFiltradas.forEach((disc, idx) => {
            const globalIdx = profsFiltrados.length + idx;
            html += `
                <div class="suggestion-item" data-index="${globalIdx}" data-valor="${disc}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <span>${destacarTermo(disc, termo)}</span>
                </div>
            `;
        });
    }

    elements.searchSuggestions.innerHTML = html;
    elements.searchSuggestions.style.display = "block";

    // Adiciona click listeners
    const items = elements.searchSuggestions.querySelectorAll(".suggestion-item");
    items.forEach(item => {
        item.addEventListener("click", () => {
            const valor = item.getAttribute("data-valor");
            selecionarSugestao(valor);
        });
    });
}

function selecionarSugestao(valor) {
    elements.searchInput.value = valor;
    state.busca = valor.toLowerCase().trim();
    elements.clearSearchBtn.style.display = "block";
    fecharSugestoes();
    renderizarVisaoAtiva();
    atualizarEstatisticas();
}

function moverFocoTeclado(direcao) {
    const items = elements.searchSuggestions.querySelectorAll(".suggestion-item");
    if (items.length === 0) return;

    // Remove classe focada anterior
    if (sugestaoFocadaIndex >= 0 && sugestaoFocadaIndex < items.length) {
        items[sugestaoFocadaIndex].classList.remove("focused");
    }

    // Calcula novo índice
    sugestaoFocadaIndex += direcao;
    if (sugestaoFocadaIndex < 0) {
        sugestaoFocadaIndex = items.length - 1;
    } else if (sugestaoFocadaIndex >= items.length) {
        sugestaoFocadaIndex = 0;
    }

    // Adiciona classe focada e faz scroll se necessário
    const itemFocado = items[sugestaoFocadaIndex];
    itemFocado.classList.add("focused");
    itemFocado.scrollIntoView({ block: 'nearest' });
}
