// =============================
// "Banco" em localStorage
// =============================

const USERS_KEY = "ifscCarteirinhaUsers_v1";
const SESSION_KEY = "ifscCarteirinhaSession_v1";

function loadUsers() {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

function setSession(ra) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ra }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const db = {
  findUserByRa(ra) {
    return loadUsers().find((u) => u.ra === ra);
  },

  createOrUpdateStudent({
    ra,
    senha,
    nome,
    curso,
    turma,
    dataNascimento,
    email,
    idade,
    responsavelNome,
    responsavelTelefone,
    responsavelOk,
    saidaAutorizada,
    fotoDataUrl
  }) {
    const users = loadUsers();
    let user = users.find((u) => u.ra === ra);

    if (!user) {
      user = {
        ra,
        senha,
        nome,
        curso,
        turma,
        dataNascimento: dataNascimento || null,
        email: email || "",
        idade: idade || "",
        responsavelNome,
        responsavelTelefone,
        role: "student",
        status: "pending", // sempre inicia pendente
        responsavelOk: !!responsavelOk,
        saidaAutorizada: !!saidaAutorizada,
        fotoDataUrl: fotoDataUrl || null
      };
      users.push(user);
    } else {
      if (senha) user.senha = senha;
      if (nome) user.nome = nome;
      if (curso) user.curso = curso;
      if (turma) user.turma = turma;
      if (dataNascimento) user.dataNascimento = dataNascimento;
      if (email) user.email = email;
      if (idade) user.idade = idade;
      if (responsavelNome) user.responsavelNome = responsavelNome;
      if (responsavelTelefone) user.responsavelTelefone = responsavelTelefone;
      user.responsavelOk = !!responsavelOk;
      if (saidaAutorizada !== undefined) {
        user.saidaAutorizada = !!saidaAutorizada;
      }
      if (fotoDataUrl) {
        user.fotoDataUrl = fotoDataUrl;
      }
      if (!user.role) user.role = "student";
      if (!user.status) user.status = "pending";
    }

    saveUsers(users);
    return user;
  },

  updateStudentStatus(ra, newStatus) {
    const users = loadUsers();
    const user = users.find((u) => u.ra === ra && u.role === "student");
    if (!user) return null;
    user.status = newStatus;
    saveUsers(users);
    return user;
  },

  listPendingStudents() {
    return loadUsers().filter(
      (u) => u.role === "student" && u.status === "pending"
    );
  }
};

// =============================
// Auth (com admin hard-coded)
// =============================

const auth = {
  login(ra, senha) {
    if (ra === "admin" && senha === "admin123") {
      setSession("admin");
      return {
        ra: "admin",
        nome: "Administrador",
        role: "admin",
        status: "approved"
      };
    }

    const user = db.findUserByRa(ra);
    if (!user) return null;
    if (user.senha !== senha) return null;
    setSession(user.ra);
    return user;
  },

  logout() {
    clearSession();
  },

  getCurrentUser() {
    const session = getSession();
    if (!session) return null;

    if (session.ra === "admin") {
      return {
        ra: "admin",
        nome: "Administrador",
        role: "admin",
        status: "approved"
      };
    }

    const user = db.findUserByRa(session.ra);
    if (!user) {
      clearSession();
      return null;
    }
    return user;
  }
};

// =============================
// Utils
// =============================

// idade a partir da data de nascimento
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

// formatação bonitinha do telefone
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

