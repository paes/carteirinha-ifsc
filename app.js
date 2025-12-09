// =============================
// Firestore / coleções
// =============================

const studentsCollection = firestore.collection("students");
const adminsCollection = firestore.collection("admins");

// helpers de domínio
function isStudentEmail(email) {
  const e = (email || "").toLowerCase();
  return e.endsWith("@aluno.ifsc.edu.br");
}

function isEmployeeEmail(email) {
  const e = (email || "").toLowerCase();
  return e.endsWith("@ifsc.edu.br") && !e.endsWith("@aluno.ifsc.edu.br");
}

// =============================
// DB: students
// =============================

const db = {
  // Retorna carteira do usuário logado (ou null)
  async getCurrentStudentCard() {
    const user = auth.currentUser;
    if (!user) return null;

    const snapshot = await studentsCollection
      .where("ownerUid", "==", user.uid)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  // Cria / atualiza carteira para o usuário logado
  async createOrUpdateCurrentStudentCard({
    ra,
    nome,
    curso,
    turma,
    dataNascimento,
    responsavelNome,
    responsavelTelefone,
    responsavelOk,
    saidaAutorizada,
    fotoDataUrl
  }) {
    const userAuth = auth.currentUser;
    if (!userAuth) throw new Error("Não autenticado");

    // doc ID = uid
    const docRef = studentsCollection.doc(userAuth.uid);
    const existing = await docRef.get();

    const baseData = {
      ownerUid: userAuth.uid,
      ownerEmail: userAuth.email || "",
      ownerName: userAuth.displayName || "",
      ra: ra || "",
      nome: nome || "",
      curso: curso || "",
      turma: turma || "",
      dataNascimento: dataNascimento || null,
      email: userAuth.email || "",
      responsavelNome: responsavelNome || "",
      responsavelTelefone: responsavelTelefone || "",
      role: "student", // mesmo para servidor testando
      responsavelOk: !!responsavelOk,
      saidaAutorizada: !!saidaAutorizada,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!existing.exists) {
      baseData.status = "pending";
      baseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    } else {
      const current = existing.data();
      if (current && current.status) {
        baseData.status = current.status;
      }
      if (current && current.fotoDataUrl && !fotoDataUrl) {
        baseData.fotoDataUrl = current.fotoDataUrl;
      }
    }

    if (fotoDataUrl) {
      baseData.fotoDataUrl = fotoDataUrl;
    }

    await docRef.set(baseData, { merge: true });
    const saved = await docRef.get();
    return { id: saved.id, ...saved.data() };
  },

  // Atualiza status (approved / pending / rejected) por ID do doc
  async updateStudentStatus(docId, newStatus) {
    const docRef = studentsCollection.doc(docId);
    await docRef.update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  },

  // Lista alunos pendentes
  async listPendingStudents() {
    const snapshot = await studentsCollection
      .where("status", "==", "pending")
      .get();

    const arr = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    arr.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return ta - tb;
    });

    return arr;
  },

  // Lista alunos com carteira aprovada (ativas)
  async listApprovedStudents() {
    const snapshot = await studentsCollection
      .where("status", "==", "approved")
      .get();

    const arr = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    arr.sort((a, b) => {
      const nomeA = (a.nome || "").toLowerCase();
      const nomeB = (b.nome || "").toLowerCase();
      return nomeA.localeCompare(nomeB);
    });

    return arr;
  },

  // Lista pedidos rejeitados / desativados
  async listRejectedStudents() {
    const snapshot = await studentsCollection
      .where("status", "==", "rejected")
      .get();

    const arr = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    arr.sort((a, b) => {
      const nomeA = (a.nome || "").toLowerCase();
      const nomeB = (b.nome || "").toLowerCase();
      return nomeA.localeCompare(nomeB);
    });

    return arr;
  }
};

// =============================
// DB: admins
// =============================

