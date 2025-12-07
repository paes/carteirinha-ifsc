# 📲 Carteira de Saída Antecipada – IFSC Garopaba

Aplicação web (PWA) usada como **carteira digital de autorização de saída antecipada** para estudantes do IFSC – Câmpus Garopaba.

Os dados dos estudantes são armazenados no **Cloud Firestore**, e o acesso é feito via **conta Google** (e-mail institucional), sem que o aluno precise criar ou gerenciar senha própria na aplicação.

---

## ✨ Visão geral

A carteira digital exibe:

- Dados do estudante (nome, matrícula, idade, curso/turma);
- Dados do responsável (nome e telefone);
- Foto 3x4;
- Um **carimbo de status**:
  - **SAÍDA AUTORIZADA** (verde) quando a carteira está aprovada;
  - **PENDENTE** (vermelho), incluindo um **carimbão diagonal** ocupando a carteirinha inteira para evitar uso indevido enquanto o pedido não foi aprovado.

A aplicação pode ser instalada no celular como atalho/PWA, facilitando a conferência na portaria.

---

## 🧩 Funcionalidades

### Para estudantes

- Login via **conta Google** (e-mail institucional).
- Preenchimento/atualização dos dados:
  - Matrícula (RA);
  - Nome completo;
  - Curso e Turma;
  - Data de nascimento;
  - E-mail institucional `@aluno.ifsc.edu.br`;
  - Nome do responsável;
  - Telefone do responsável;
  - Flags de confirmação:
    - Responsável assinou/assinará o termo no gov.br;
    - Entrega do documento na coordenação.
- Upload de foto 3x4 (tamanho máximo ~300 KB).
- Visualização da carteira digital, já em layout horizontal (rotacionada em 90° para facilitar mostrar no celular).

### Para coordenação / administração

- Painel de **aprovação de solicitações**:
  - Lista de estudantes com status `pending`;
  - Visualização de nome, RA, curso, turma e se o formulário foi entregue;
  - Botões **Aprovar** e **Rejeitar**.
- Alteração do campo `status` do estudante no Firestore:
  - `pending` → `approved` ou `rejected`.

### PWA / Experiência de uso

- Ícones personalizados (Android, iOS, desktop) em `icons/`.
- `manifest.webmanifest` configurado com:
  - Nome e short_name do app;
  - Ícones 192x192 e 512x512;
  - `display: standalone`.
- `service-worker.js` com cache dos principais assets:
  - Permite que a **interface** carregue mesmo com conexão ruim (as operações com Firestore dependem de rede, mas há suporte opcional a persistência offline).

---

## 🏗️ Arquitetura

### Front-end

- **HTML5**: estrutura das telas (login, solicitação, carteira, painel admin).
- **CSS3**: layout responsivo, com:
  - Tela da carteira em **full-screen**;
  - Cartão rotacionado 90°;
  - Estilo IFSC (cores, tipografia, etc.);
  - Carimbo diagonal de “PENDENTE” com `::after`.
- **JavaScript puro (app.js)**:
  - Controle de telas (login, request, card, admin);
  - Integração com Firestore;
  - Renderização dos dados na carteira;
  - Lógica de status e do carimbo;
  - Controle de sessão via `localStorage` (apenas para lembrar quem está logado).

### Back-end / Banco de dados

- **Firebase**:
  - **Cloud Firestore** (SDK compat 10.12.x);
  - **Firebase Authentication com Google** (para login sem senha própria do app);
  - Persistência offline opcional (`enablePersistence`).

Coleção principal:

- `students` – cada documento representa um estudante.

---

## 🗃️ Modelo de dados (coleção `students`)

Campos principais (podem evoluir com o tempo):

- `ra`: string – matrícula do estudante (pode ser usada como ID do documento);
- `googleEmail`: string – e-mail da conta Google usada no login (ex.: `login@aluno.ifsc.edu.br`);
- `nome`: string;
- `curso`: string;
- `turma`: string;
- `dataNascimento`: string – formato `YYYY-MM-DD`;
- `idade`: string (armazenada ou calculada a partir de `dataNascimento`);
- `email`: string – e-mail institucional (geralmente igual ao `googleEmail`);
- `responsavelNome`: string;
- `responsavelTelefone`: string;
- `responsavelOk`: boolean – se o responsável já assinou/assinará o termo oficial;
- `saidaAutorizada`: boolean – se o termo formal está associado;
- `fotoDataUrl`: string – Data URL da foto 3x4 (imagem em Base64);
- `role`: string – normalmente `"student"`; admins podem ser diferenciados por regras específicas;
- `status`: `"pending" | "approved" | "rejected"`;
- `createdAt`: `Timestamp` (do servidor – `FieldValue.serverTimestamp()`);
- `updatedAt`: `Timestamp` (do servidor).

> ⚠️ A definição de quem é **admin** deve ser feita pelas **Firestore Security Rules** (por exemplo, via e-mail autorizado ou campo `role: "admin"` em outro local). O código de front não deve ser a **única** barreira de segurança.

---

## 📂 Estrutura de arquivos

```text
/
├── index.html              # Estrutura principal da aplicação
├── styles.css              # Estilos da interface e da carteira
├── app.js                  # Lógica de telas, Firestore e renderização
├── service-worker.js       # Cache básico para PWA
├── manifest.webmanifest    # Manifesto do PWA
└── icons/                  # Ícones e favicons
    ├── android-chrome-192x192.png
    ├── android-chrome-512x512.png
    ├── apple-touch-icon.png
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    └── favicon.ico
