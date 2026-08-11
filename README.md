# 🏥 Dashboard de Escalas e Métricas — Mackenzie Medicina

Um dashboard analítico web moderno, interativo e de alto desempenho projetado para visualização, monitoramento e análise de alocação de docentes e escalas de aulas do curso de Medicina da faculdade Mackenzie (Semestre Letivo 2026.2).

---

## 🌐 Links do Projeto

* **Site em Produção (Vercel):** [https://site-calendario-mackenzie-medicina.vercel.app/](https://site-calendario-mackenzie-medicina.vercel.app/)
* **Repositório do Código (GitHub):** [https://github.com/minoru-yamanaka/site_calendario_mackenzie_medicina](https://github.com/minoru-yamanaka/site_calendario_mackenzie_medicina)

---

## 🚀 Principais Recursos e Funcionalidades

### 📅 1. Visualizações de Escalas e Calendário
* **Visão Mensal:** Calendário clássico exibindo feriados letivos e marcos importantes do semestre.
* **Visão Semanal:** Grade horária completa dividida por períodos letivos e dias úteis (Segunda a Sexta).
* **Visão de Agenda:** Lista linear cronológica de todas as atividades, facilitando a rolagem rápida de datas.
* **Consolidação Geral (Todas as Turmas):** Integração paralela das turmas `2M` e `4M`, sinalizando colisões de horários e co-ensino na mesma célula e na barra lateral.

### 📊 2. Métricas & Gráficos Interativos (Chart.js)
* **Distribuição de Professores por Dia:** Gráfico de barras verticais indicando a quantidade de professores únicos em atividade no campus a cada dia útil.
* **Aulas Semanais por Disciplina:** Gráfico de rosca (doughnut) dinâmico que exibe a representação de carga horária por matéria.
* **Carga Horária com Seletor de Unidades (Aulas vs Horas):**
  * Gráfico de barras horizontais com suporte a **Períodos** (aulas letivas) e **Horas (Relógio)**.
  * A conversão para **Horas (Relógio)** é feita em tempo real usando a convenção de **50 minutos por período letivo** (ex: `12 aulas = 10.0 h`).
  * 🚦 **Farol de Status (Semáforo):** As barras mudam de cor com base na carga semanal (🔴 Alto/Vermelho, 🟡 Médio/Amarelo, 🟢 Baixo/Verde), atualizando a legenda e os tooltips dinamicamente.
  * ↕️ **Alternador "Ver Todos":** Expande a altura do gráfico de professores de `300px` para `650px` para listar todos os 25 professores com espaçamento e legibilidade ideais.

### 🤝 3. Mapeamento de Co-Ensino (Parcerias)
Ao selecionar um professor no dashboard:
* **Card Lateral de Parcerias:** Um painel reativo lista quais colegas dividem disciplinas com ele, indicando as matérias compartilhadas e exibindo um **badge vermelho com a quantidade exata de aulas semanais compartilhadas** entre eles (ordenados do maior para o menor).
* **Gráfico Reativo Temporário:** Um gráfico de barras horizontais de parcerias surge na aba de métricas detalhando as aulas compartilhadas. Clicar em qualquer barra redireciona o dashboard para o respectivo parceiro.

### 🌓 4. Design Premium e Responsividade
* **Temas Claro/Escuro:** Botão flutuante na barra superior para alternar temas instantaneamente com ajuste automático de contraste, cores e eixos de gráficos.
* **Filtros e Busca Instantânea:** Barra de pesquisa no painel de controle que filtra calendários, estatísticas e gráficos por termo de busca instantaneamente.

---

## 🛠️ Tecnologias Utilizadas

* **Estrutura:** HTML5 Semântico
* **Estilização:** CSS3 Vanilla (Design System premium, Glassmorphism, CSS Variables, Transições Suaves)
* **Interatividade & Lógica:** Vanilla JavaScript (ES6+)
* **Gráficos:** [Chart.js](https://www.chartjs.org/) via CDN
* **Ícones:** FontAwesome

---

## 📂 Estrutura de Arquivos

* 📄 `index.html`: Esqueleto e estrutura de visualização do dashboard.
* 🎨 `style.css`: Estilização completa do projeto, gerenciamento de temas e responsividade.
* ⚙️ `app.js`: Script principal com a lógica do calendário letivo, tratamento de dados brutos e instanciação de gráficos.
* 📊 `dados_calendario.json`: Arquivo de dados consolidado contendo escalas de professores, disciplinas e eventos acadêmicos.

---

## 💻 Como Rodar o Projeto Localmente

Como a aplicação faz o carregamento assíncrono do arquivo de dados `dados_calendario.json` via requisição HTTP (`fetch`), é necessário executá-lo a partir de um servidor web local para evitar problemas de CORS no navegador.

### Opção 1: Usando Python (Recomendado)
Se você tem o Python instalado, abra o terminal na pasta do projeto e execute:
```bash
python -m http.server 8000
```
Depois, acesse em seu navegador:
👉 **[http://localhost:8000](http://localhost:8000)**

### Opção 2: Usando Extensões do VS Code
Se utiliza o VS Code, você pode instalar a extensão **Live Server** e clicar no botão "Go Live" na barra inferior ao abrir o arquivo `index.html`.