const rolesDb = {
  async listAdmins() {
    const snapshot = await adminsCollection.where("role", "==", "admin").get();
    return snapshot.docs.map((doc) => ({
      email: doc.id,
      ...doc.data()
    }));
  },

  async addAdmin(email) {
    const clean = (email || "").toLowerCase();
    if (!clean) throw new Error("Email vazio");
    await adminsCollection.doc(clean).set(
      {
        role: "admin",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  },

  async removeAdmin(email) {
    const clean = (email || "").toLowerCase();
    await adminsCollection.doc(clean).delete();
  }
};

// =============================
// Utils
// =============================

function calcularIdadeAPartirDeData(dataNascStr) {
  if (!dataNascStr) return "";
  const hoje = new Date();
  const nasc = new Date(dataNascStr);

  if (isNaN(nasc.getTime())) {
    return "";
  }

  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }

  if (idade < 0 || idade > 130) return "";
  return idade + " anos";
}

function formatPhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 7);
    const part2 = digits.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  } else if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 6);
    const part2 = digits.slice(6);
    return `(${ddd}) ${part1}-${part2}`;
  } else {
    return phone;
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =============================
// UI / Fluxo de telas
// =============================

document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("login-screen");
  const requestScreen = document.getElementById("request-screen");
  const cardScreen = document.getElementById("card-screen");
  const adminScreen = document.getElementById("admin-screen");

  const loginArea = document.getElementById("login-area");
  const homeArea = document.getElementById("home-area");

  const googleLoginBtn = document.getElementById("google-login-btn");
  const homeCardBtn = document.getElementById("home-card-btn");
  const homeRequestBtn = document.getElementById("home-request-btn");
  const homeAdminBtn = document.getElementById("home-admin-btn");
  const homeLogoutBtn = document.getElementById("home-logout-btn");
  const homeCardMsg = document.getElementById("home-card-msg");

  // novos controles para "ver como aluno"
  const homeViewAsStudentBtn = document.getElementById(
    "home-view-as-student-btn"
  );
  const homeBackAdminRoleBtn = document.getElementById(
    "home-back-admin-role-btn"
  );
  const adminStudentBanner = document.getElementById("admin-student-banner");

  const userNameSpan = document.getElementById("user-name");
  const userEmailSpan = document.getElementById("user-email");

  const backToLoginBtn = document.getElementById("back-to-login");
  const requestForm = document.getElementById("request-form");
  const logoutBtn = document.getElementById("logout-btn");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");

  // selects curso/turma para filtro
  const reqCursoSelect = document.getElementById("req-curso");
  const reqTurmaSelect = document.getElementById("req-turma");

  // elementos Admin (abas e filtros)
  const adminTabsPendingBtn = document.getElementById("admin-tab-pendentes");
  const adminTabsActiveBtn = document.getElementById("admin-tab-ativos");
  const adminTabsRejectedBtn = document.getElementById("admin-tab-rejeitados");
  const adminTabsRolesBtn = document.getElementById("admin-tab-roles");

  const adminPendentesArea = document.getElementById("admin-pendentes-area");
  const adminAtivosArea = document.getElementById("admin-ativos-area");
  const adminRejeitadosArea = document.getElementById("admin-rejeitados-area");
  const adminRolesArea = document.getElementById("admin-roles-area");

  const adminTableBody = document.getElementById("admin-table-body");
  const adminAtivosBody = document.getElementById("admin-ativos-body");
  const adminRejeitadosBody = document.getElementById("admin-rejeitados-body");
  const adminSearchInput = document.getElementById("admin-search");
  const adminFilterCurso = document.getElementById("admin-filter-curso");
  const adminFilterTurma = document.getElementById("admin-filter-turma");

  const adminRolesForm = document.getElementById("admin-roles-form");
  const adminRoleLoginInput = document.getElementById("admin-role-login");
  const adminRolesTableBody = document.getElementById("admin-roles-body");

  let currentStudentCard = null;
  let adminApprovedList = [];
  let currentUserIsAdmin = false;
  let isAdminStudentView = false; // admin está “vendo como aluno”?

  // garante que só UMA tela aparece por vez
  function showScreen(screen) {
    [loginScreen, requestScreen, cardScreen, adminScreen].forEach((s) => {
      if (!s) return;
      s.classList.add("hidden");
    });
    if (screen) screen.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderStudentCard(data) {
    if (!data) return;

    const cardName = document.getElementById("card-name");
    const cardRa = document.getElementById("card-ra");
    const cardCourse = document.getElementById("card-course");
    const cardTurma = document.getElementById("card-turma");
    const cardIdade = document.getElementById("card-idade");
    const cardRespNome = document.getElementById("card-resp-nome");
    const cardRespTel = document.getElementById("card-resp-tel");
    const statusMsg = document.getElementById("card-status-msg");
    const photoPlaceholder = document.getElementById("card-photo-placeholder");
    const cardStamp = document.getElementById("card-stamp");

    const cardElement = document.querySelector(".card");

    if (cardName) cardName.textContent = data.nome || "";
    if (cardRa) cardRa.textContent = data.ra || "";
    if (cardCourse) cardCourse.textContent = data.curso || "";
    if (cardTurma) cardTurma.textContent = data.turma || "";

    if (cardIdade) {
      let idadeTexto = "";
      if (data.dataNascimento) {
        idadeTexto = calcularIdadeAPartirDeData(data.dataNascimento);
      } else if (data.idade) {
        idadeTexto = data.idade;
      }
      cardIdade.textContent = idadeTexto;
    }

    if (cardRespNome) cardRespNome.textContent = data.responsavelNome || "";
    if (cardRespTel)
      cardRespTel.textContent = formatPhone(data.responsavelTelefone || "");

    if (photoPlaceholder) {
      if (data.fotoDataUrl) {
        photoPlaceholder.style.backgroundImage = `url(${data.fotoDataUrl})`;
        photoPlaceholder.textContent = "";
      } else {
        photoPlaceholder.style.backgroundImage = "none";
        photoPlaceholder.textContent = "FOTO";
      }
    }

    if (cardStamp) {
      cardStamp.classList.remove("authorized", "pending");

      if (data.status === "approved") {
        cardStamp.textContent = "SAÍDA AUTORIZADA";
        cardStamp.classList.add("authorized");
        if (cardElement) {
          cardElement.classList.remove("card-pending");
        }
      } else {
        // pendente OU rejeitada → sempre mostra PENDENTE visualmente
        cardStamp.textContent = "PENDENTE";
        cardStamp.classList.add("pending");
        if (cardElement) {
          cardElement.classList.add("card-pending");
        }
      }
    }

    if (statusMsg) {
      if (data.status === "approved") {
        statusMsg.textContent =
          "Carteira ativa. Saída antecipada autorizada.";
      } else if (data.status === "pending") {
        statusMsg.textContent =
          "Pedido em análise. A carteira aparece com status PENDENTE até a aprovação.";
      } else if (data.status === "rejected") {
        statusMsg.textContent =
          "Pedido indeferido ou carteira desativada. A carteira aparece como PENDENTE e não autoriza saída.";
      } else {
        statusMsg.textContent = "Status da carteira não definido.";
      }
    }
  }

  // =============================
  // Atualização da home conforme papel / modo
  // =============================

  function updateHomeCardControls(showNoCardMessage) {
    if (!(homeCardBtn && homeCardMsg)) return;

    if (!currentStudentCard) {
      homeCardBtn.disabled = true;
      if (showNoCardMessage) {
        homeCardMsg.textContent =
          "Você ainda não possui carteira cadastrada. Clique em “Solicitar / atualizar carteira”.";
      } else {
        homeCardMsg.textContent = "";
      }
      return;
    }

    homeCardBtn.disabled = false;

    if (currentStudentCard.status === "approved") {
      homeCardMsg.textContent = "";
    } else if (currentStudentCard.status === "pending") {
      homeCardMsg.textContent =
        "Seu pedido está em análise. Ao abrir, a carteirinha será exibida com status PENDENTE.";
    } else if (currentStudentCard.status === "rejected") {
      homeCardMsg.textContent =
        "Sua carteira está indeferida/desativada. Ao abrir, a carteirinha aparece como PENDENTE e não autoriza saída.";
    } else {
      homeCardMsg.textContent = "";
    }
  }

  function updateHomeView() {
    if (!homeArea) return;

    const isAdmin = currentUserIsAdmin;

    // reset banner por padrão
    if (adminStudentBanner) {
      adminStudentBanner.classList.add("hidden");
      adminStudentBanner.textContent = "";
    }

    if (!isAdmin) {
      // Usuário NÃO é admin → sempre modo aluno "normal"
      isAdminStudentView = false;

      if (homeAdminBtn) homeAdminBtn.classList.add("hidden");
      if (homeViewAsStudentBtn) homeViewAsStudentBtn.classList.add("hidden");
      if (homeBackAdminRoleBtn) homeBackAdminRoleBtn.classList.add("hidden");

      if (homeCardBtn) homeCardBtn.classList.remove("hidden");
      if (homeRequestBtn) homeRequestBtn.classList.remove("hidden");

      updateHomeCardControls(true);
      return;
    }

    // Usuário É admin
    if (!isAdminStudentView) {
      // Modo servidor/admin
      if (homeAdminBtn) homeAdminBtn.classList.remove("hidden");
      if (homeViewAsStudentBtn)
        homeViewAsStudentBtn.classList.remove("hidden");
      if (homeBackAdminRoleBtn)
        homeBackAdminRoleBtn.classList.add("hidden");

      if (homeCardBtn) {
        homeCardBtn.classList.add("hidden");
        homeCardBtn.disabled = true;
      }
      if (homeRequestBtn) {
        homeRequestBtn.classList.add("hidden");
      }

      if (homeCardMsg) {
        homeCardMsg.textContent =
          "Você está logado como servidor administrador. Use o painel administrativo ou clique em “Ver como aluno (teste)” para experimentar o fluxo do discente.";
      }

      return;
    }

    // Admin em modo aluno (teste)
    if (adminStudentBanner) {
      adminStudentBanner.textContent =
        "Você é administrador e está visualizando o app como aluno (modo de teste). Qualquer carteira criada aqui é apenas para testes.";
      adminStudentBanner.classList.remove("hidden");
    }

    if (homeAdminBtn) homeAdminBtn.classList.add("hidden");
    if (homeViewAsStudentBtn) homeViewAsStudentBtn.classList.add("hidden");
    if (homeBackAdminRoleBtn)
      homeBackAdminRoleBtn.classList.remove("hidden");

    if (homeCardBtn) homeCardBtn.classList.remove("hidden");
    if (homeRequestBtn) homeRequestBtn.classList.remove("hidden");

    updateHomeCardControls(true);
  }

  // =============================
  // Painel Admin - gestão de abas
  // =============================

  function setAdminTab(tabName) {
    const configs = [
      { name: "pendentes", btn: adminTabsPendingBtn, area: adminPendentesArea },
      { name: "ativos", btn: adminTabsActiveBtn, area: adminAtivosArea },
      {
        name: "rejeitados",
        btn: adminTabsRejectedBtn,
        area: adminRejeitadosArea
      },
      { name: "roles", btn: adminTabsRolesBtn, area: adminRolesArea }
    ];

    configs.forEach(({ name, btn, area }) => {
      if (!btn || !area) return;
      if (name === tabName) {
        btn.classList.add("active");
        area.classList.remove("hidden");
      } else {
        btn.classList.remove("active");
        area.classList.add("hidden");
      }
    });
  }

  // =============================
  // Painel Admin - Pendentes
  // =============================

  async function renderAdminPendingPanel() {
    if (!adminTableBody) return;
    adminTableBody.innerHTML = "";

    const pendentes = await db.listPendingStudents();

    if (pendentes.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Nenhum pedido pendente.";
      tr.appendChild(td);
      adminTableBody.appendChild(tr);
      return;
    }

    pendentes.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nome || ""}</td>
        <td>${u.ra || ""}</td>
        <td>${u.curso || ""}</td>
        <td>${u.turma || ""}</td>
        <td>${u.responsavelOk ? "Formulário entregue" : "A confirmar"}</td>
        <td>
          <button class="approve-btn" data-id="${u.id}">Aprovar</button>
          <button class="reject-btn" data-id="${u.id}">Rejeitar</button>
        </td>
      `;
      adminTableBody.appendChild(tr);
    });

    adminTableBody.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        await db.updateStudentStatus(id, "approved");
        await renderAdminPendingPanel();
      });
    });

    adminTableBody.querySelectorAll(".reject-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        await db.updateStudentStatus(id, "rejected");
        await renderAdminPendingPanel();
      });
    });
  }

  // =============================
  // Painel Admin - Ativos
  // =============================

  function applyAdminActiveFilters() {
    if (!adminAtivosBody) return;
    adminAtivosBody.innerHTML = "";

    const search = (adminSearchInput?.value || "").trim().toLowerCase();
    const curso = adminFilterCurso?.value || "";
       const turma = adminFilterTurma?.value || "";

    const filtered = adminApprovedList.filter((u) => {
      if (curso && u.curso !== curso) return false;
      if (turma && u.turma !== turma) return false;

      if (search) {
        const alvo = ((u.nome || "") + " " + (u.ra || "")).toLowerCase();
        if (!alvo.includes(search)) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = "Nenhuma carteira ativa encontrada.";
      tr.appendChild(td);
      adminAtivosBody.appendChild(tr);
      return;
    }

    filtered.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nome || ""}</td>
        <td>${u.ra || ""}</td>
        <td>${u.curso || ""}</td>
        <td>${u.turma || ""}</td>
        <td>${u.responsavelNome || ""}</td>
        <td>${formatPhone(u.responsavelTelefone || "")}</td>
        <td>
          <button class="deactivate-btn" data-id="${u.id}">Desativar</button>
        </td>
      `;
      adminAtivosBody.appendChild(tr);
    });

    adminAtivosBody.querySelectorAll(".deactivate-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmacao = confirm(
          "Deseja realmente desativar esta carteira? O estudante deixará de ter a saída antecipada autorizada."
        );
        if (!confirmacao) return;

        try {
          await db.updateStudentStatus(id, "rejected");
          await loadAdminApprovedAndRender();
        } catch (err) {
          console.error("Erro ao desativar carteira:", err);
          alert("Não foi possível desativar a carteira. Tente novamente.");
        }
      });
    });
  }

  async function loadAdminApprovedAndRender() {
    adminApprovedList = await db.listApprovedStudents();
    applyAdminActiveFilters();
  }

  // =============================
  // Painel Admin - Rejeitados
  // =============================

  async function renderAdminRejectedPanel() {
    if (!adminRejeitadosBody) return;
    adminRejeitadosBody.innerHTML = "";

    const rejeitados = await db.listRejectedStudents();

    if (rejeitados.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = "Nenhum pedido rejeitado/desativado.";
      tr.appendChild(td);
      adminRejeitadosBody.appendChild(tr);
      return;
    }

    rejeitados.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nome || ""}</td>
        <td>${u.ra || ""}</td>
        <td>${u.curso || ""}</td>
        <td>${u.turma || ""}</td>
        <td>${u.responsavelNome || ""}</td>
        <td>${formatPhone(u.responsavelTelefone || "")}</td>
        <td>
          <button class="reapprove-btn" data-id="${u.id}">
            Aprovar novamente
          </button>
        </td>
      `;
      adminRejeitadosBody.appendChild(tr);
    });

    adminRejeitadosBody.querySelectorAll(".reapprove-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const ok = confirm(
          "Atenção: este discente teve sua carteirinha recusada anteriormente. Você tem certeza que deseja alterar o status deste pedido para APROVADO?"
        );
        if (!ok) return;

        try {
          await db.updateStudentStatus(id, "approved");
          await renderAdminRejectedPanel();
        } catch (err) {
          console.error("Erro ao reaprovar carteira:", err);
          alert("Não foi possível aprovar novamente. Tente novamente.");
        }
      });
    });
  }

  // =============================
  // Painel Admin - Administradores
  // =============================

  async function renderAdminRolesPanel() {
    if (!adminRolesTableBody) return;
    adminRolesTableBody.innerHTML = "";

    if (!currentUserIsAdmin) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = "Apenas administradores podem visualizar esta área.";
      tr.appendChild(td);
      adminRolesTableBody.appendChild(tr);
      return;
    }

    let admins = await rolesDb.listAdmins();

    const fixedAdmins = [
      "thiago.paes@ifsc.edu.br",
      "nauber.gavski@ifsc.edu.br",
      "miguel.zarth@ifsc.edu.br",
      "felix.medina@ifsc.edu.br",
      "coord.pedagogica.gpb@ifsc.edu.br"
    ];

    fixedAdmins.forEach((email) => {
      if (!admins.some((a) => a.email === email)) {
        admins.push({ email, role: "admin", fromBootstrap: true });
      }
    });

    admins.sort((a, b) => (a.email || "").localeCompare(b.email || ""));

    if (admins.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = "Nenhum administrador configurado.";
      tr.appendChild(td);
      adminRolesTableBody.appendChild(tr);
      return;
    }

    admins.forEach((adm) => {
      const tr = document.createElement("tr");
      const label = adm.fromBootstrap ? " (fixo)" : "";
      tr.innerHTML = `
        <td>${adm.email}</td>
        <td>${adm.role || "admin"}${label}</td>
        <td>
          ${
            adm.fromBootstrap
              ? "<span style='font-size:0.8rem;color:#777'>Não removível pelo app</span>"
              : `<button class="remove-admin-btn" data-email="${adm.email}">Remover</button>`
          }
        </td>
      `;
      adminRolesTableBody.appendChild(tr);
    });

    adminRolesTableBody
      .querySelectorAll(".remove-admin-btn")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const email = btn.getAttribute("data-email");
          const ok = confirm(
            `Remover ${email} da lista de administradores?`
          );
          if (!ok) return;
          try {
            await rolesDb.removeAdmin(email);
            await renderAdminRolesPanel();
          } catch (err) {
            console.error("Erro ao remover admin:", err);
            alert("Não foi possível remover. Verifique suas permissões.");
          }
        });
      });
  }

  // =============================
  // Filtro de turmas por curso (form de request)
  // =============================

  let turmaOptions = [];
  if (reqTurmaSelect) {
    turmaOptions = Array.from(reqTurmaSelect.querySelectorAll("option")).map(
      (opt) => {
        if (!opt.value) {
          return { opt, group: null };
        }
        const prefix = opt.value.slice(0, 3).toUpperCase();
        return { opt, group: prefix };
      }
    );
  }

  function aplicarFiltroTurmas(cursoValue) {
    if (!reqTurmaSelect || turmaOptions.length === 0) return;

    let grupoPermitido = null;

    switch (cursoValue) {
      case "Curso Técnico Integrado em Informática":
        grupoPermitido = "INF";
        break;
      case "Curso Técnico Integrado em Lazer":
        grupoPermitido = "LAZ";
        break;
      case "Curso Técnico Integrado em Administração":
        grupoPermitido = "ADM";
        break;
      case "Curso Técnico Concomitante em Biotecnologia":
        grupoPermitido = "BIT";
        break;
      default:
        grupoPermitido = null;
    }

    reqTurmaSelect.value = "";

    turmaOptions.forEach(({ opt, group }) => {
      if (!opt.value) {
        opt.hidden = false;
        return;
      }
      opt.hidden = grupoPermitido ? group !== grupoPermitido : true;
    });
  }

  if (reqCursoSelect) {
    reqCursoSelect.addEventListener("change", () => {
      aplicarFiltroTurmas(reqCursoSelect.value);
    });
  }

  // =============================
  // Descobrir se o usuário é admin
  // =============================

  async function determineAdminFlag(email, isEmployee) {
    currentUserIsAdmin = false;
    if (!email || !isEmployee) return;

    const lower = email.toLowerCase();

    const bootstrapAdmins = [
      "thiago.paes@ifsc.edu.br",
      "miguel.zarth@ifsc.edu.br",
      "felix.medina@ifsc.edu.br",
      "coord.pedagogica.gpb@ifsc.edu.br",
      "nauber.gavski@ifsc.edu.br"
    ];

    if (bootstrapAdmins.includes(lower)) {
      currentUserIsAdmin = true;
    }

    try {
      const doc = await adminsCollection.doc(lower).get();
      if (doc.exists && doc.data().role === "admin") {
        currentUserIsAdmin = true;
      }
    } catch (err) {
      console.error("Erro ao verificar roles:", err);
    }
  }

  // =============================
  // Auth state listener
  // =============================

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      currentStudentCard = null;
      currentUserIsAdmin = false;
      isAdminStudentView = false;

      if (loginArea) loginArea.classList.remove("hidden");
      if (homeArea) homeArea.classList.add("hidden");

      if (homeAdminBtn) homeAdminBtn.classList.add("hidden");
      if (adminTabsRolesBtn) adminTabsRolesBtn.classList.add("hidden");
      if (adminRolesArea) adminRolesArea.classList.add("hidden");

      showScreen(loginScreen);
      return;
    }

    const email = (user.email || "").toLowerCase();
    const aluno = isStudentEmail(email);
    const employee = isEmployeeEmail(email);

    if (!aluno && !employee) {
      alert(
        "Apenas contas institucionais (@aluno.ifsc.edu.br ou @ifsc.edu.br) podem acessar."
      );
      await auth.signOut();
      return;
    }

    await determineAdminFlag(email, employee);

    if (loginArea) loginArea.classList.add("hidden");
    if (homeArea) homeArea.classList.remove("hidden");

    if (userNameSpan) {
      userNameSpan.textContent = user.displayName || "Usuário IFSC";
    }
    if (userEmailSpan) {
      userEmailSpan.textContent = user.email || "";
    }

    // por padrão, sempre começa no papel "servidor" se for admin
    if (currentUserIsAdmin) {
      isAdminStudentView = false;
    }

    // carrega carteira mais recente do Firestore
    currentStudentCard = await db.getCurrentStudentCard();

    if (adminTabsRolesBtn && adminRolesArea) {
      if (currentUserIsAdmin) {
        adminTabsRolesBtn.classList.remove("hidden");
      } else {
        adminTabsRolesBtn.classList.add("hidden");
        adminRolesArea.classList.add("hidden");
      }
    }

    updateHomeView();
    showScreen(loginScreen);
  });

  // =============================
  // Eventos de UI
  // =============================

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      try {
        await auth.signInWithPopup(provider);
      } catch (err) {
        console.error("Erro no login com Google:", err);
        alert("Não foi possível entrar com o Google. Tente novamente.");
      }
    });
  }

  if (homeViewAsStudentBtn) {
    homeViewAsStudentBtn.addEventListener("click", () => {
      if (!currentUserIsAdmin) return;
      isAdminStudentView = true;
      updateHomeView();
    });
  }

  if (homeBackAdminRoleBtn) {
    homeBackAdminRoleBtn.addEventListener("click", () => {
      if (!currentUserIsAdmin) return;
      isAdminStudentView = false;
      updateHomeView();
    });
  }

  if (homeCardBtn) {
    homeCardBtn.addEventListener("click", async () => {
      try {
        // SEMPRE busca a versão mais recente da carteira
        const latest = await db.getCurrentStudentCard();
        currentStudentCard = latest;

        if (!currentStudentCard) {
          alert(
            "Você ainda não possui carteira cadastrada. Clique em “Solicitar / atualizar carteira”."
          );
          return;
        }

        renderStudentCard(currentStudentCard);
        showScreen(cardScreen);
      } catch (err) {
        console.error("Erro ao carregar carteira:", err);
        alert("Não foi possível carregar a carteirinha. Tente novamente.");
      }
    });
  }

  if (homeRequestBtn) {
    homeRequestBtn.addEventListener("click", () => {
      const user = auth.currentUser;
      if (user) {
        const nomeInput = document.getElementById("req-nome");
        if (nomeInput && !nomeInput.value) {
          nomeInput.value = user.displayName || "";
        }
      }
      showScreen(requestScreen);
    });
  }

  if (homeAdminBtn) {
    homeAdminBtn.addEventListener("click", async () => {
      if (!currentUserIsAdmin) {
        alert("Você não tem permissão para acessar o painel administrativo.");
        return;
      }
      setAdminTab("pendentes");
      await renderAdminPendingPanel();
      showScreen(adminScreen);
    });
  }

  if (homeLogoutBtn) {
    homeLogoutBtn.addEventListener("click", () => {
      auth.signOut();
    });
  }

  if (adminTabsPendingBtn) {
    adminTabsPendingBtn.addEventListener("click", async () => {
      setAdminTab("pendentes");
      await renderAdminPendingPanel();
    });
  }

  if (adminTabsActiveBtn) {
    adminTabsActiveBtn.addEventListener("click", async () => {
      setAdminTab("ativos");
      await loadAdminApprovedAndRender();
    });
  }

  if (adminTabsRejectedBtn) {
    adminTabsRejectedBtn.addEventListener("click", async () => {
      setAdminTab("rejeitados");
      await renderAdminRejectedPanel();
    });
  }

  if (adminTabsRolesBtn) {
    adminTabsRolesBtn.addEventListener("click", async () => {
      setAdminTab("roles");
      await renderAdminRolesPanel();
    });
  }

  if (adminSearchInput) {
    adminSearchInput.addEventListener("input", () => {
      applyAdminActiveFilters();
    });
  }

  if (adminFilterCurso) {
    adminFilterCurso.addEventListener("change", () => {
      applyAdminActiveFilters();
    });
  }

  if (adminFilterTurma) {
    adminFilterTurma.addEventListener("change", () => {
      applyAdminActiveFilters();
    });
  }

  if (adminRolesForm && adminRoleLoginInput) {
    adminRolesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUserIsAdmin) {
        alert("Apenas administradores podem alterar esta lista.");
        return;
      }

      let login = adminRoleLoginInput.value.trim().toLowerCase();
      if (!login) {
        alert("Informe o login do servidor (ex: nome.sobrenome).");
        return;
      }

      if (!login.includes("@")) {
        login = `${login}@ifsc.edu.br`;
      }

      try {
        await rolesDb.addAdmin(login);
        adminRoleLoginInput.value = "";
        await renderAdminRolesPanel();
      } catch (err) {
        console.error("Erro ao adicionar admin:", err);
        alert("Não foi possível adicionar. Verifique suas permissões.");
      }
    });
  }

  if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", () => {
      showScreen(loginScreen);
    });
  }

  if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const ra = document.getElementById("req-ra")?.value.trim();
      const nome = document.getElementById("req-nome")?.value.trim();
      const curso = document.getElementById("req-curso")?.value;
      const turma = document.getElementById("req-turma")?.value;
      const dataNasc = document.getElementById("req-data-nasc")?.value;
      const respNome = document
        .getElementById("req-resp-nome")
        ?.value.trim();
      const respTel = document.getElementById("req-resp-tel")?.value.trim();
      const respOk = document.getElementById("req-resp-ok")?.checked;
      const saidaAutorizada =
        document.getElementById("req-saida-autorizada")?.checked;

      const fotoInput = document.getElementById("req-foto");
      const fotoFile =
        fotoInput && fotoInput.files && fotoInput.files[0]
          ? fotoInput.files[0]
          : null;

      if (
        !ra ||
        !nome ||
        !curso ||
        !turma ||
        !dataNasc ||
        !respNome ||
        !respTel
      ) {
        alert("Preencha todos os campos obrigatórios.");
        return;
      }

      if (!saidaAutorizada || !respOk) {
        alert(
          "É obrigatório marcar as duas declarações sobre a saída antecipada e a entrega do termo."
        );
        return;
      }

      let fotoDataUrl = null;
      if (fotoFile) {
        const maxBytes = 300 * 1024; // 300 KB
        if (fotoFile.size > maxBytes) {
          alert("A foto 3x4 deve ter no máximo 300 KB.");
          return;
        }
        try {
          fotoDataUrl = await readFileAsDataURL(fotoFile);
        } catch (err) {
          console.error("Erro ao ler foto:", err);
          alert("Não foi possível ler a foto. Tente novamente.");
          return;
        }
      }

      try {
        const saved = await db.createOrUpdateCurrentStudentCard({
          ra,
          nome,
          curso,
          turma,
          dataNascimento: dataNasc,
          responsavelNome: respNome,
          responsavelTelefone: respTel,
          responsavelOk: respOk,
          saidaAutorizada,
          fotoDataUrl
        });

        currentStudentCard = saved;

        updateHomeView();
        renderStudentCard(saved);
        showScreen(cardScreen);
        requestForm.reset();
      } catch (err) {
        console.error("Erro ao salvar carteira:", err);
        alert("Não foi possível salvar a carteira. Tente novamente.");
      }
    });
  }

  // BOTÃO "VOLTAR" na carteirinha (não desloga)
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      showScreen(loginScreen);
    });
  }

  // BOTÃO "VOLTAR" no admin (não desloga)
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
      showScreen(loginScreen);
    });
  }

  // SERVICE WORKER (PWA)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .catch((err) => console.error("SW falhou:", err));
    });
  }
});