// ler arquivo como DataURL (para armazenar imagem no localStorage)
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

  function showScreen(screen) {
    [loginScreen, requestScreen, cardScreen, adminScreen].forEach((s) => {
      if (!s) return;
      s.classList.add("hidden");
    });
    if (screen) screen.classList.remove("hidden");
  }

  function renderStudentCard(user) {
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

    if (cardName) cardName.textContent = user.nome || "";
    if (cardRa) cardRa.textContent = user.ra || "";
    if (cardCourse) cardCourse.textContent = user.curso || "";
    if (cardTurma) cardTurma.textContent = user.turma || "";

    if (cardIdade) {
      let idadeTexto = "";
      if (user.dataNascimento) {
        idadeTexto = calcularIdadeAPartirDeData(user.dataNascimento);
      } else if (user.idade) {
        idadeTexto = user.idade;
      }
      cardIdade.textContent = idadeTexto;
    }

    if (cardRespNome) cardRespNome.textContent = user.responsavelNome || "";
    if (cardRespTel) cardRespTel.textContent = formatPhone(user.responsavelTelefone || "");

    // foto 3x4
    if (photoPlaceholder) {
      if (user.fotoDataUrl) {
        photoPlaceholder.style.backgroundImage = `url(${user.fotoDataUrl})`;
        photoPlaceholder.textContent = "";
      } else {
        photoPlaceholder.style.backgroundImage = "none";
        photoPlaceholder.textContent = "FOTO";
      }
    }

    // carimbo grande e situação
    if (cardStamp) {
      cardStamp.classList.remove("authorized", "pending");

      if (user.status === "approved") {
        cardStamp.textContent = "SAÍDA AUTORIZADA";
        cardStamp.classList.add("authorized");
      } else {
        cardStamp.textContent = "PENDENTE";
        cardStamp.classList.add("pending");
      }
    }

    if (statusMsg) {
      if (user.status === "approved") {
        statusMsg.textContent = "Carteirinha ativa. Saída antecipada autorizada.";
      } else if (user.status === "pending") {
        statusMsg.textContent =
          "Pedido em análise. Saída antecipada ainda pendente de autorização.";
      } else if (user.status === "rejected") {
        statusMsg.textContent =
          "Pedido indeferido. Saída antecipada não autorizada. Procure a coordenação.";
      } else {
        statusMsg.textContent = "Status da carteirinha não definido.";
      }
    }
  }

  function renderAdminPanel() {
    const tbody = document.getElementById("admin-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const pendentes = db.listPendingStudents();

    if (pendentes.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Nenhum pedido pendente.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    pendentes.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nome}</td>
        <td>${u.ra}</td>
        <td>${u.curso}</td>
        <td>${u.turma || ""}</td>
        <td>${u.responsavelOk ? "Formulário entregue" : "A confirmar"}</td>
        <td>
          <button class="approve-btn" data-ra="${u.ra}">Aprovar</button>
          <button class="reject-btn" data-ra="${u.ra}">Rejeitar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ra = btn.getAttribute("data-ra");
        db.updateStudentStatus(ra, "approved");
        renderAdminPanel();
      });
    });

    tbody.querySelectorAll(".reject-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ra = btn.getAttribute("data-ra");
        db.updateStudentStatus(ra, "rejected");
        renderAdminPanel();
      });
    });
  }

  // Decide tela inicial
  const current = auth.getCurrentUser();
  if (!current) {
    showScreen(loginScreen);
  } else if (current.role === "admin") {
    renderAdminPanel();
    showScreen(adminScreen);
  } else {
    renderStudentCard(current);
    showScreen(cardScreen);
  }

  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const goToRequestBtn = document.getElementById("go-to-request");
  const backToLoginBtn = document.getElementById("back-to-login");
  const requestForm = document.getElementById("request-form");
  const logoutBtn = document.getElementById("logout-btn");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");

  // LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (loginError) loginError.classList.add("hidden");

      const ra = document.getElementById("ra")?.value.trim();
      const senha = document.getElementById("password")?.value || "";

      const user = auth.login(ra, senha);
      if (!user) {
        if (loginError) loginError.classList.remove("hidden");
        return;
      }

      if (user.role === "admin") {
        renderAdminPanel();
        showScreen(adminScreen);
      } else {
        renderStudentCard(user);
        showScreen(cardScreen);
      }

      loginForm.reset();
    });
  }

  // BOTÃO "SOLICITAR CARTEIRINHA"
  if (goToRequestBtn) {
    goToRequestBtn.addEventListener("click", () => {
      showScreen(requestScreen);
    });
  }

  // VOLTAR PARA LOGIN
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", () => {
      showScreen(loginScreen);
    });
  }

  // FORMULÁRIO DE SOLICITAÇÃO (agora async por causa da foto)
  if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const ra = document.getElementById("req-ra")?.value.trim();
      const nome = document.getElementById("req-nome")?.value.trim();
      const curso = document.getElementById("req-curso")?.value;
      const turma = document.getElementById("req-turma")?.value;
      const dataNasc = document.getElementById("req-data-nasc")?.value;
      const email = document.getElementById("req-email")?.value.trim();
      const respNome = document.getElementById("req-resp-nome")?.value.trim();
      const respTel = document.getElementById("req-resp-tel")?.value.trim();
      const senha = document.getElementById("req-senha")?.value || "";
      const senha2 = document.getElementById("req-senha2")?.value || "";
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
        !email ||
        !respNome ||
        !respTel ||
        !senha ||
        !senha2
      ) {
        alert("Preencha todos os campos obrigatórios.");
        return;
      }

      if (senha !== senha2) {
        alert("As senhas não coincidem. Verifique e tente novamente.");
        return;
      }

      const emailLower = email.toLowerCase();
      if (!emailLower.endsWith("@aluno.ifsc.edu.br")) {
        alert("Informe um e-mail institucional válido (@aluno.ifsc.edu.br).");
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

      const user = db.createOrUpdateStudent({
        ra,
        senha,
        nome,
        curso,
        turma,
        dataNascimento: dataNasc,
        email,
        responsavelNome: respNome,
        responsavelTelefone: respTel,
        responsavelOk: respOk,
        saidaAutorizada,
        fotoDataUrl
      });

      setSession(user.ra);
      renderStudentCard(user);
      showScreen(cardScreen);

      requestForm.reset();
    });
  }

  // LOGOUT (estudante)
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.logout();
      showScreen(loginScreen);
    });
  }

  // LOGOUT (admin)
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
      auth.logout();
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
