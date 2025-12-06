# Carteira de Saída Antecipada – IFSC Garopaba

Aplicação web (PWA) para emissão e visualização da **Carteira de Autorização de Saída Antecipada** de estudantes do IFSC – Câmpus Garopaba.

O objetivo é facilitar o controle de autorizações de saída de estudantes menores, integrando:
- Solicitação online pelos responsáveis/alunos;
- Registro das informações essenciais (curso, turma, responsável, contato);
- Visualização de uma **carteira digital rotacionada em 90°**, pensada para ser mostrada diretamente na tela do celular na portaria.

---

## Funcionalidades

### Lado do estudante / responsável

- **Login por matrícula + senha**
- **Solicitação de carteira**:
  - Matrícula
  - Nome completo do aluno
  - Curso
  - Turma
  - Data de nascimento
  - E-mail institucional
  - Nome do responsável
  - Telefone do responsável
  - Upload de foto 3x4 (campo preparado)
  - Definição de senha de acesso
  - Confirmação de leitura sobre **saída antecipada**
- **Visualização da carteira digital**:
  - Cabeçalho oficial do IFSC Garopaba
  - Foto do estudante
  - **Carimbo (stamp)** com a situação da autorização:
    - “SAÍDA AUTORIZADA” ou
    - “PENDENTE”
  - Nome do aluno
  - Matrícula
  - Idade (calculada pela data de nascimento)
  - Curso e turma
  - Nome do responsável
  - Telefone do responsável
  - Bloco de **Observações** com as condições de uso da autorização

A tela da carteira foi otimizada para:
- Ocupação máxima da tela (layout em modo retrato com a carteira rotacionada em 90°);
- Exibição confortável nos principais tamanhos de celulares;
- Botão de **Sair** flutuante, no canto inferior direito.

---

### Lado do admin

- Tela de **Painel de Aprovação**:
  - Lista de solicitações pendentes
  - Nome, matrícula, curso, turma
  - Link para formulário completo
  - Botões de ação (aprovar / rejeitar)

> A lógica de persistência (ex.: Firebase, backend, etc.) pode ser plugada posteriormente.  
> Atualmente o foco está no **layout, fluxo de telas e protótipo funcional**.

---

## Tecnologias utilizadas

- **HTML5** – Estrutura das telas (login, solicitação, carteira, admin)
- **CSS3** – Layout responsivo, rotação da carteira, estilização seguindo cores do IFSC
- **JavaScript (Vanilla)** – Controle de telas, login, preenchimento da carteira
- **PWA (Progressive Web App)**:
  - `manifest.webmanifest`
  - Ícones
  - Integração com `theme-color`

---

## Estrutura básica de arquivos

```text
/
├── index.html       # Estrutura principal da aplicação
├── styles.css       # Estilos da aplicação e layout da carteira
├── app.js           # Lógica de navegação e preenchimento dos dados
├── manifest.webmanifest
└── icons/
    ├── logo-v.png   # Logo vertical (tela de login)
    └── logo-h.png   # Logo horizontal (cabeçalho da carteira)
