// =============================
// Firebase (Auth + Firestore + Storage)
// =============================

const ADMIN_EMAILS = [
  "thiago.paes@ifsc.edu.br",
  "nauber.gavski@ifsc.edu.br",
  "miguel.zarth@ifsc.edu.br",
  "felix.medina@ifsc.edu.br",
  "coord.pedagogica.gpb@ifsc.edu.br"
];

function getFirebaseConfig() {
  if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;
  return null;
}

function requireFirebaseConfig() {
  const cfg = getFirebaseConfig();
  if (!cfg) {
    throw new Error(
      "Firebase não configurado. Defina window.__FIREBASE_CONFIG__ antes de usar o app."
    );
  }

  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "appId"
  ];
  const missing = requiredKeys.filter((k) => !cfg[k] || !String(cfg[k]).trim());
  if (missing.length > 0) {
    throw new Error(
      `Firebase configurado incompleto. Preencha firebase-config.js (faltando: ${missing.join(
        ", "
      )}).`
    );
  }

  return cfg;
}

function initFirebase() {
  const cfg = requireFirebaseConfig();
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(cfg);
  }
  return {
    auth: firebase.auth(),
    firestore: firebase.firestore(),
    storage: firebase.storage()
  };
}

function isAdminEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(lower);
}

async function signInWithGoogle(auth) {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    return await auth.signInWithPopup(provider);
  } catch (err) {
    if (err && err.code && String(err.code).includes("popup")) {
      await auth.signInWithRedirect(provider);
      return null;
    }
    throw err;
  }
}

async function signOut(auth) {
  await auth.signOut();
}

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

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file, opts) {
  const {
    maxWidth = 720,
    maxHeight = 960,
    mimeType = "image/jpeg",
    quality = 0.8,
    maxBytes = 500 * 1024  // 500KB
  } = opts || {};

  console.log(`🎯 Comprimindo imagem: ${(file.size / 1024).toFixed(1)}KB → alvo: ${(maxBytes / 1024).toFixed(0)}KB`);

  const dataUrl = await readFileAsDataURL(file);
  const img = new Image();
  const imgLoaded = new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });
  img.src = dataUrl;
  await imgLoaded;

  // Calcular dimensões ideais
  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  console.log(`📐 Dimensões originais: ${img.width}x${img.height} → ${width}x${height}`);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado.");
  
  // Usar qualidade alta para desenhar
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const blobFrom = (q) =>
    new Promise((resolve) => canvas.toBlob(resolve, mimeType, q));

  // Estratégia de compressão em múltiplos estágios
  let q = quality;
  let blob = await blobFrom(q);
  if (!blob) throw new Error("Falha ao gerar imagem.");

  console.log(`🔄 Tentativa inicial: qualidade ${(q * 100).toFixed(0)}% → ${(blob.size / 1024).toFixed(1)}KB`);

  // Estágio 1: Reduz qualidade gradualmente
  while (blob.size > maxBytes && q > 0.3) {
    q = Math.max(0.3, q - 0.1);
    blob = await blobFrom(q);
    if (!blob) break;
    console.log(`🔄 Reduzindo qualidade: ${(q * 100).toFixed(0)}% → ${(blob.size / 1024).toFixed(1)}KB`);
  }

  // Estágio 2: Se ainda for grande, reduz dimensões
  if (blob.size > maxBytes) {
    console.log(`📏 Ainda muito grande, reduzindo dimensões...`);
    
    let newWidth = width;
    let newHeight = height;
    
    // Reduzir dimensões em 10% a cada tentativa
    while (blob.size > maxBytes && newWidth > 400 && newHeight > 540) {
      newWidth = Math.round(newWidth * 0.9);
      newHeight = Math.round(newHeight * 0.9);
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      blob = await blobFrom(0.7);
      if (!blob) break;
      
      console.log(`📏 Reduzindo dimensões: ${newWidth}x${newHeight} → ${(blob.size / 1024).toFixed(1)}KB`);
    }
  }

  // Estágio 3: Última tentativa com qualidade muito baixa
  if (blob.size > maxBytes) {
    console.log(`⚡ Última tentativa com qualidade mínima...`);
    blob = await blobFrom(0.3);
    if (!blob) throw new Error("Falha ao gerar imagem.");
    console.log(`⚡ Qualidade mínima: ${(blob.size / 1024).toFixed(1)}KB`);
  }

  if (blob.size > maxBytes) {
    throw new Error(`Não foi possível comprimir a imagem para menos de ${(maxBytes / 1024).toFixed(0)}KB. Tamanho final: ${(blob.size / 1024).toFixed(1)}KB. Por favor, use uma imagem menor.`);
  }

  console.log(`✅ Compressão concluída: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB (${((1 - blob.size / file.size) * 100).toFixed(1)}% de redução)`);
  return blob;
}

function ensureIsoDate(value) {
  if (!value) return null;
  const m = String(value).match(/^\d{4}-\d{2}-\d{2}$/);
  if (!m) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return value;
}

// =============================
// UI / Fluxo de telas
// =============================

document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("login-screen");
  const homeScreen = document.getElementById("home-screen");
  const requestScreen = document.getElementById("request-screen");
  const cardScreen = document.getElementById("card-screen");
  const adminScreen = document.getElementById("admin-screen");

  const googleLoginBtn = document.getElementById("google-login-btn");
  const loginError = document.getElementById("login-error");
  const goToRequestBtn = document.getElementById("go-to-request");

  let fb;
  try {
    fb = initFirebase();
  } catch (err) {
    console.error(err);
    if (loginError) {
      loginError.textContent = String(err.message || err);
      loginError.classList.remove("hidden");
    }
    if (googleLoginBtn) {
      googleLoginBtn.disabled = true;
      googleLoginBtn.title = "Firebase não configurado";
    }
    if (goToRequestBtn) {
      goToRequestBtn.disabled = true;
      goToRequestBtn.title = "Firebase não configurado";
    }
    return;
  }

  function showScreen(screen) {
    [loginScreen, homeScreen, requestScreen, cardScreen, adminScreen].forEach((s) => {
      if (!s) return;
      s.classList.add("hidden");
    });
    if (screen) screen.classList.remove("hidden");
  }

  const userNameSpan = document.getElementById("user-name");
  const userEmailSpan = document.getElementById("user-email");

  const homeCardBtn = document.getElementById("home-card-btn");
  const homeCardMsg = document.getElementById("home-card-msg");
  const homeRequestBtn = document.getElementById("home-request-btn");
  const homeAdminBtn = document.getElementById("home-admin-btn");
  const homeLogoutBtn = document.getElementById("home-logout-btn");
  const homeViewAsStudentBtn = document.getElementById("home-view-as-student-btn");
  const homeBackAdminRoleBtn = document.getElementById("home-back-admin-role-btn");
  const adminStudentBanner = document.getElementById("admin-student-banner");

  let currentStudentCard = null;
  let currentUserIsAdmin = false;
  let isAdminStudentView = false; // admin está "vendo como aluno"?
  let adminApprovedList = [];

  function updateHomeView() {
    // Reset banner
    if (adminStudentBanner) {
      adminStudentBanner.classList.add("hidden");
      adminStudentBanner.textContent = "";
    }

    if (!currentUserIsAdmin) {
      // Usuário NÃO é admin → sempre modo aluno "normal"
      isAdminStudentView = false;
      if (homeAdminBtn) homeAdminBtn.classList.add("hidden");
      if (homeViewAsStudentBtn) homeViewAsStudentBtn.classList.add("hidden");
      if (homeBackAdminRoleBtn) homeBackAdminRoleBtn.classList.add("hidden");
      if (homeCardBtn) homeCardBtn.classList.remove("hidden");
      if (homeRequestBtn) homeRequestBtn.classList.remove("hidden");
      
      if (homeCardBtn) homeCardBtn.disabled = !currentStudentCard;
      if (homeCardMsg) {
        if (!currentStudentCard) {
          homeCardMsg.textContent = "Você ainda não possui carteira cadastrada. Clique em 'Solicitar / atualizar carteira'.";
        } else if (currentStudentCard.status === "approved") {
          homeCardMsg.textContent = "";
        } else if (currentStudentCard.status === "pending") {
          homeCardMsg.textContent = "Seu pedido está em análise. Ao abrir, a carteirinha será exibida como PENDENTE.";
        } else if (currentStudentCard.status === "rejected") {
          homeCardMsg.textContent = "Sua carteira está indeferida/desativada. Ao abrir, a carteirinha aparece como PENDENTE.";
        } else {
          homeCardMsg.textContent = "";
        }
      }
      return;
    }

    // Usuário É admin
    if (!isAdminStudentView) {
      // Modo servidor/admin
      if (homeAdminBtn) homeAdminBtn.classList.remove("hidden");
      if (homeViewAsStudentBtn) homeViewAsStudentBtn.classList.remove("hidden");
      if (homeBackAdminRoleBtn) homeBackAdminRoleBtn.classList.add("hidden");
      if (homeCardBtn) {
        homeCardBtn.classList.add("hidden");
        homeCardBtn.disabled = true;
      }
      if (homeRequestBtn) homeRequestBtn.classList.add("hidden");
      if (homeCardMsg) {
        homeCardMsg.textContent = "Você está logado como servidor administrador. Use o painel administrativo ou clique em 'Ver como aluno (teste)'.";
      }
    } else {
      // Admin em modo aluno (teste)
      if (adminStudentBanner) {
        adminStudentBanner.textContent = "Você é administrador e está visualizando o app como aluno (modo de teste). Qualquer carteira criada aqui é apenas para testes.";
        adminStudentBanner.classList.remove("hidden");
      }
      if (homeAdminBtn) homeAdminBtn.classList.add("hidden");
      if (homeViewAsStudentBtn) homeViewAsStudentBtn.classList.add("hidden");
      if (homeBackAdminRoleBtn) homeBackAdminRoleBtn.classList.remove("hidden");
      if (homeCardBtn) {
        homeCardBtn.classList.remove("hidden");
        homeCardBtn.disabled = !currentStudentCard;
      }
      if (homeRequestBtn) homeRequestBtn.classList.remove("hidden");
      
      if (homeCardMsg) {
        if (!currentStudentCard) {
          homeCardMsg.textContent = "Você ainda não possui carteira cadastrada. Clique em 'Solicitar / atualizar carteira'.";
        } else if (currentStudentCard.status === "approved") {
          homeCardMsg.textContent = "";
        } else if (currentStudentCard.status === "pending") {
          homeCardMsg.textContent = "Seu pedido está em análise. Ao abrir, a carteirinha será exibida como PENDENTE.";
        } else if (currentStudentCard.status === "rejected") {
          homeCardMsg.textContent = "Sua carteira está indeferida/desativada. Ao abrir, a carteirinha aparece como PENDENTE.";
        } else {
          homeCardMsg.textContent = "";
        }
      }
    }
  }

  let cardTimestampInterval = null;

  function startCardTimestampUpdate() {
    // Atualiza imediatamente
    updateCardTimestamp();
    // E depois a cada segundo
    if (cardTimestampInterval) clearInterval(cardTimestampInterval);
    cardTimestampInterval = setInterval(updateCardTimestamp, 1000);
  }

  function stopCardTimestampUpdate() {
    if (cardTimestampInterval) {
      clearInterval(cardTimestampInterval);
      cardTimestampInterval = null;
    }
  }

  function updateCardTimestamp() {
    const cardTimestamp = document.getElementById("card-timestamp");
    if (cardTimestamp) {
      const now = new Date();
      const dataHora = now.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      cardTimestamp.textContent = `Válido em: ${dataHora}`;
    }
  }

  async function renderStudentCard(user) {
    console.log("🎨 Iniciando renderStudentCard com dados:", user);
    
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

    // 👉 pega o container da carteirinha
    const cardElement = document.querySelector(".card");
    
    console.log("📋 Elementos da carteirinha encontrados:", {
      cardName: !!cardName,
      cardRa: !!cardRa,
      cardCourse: !!cardCourse,
      cardTurma: !!cardTurma,
      cardIdade: !!cardIdade,
      cardRespNome: !!cardRespNome,
      cardRespTel: !!cardRespTel,
      statusMsg: !!statusMsg,
      photoPlaceholder: !!photoPlaceholder,
      cardStamp: !!cardStamp,
      cardElement: !!cardElement
    });

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
      photoPlaceholder.style.backgroundImage = "none";
      photoPlaceholder.textContent = "FOTO";
      if (user.photoPath) {
        try {
          const url = await fb.storage.ref(user.photoPath).getDownloadURL();
          photoPlaceholder.style.backgroundImage = `url(${url})`;
          photoPlaceholder.textContent = "";
        } catch (err) {
          console.warn("Não foi possível carregar foto:", err);
        }
      }
    }
    // carimbo grande e situação
    if (cardStamp) {
      cardStamp.classList.remove("authorized", "pending");

      if (user.status === "approved") {
        cardStamp.textContent = "SAÍDA AUTORIZADA";
        cardStamp.classList.add("authorized");

        // tira o carimbão diagonal (carteira liberada)
        if (cardElement) {
          cardElement.classList.remove("card-pending");
        }
      } else {
        // para qualquer coisa que não seja "approved", mostra PENDENTE
        cardStamp.textContent = "PENDENTE";
        cardStamp.classList.add("pending");

        // coloca o carimbão diagonal vermelho por cima da carteirinha
        if (cardElement) {
          cardElement.classList.add("card-pending");
        }
      }
    }

    // Data/hora em tempo real na carteirinha (para evitar burlagem com screenshots)
    const cardTimestamp = document.getElementById("card-timestamp");
    if (cardTimestamp) {
      const now = new Date();
      const dataHora = now.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      cardTimestamp.textContent = `Válido em: ${dataHora}`;
    }

    if (statusMsg) {
      if (user.status === "approved") {
        statusMsg.textContent =
          "Carteira ativa. Saída antecipada autorizada.";
      } else if (user.status === "pending") {
        statusMsg.textContent =
          "Pedido em análise. Saída antecipada ainda pendente de autorização.";
      } else if (user.status === "rejected") {
        statusMsg.textContent =
          "Pedido indeferido. Saída antecipada não autorizada. Procure a coordenação.";
      } else {
        statusMsg.textContent = "Status da carteira não definido.";
      }
    }


  }

  // Função auxiliar para formatar data do pedido
  function formatRequestDate(timestamp) {
    if (!timestamp) return "-";
    // Firebase timestamp pode ser um objeto com toDate() ou já ser uma Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function renderAdminPanel() {
    const tbody = document.getElementById("admin-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const snap = await fb.firestore
      .collection("students")
      .where("status", "==", "pending")
      .get();
    const pendentes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (pendentes.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 8;
      td.textContent = "Nenhum pedido pendente.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    pendentes.forEach((u) => {
      const tr = document.createElement("tr");
      // Usar uid se existir, senão usar ra como fallback
      const docId = u.uid || u.ra;
      tr.innerHTML = `
        <td>${formatRequestDate(u.createdAt || u.updatedAt)}</td>
        <td>${u.nome}</td>
        <td>${u.ra}</td>
        <td>${u.curso}</td>
        <td>${u.turma || ""}</td>
        <td>${u.responsavelOk ? "Formulário entregue" : "A confirmar"}</td>
        <td>
          <button class="photo-btn" data-ra="${docId}">Ver foto</button>
        </td>
        <td>
          <button class="approve-btn" data-ra="${docId}">Aprovar</button>
          <button class="reject-btn" data-ra="${docId}">Rejeitar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    const photoModal = document.getElementById("photo-modal");
    const photoModalClose = document.getElementById("photo-modal-close");
    const photoModalImg = document.getElementById("photo-modal-img");

    function closePhotoModal() {
      if (photoModal) photoModal.classList.add("hidden");
      if (photoModalImg) photoModalImg.src = "";
    }

    if (photoModalClose) {
      photoModalClose.addEventListener("click", closePhotoModal);
    }

    tbody.querySelectorAll(".photo-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ra = btn.getAttribute("data-ra");
        await showPhotoModal(ra);
      });
    });

    tbody.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-ra");  // Agora é UID na prática
        fb.firestore
          .collection("students")
          .doc(uid)
          .update({ status: "approved", updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
          .then(() => renderAdminPanel());
      });
    });

    tbody.querySelectorAll(".reject-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-ra");  // Agora é UID na prática
        fb.firestore
          .collection("students")
          .doc(uid)
          .update({ status: "rejected", updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
          .then(() => renderAdminPanel());
      });
    });
  }

  const backToLoginBtn = document.getElementById("back-to-login");
  const requestForm = document.getElementById("request-form");
  const logoutBtn = document.getElementById("logout-btn");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");

  const dataNascInput = document.getElementById("req-data-nasc");
  if (dataNascInput && window.flatpickr) {
    flatpickr(dataNascInput, {
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      allowInput: true
    });
  }

  // BOTÃO GOOGLE LOGIN
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
      if (loginError) loginError.classList.add("hidden");
      try {
        await signInWithGoogle(fb.auth);
      } catch (err) {
        console.error(err);
        if (loginError) loginError.classList.remove("hidden");
      }
    });
  }

  // BOTÃO "SOLICITAR CARTEIRINHA"
  if (goToRequestBtn) {
    goToRequestBtn.addEventListener("click", async () => {
      if (loginError) loginError.classList.add("hidden");
      try {
        if (!fb.auth.currentUser) {
          await signInWithGoogle(fb.auth);
        }
        showScreen(requestScreen);
      } catch (err) {
        console.error(err);
        if (loginError) loginError.classList.remove("hidden");
      }
    });
  }

  // VOLTAR PARA LOGIN
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", () => {
      showScreen(homeScreen);
    });
  }

  // FORMULÁRIO DE SOLICITAÇÃO (agora async por causa da foto)
  if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentUser = fb.auth.currentUser;
      if (!currentUser || !currentUser.email) {
        alert("Faça login com Google para enviar sua solicitação.");
        return;
      }

      const ra = document.getElementById("req-ra")?.value.trim();
      const nome = document.getElementById("req-nome")?.value.trim();
      const curso = document.getElementById("req-curso")?.value;
      const turma = document.getElementById("req-turma")?.value;
      const dataNasc = document.getElementById("req-data-nasc")?.value;
      const email = document.getElementById("req-email")?.value.trim();
      const respNome = document.getElementById("req-resp-nome")?.value.trim();
      const respTel = document.getElementById("req-resp-tel")?.value.trim();
      const respOk = document.getElementById("req-resp-ok")?.checked;
      const saidaAutorizada =
        document.getElementById("req-saida-autorizada")?.checked;

      const fotoInput = document.getElementById("req-foto");
      const fotoFile =
        fotoInput && fotoInput.files && fotoInput.files[0]
          ? fotoInput.files[0]
          : null;

      if (!ra || !nome || !curso || !turma || !dataNasc || !email || !respNome || !respTel) {
        alert("Preencha todos os campos obrigatórios.");
        return;
      }

      // Foto é opcional por enquanto (problema CORS)
      if (fotoFile) {
        console.log("📷 Foto detectada, tentando upload...");
      } else {
        console.log("📷 Nenhuma foto enviada (opcional)");
      }

      const emailLower = email.toLowerCase();
      if (!emailLower.endsWith("@aluno.ifsc.edu.br") && !emailLower.endsWith("@ifsc.edu.br")) {
        alert("Informe um e-mail institucional válido (@aluno.ifsc.edu.br ou @ifsc.edu.br).");
        return;
      }

      const authEmailLower = String(currentUser.email || "").toLowerCase();
      if (!authEmailLower.endsWith("@aluno.ifsc.edu.br") && !authEmailLower.endsWith("@ifsc.edu.br")) {
        alert("Use sua conta Google institucional (@aluno.ifsc.edu.br ou @ifsc.edu.br) para entrar.");
        return;
      }

      const dataNascIso = ensureIsoDate(dataNasc);
      if (!dataNascIso) {
        alert("Informe a data de nascimento em um formato válido.");
        return;
      }

      let photoBase64 = null;
      if (fotoFile) {
        try {
          console.log("📷 Validando foto...");
          
          // Validações do arquivo
          if (!fotoFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
            throw new Error("Formato inválido. Apenas JPG e PNG são permitidos.");
          }
          
          console.log("📷 Processando foto para Firestore...");
          
          // Se o arquivo for grande, mostrar mensagem de compressão
          if (fotoFile.size > 500 * 1024) {
            console.log(`� Arquivo original: ${(fotoFile.size / 1024).toFixed(1)}KB - Iniciando compressão automática...`);
          }
          
          const blob = await compressImageFile(fotoFile, {
            maxWidth: 720,
            maxHeight: 960,
            mimeType: "image/jpeg",
            quality: 0.7,  // Reduzir qualidade para caber no Firestore
            maxBytes: 500 * 1024  // 500KB para não exceder limite do Firestore
          });
          
          // Converter para Base64
          photoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          // Validação final do Base64
          if (!photoBase64 || !photoBase64.startsWith('data:image/')) {
            throw new Error("Falha ao processar a imagem.");
          }
          
          console.log("✅ Foto validada e processada com sucesso!");
          console.log(`📊 Tamanho final: ${Math.round(photoBase64.length * 0.75 / 1024)}KB`);
          
        } catch (err) {
          console.error("❌ Erro ao processar foto:", err);
          
          // Mensagens específicas para cada tipo de erro
          let mensagemErro = "Erro na foto: ";
          
          if (err.message.includes("Formato inválido")) {
            mensagemErro += "A foto deve estar em formato JPG ou PNG.\n\n";
            mensagemErro += "Formatos aceitos: .jpg, .jpeg, .png\n";
            mensagemErro += "Por favor, converta sua imagem e tente novamente.";
          } else if (err.message.includes("muito grande")) {
            mensagemErro += "A foto é muito grande para processamento.\n\n";
            mensagemErro += "Tamanho máximo: 500KB\n";
            mensagemErro += "Sugestão: Use um aplicativo para reduzir o tamanho da imagem.";
          } else if (err.message.includes("Falha ao processar")) {
            mensagemErro += "Ocorreu um erro ao processar a imagem.\n\n";
            mensagemErro += "Tente usar outra foto ou verifique se o arquivo não está corrompido.";
          } else {
            mensagemErro += err.message + "\n\n";
            mensagemErro += "Por favor, verifique a foto e tente novamente.";
          }
          
          alert(mensagemErro);
          return; // Impede o envio do formulário
        }
      } else {
        console.log("⚠️ Nenhuma foto enviada (obrigatório)");
        alert("A foto 3x4 é obrigatória. Por favor, selecione uma imagem.");
        return;
      }

      const studentDoc = {
        ra,
        uid: currentUser.uid,  // Adicionar UID para admin encontrar
        googleEmail: authEmailLower,
        nome,
        curso,
        turma,
        dataNascimento: dataNascIso,
        email: emailLower,
        responsavelNome: respNome,
        responsavelTelefone: respTel,
        responsavelOk: !!respOk,
        saidaAutorizada: !!saidaAutorizada,
        photoBase64: photoBase64 || null,  // Armazenar como Base64 no Firestore
        role: "student",
        status: "pending",
        // Campos para compatibilidade com regras complexas
        ownerUid: currentUser.uid,
        ownerEmail: authEmailLower,
        ownerName: currentUser.displayName || nome,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const ref = fb.firestore.collection("students").doc(currentUser.uid);
      const existing = await ref.get();
      if (!existing.exists) {
        studentDoc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      }

      await ref.set(studentDoc, { merge: true });

      const saved = (await ref.get()).data();
      currentStudentCard = saved;
      updateHomeView();
      showScreen(homeScreen);

      requestForm.reset();
    });
  }

  // LOGOUT (estudante)
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      stopCardTimestampUpdate(); // Para atualização do timestamp
      showScreen(homeScreen);
    });
  }

  // LOGOUT (admin)
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", async () => {
      showScreen(homeScreen);
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

  fb.auth.onAuthStateChanged(async (user) => {
    if (!user) {
      currentStudentCard = null;
      currentUserIsAdmin = false;
      showScreen(loginScreen);
      return;
    }

    const email = user.email || "";
    currentUserIsAdmin = isAdminEmail(email);

    if (userNameSpan) userNameSpan.textContent = user.displayName || "Usuário IFSC";
    if (userEmailSpan) userEmailSpan.textContent = user.email || "";

    // carrega carteira do aluno (se existir)
    currentStudentCard = null;
    try {
      const snap = await fb.firestore
        .collection("students")
        .doc(user.uid)  // Usar UID em vez de buscar por email
        .get();

      if (snap.exists) {
        currentStudentCard = snap.data();
      }
    } catch (err) {
      console.error(err);
    }

    updateHomeView();
    showScreen(homeScreen);
  });

  if (homeCardBtn) {
    homeCardBtn.addEventListener("click", async () => {
      try {
        // Recarrega dados atualizados do Firestore para garantir status mais recente
        const currentUser = fb.auth.currentUser;
        if (!currentUser) {
          alert("Faça login para acessar sua carteirinha.");
          return;
        }
        
        const email = currentUser.email || "";
        console.log("🔍 Buscando carteirinha para:", email);
        
        const snap = await fb.firestore
          .collection("students")
          .doc(currentUser.uid)  // Usar UID em vez de buscar por email
          .get();
        
        let studentData = null;
        if (snap.exists) {
          studentData = snap.data();
          currentStudentCard = studentData; // atualiza cache
          console.log("✅ Carteirinha encontrada:", studentData);
        } else {
          console.log("❌ Nenhuma carteirinha encontrada para:", email);
        }
        
        if (!studentData) {
          alert("Você ainda não possui carteira cadastrada. Clique em 'Solicitar / atualizar carteira'.");
          return;
        }
        
        console.log("🎨 Renderizando carteirinha...");
        await renderStudentCard(studentData);
        startCardTimestampUpdate();
        showScreen(cardScreen);
        console.log("✅ Carteirinha exibida com sucesso!");
      } catch (err) {
        console.error("❌ Erro ao abrir carteirinha:", err);
        alert("Não foi possível abrir a carteirinha. Erro: " + err.message);
      }
    });
  }

  if (homeRequestBtn) {
    homeRequestBtn.addEventListener("click", () => {
      // Preenche o email institucional automaticamente com o email logado
      const currentUser = fb.auth.currentUser;
      const emailInput = document.getElementById("req-email");
      if (currentUser && emailInput) {
        emailInput.value = currentUser.email || "";
      }
      
      // Preenche a data de nascimento com 15 anos antes da data atual
      const dataNascInput = document.getElementById("req-data-nasc");
      if (dataNascInput) {
        const dataAtual = new Date();
        const dataPadrao = new Date(dataAtual.getFullYear() - 15, dataAtual.getMonth(), dataAtual.getDate());
        const dataFormatada = dataPadrao.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        dataNascInput.value = dataFormatada;
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
      try {
        await renderAdminPanel();
        showScreen(adminScreen);
      } catch (err) {
        console.error(err);
        alert("Não foi possível carregar o painel administrativo.");
      }
    });
  }

  if (homeLogoutBtn) {
    homeLogoutBtn.addEventListener("click", async () => {
      await signOut(fb.auth);
      showScreen(loginScreen);
    });
  }

  // =============================
  // ADMIN: Variáveis e elementos das abas
  // =============================
  const adminTabsPendingBtn = document.getElementById("admin-tab-pendentes");
  const adminTabsActiveBtn = document.getElementById("admin-tab-ativos");
  const adminTabsRejectedBtn = document.getElementById("admin-tab-rejeitados");
  const adminTabsRolesBtn = document.getElementById("admin-tab-roles");

  const adminPendentesArea = document.getElementById("admin-pendentes-area");
  const adminAtivosArea = document.getElementById("admin-ativos-area");
  const adminRejeitadosArea = document.getElementById("admin-rejeitados-area");
  const adminRolesArea = document.getElementById("admin-roles-area");

  const adminAtivosBody = document.getElementById("admin-ativos-body");
  const adminRejeitadosBody = document.getElementById("admin-rejeitados-body");
  const adminRolesBody = document.getElementById("admin-roles-body");

  const adminSearchInput = document.getElementById("admin-search");
  const adminFilterCurso = document.getElementById("admin-filter-curso");
  const adminFilterTurma = document.getElementById("admin-filter-turma");

  const adminRolesForm = document.getElementById("admin-roles-form");
  const adminRoleLoginInput = document.getElementById("admin-role-login");

  // =============================
  // ADMIN: Funções de controle de abas
  // =============================
  function setAdminTab(tabName) {
    const configs = [
      { name: "pendentes", btn: adminTabsPendingBtn, area: adminPendentesArea },
      { name: "ativos", btn: adminTabsActiveBtn, area: adminAtivosArea },
      { name: "rejeitados", btn: adminTabsRejectedBtn, area: adminRejeitadosArea },
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
  // Função auxiliar para mostrar foto no modal (usada por todas as abas)
  // =============================
  async function showPhotoModal(ra) {
    const photoModal = document.getElementById("photo-modal");
    const photoModalImg = document.getElementById("photo-modal-img");
    
    if (!ra) {
      alert("RA não informado.");
      return;
    }
    
    try {
      const doc = await fb.firestore.collection("students").doc(ra).get();
      const data = doc.exists ? doc.data() : null;
      
      // Verificar se tem foto em Base64 ou no Storage antigo
      if (!data || (!data.photoBase64 && !data.photoPath)) {
        alert("Aluno não enviou foto.");
        return;
      }
      
      // Usar Base64 se disponível
      if (data.photoBase64) {
        if (photoModalImg) photoModalImg.src = data.photoBase64;
        if (photoModal) photoModal.classList.remove("hidden");
      } 
      // Fallback para Storage antigo
      else if (data.photoPath) {
        try {
          const url = await fb.storage.ref(data.photoPath).getDownloadURL();
          if (photoModalImg) photoModalImg.src = url;
          if (photoModal) photoModal.classList.remove("hidden");
        } catch (storageErr) {
          console.error("Erro ao carregar do Storage:", storageErr);
          alert("Foto não encontrada no Storage. Tente novamente.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Não foi possível carregar a foto.");
    }
  }

  // =============================
  // ADMIN: Funções de renderização das abas
  // =============================
  
  // Aba Ativos (com filtros)
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
      td.colSpan = 9;
      td.textContent = "Nenhuma carteira ativa encontrada.";
      tr.appendChild(td);
      adminAtivosBody.appendChild(tr);
      return;
    }

    filtered.forEach((u) => {
      const tr = document.createElement("tr");
      // Usar uid se existir, senão usar ra como fallback
      const docId = u.uid || u.ra;
      tr.innerHTML = `
        <td>${formatRequestDate(u.createdAt || u.updatedAt)}</td>
        <td><button class="photo-btn" data-ra="${docId}">Ver foto</button></td>
        <td>${u.nome || ""}</td>
        <td>${u.ra || ""}</td>
        <td>${u.curso || ""}</td>
        <td>${u.turma || ""}</td>
        <td>${u.responsavelNome || ""}</td>
        <td>${formatPhone(u.responsavelTelefone || "")}</td>
        <td>
          <button class="deactivate-btn" data-ra="${docId}">Desativar</button>
        </td>
      `;
      adminAtivosBody.appendChild(tr);
    });

    adminAtivosBody.querySelectorAll(".deactivate-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ra = btn.getAttribute("data-ra");
        const ok = confirm("Deseja realmente desativar esta carteira?");
        if (!ok) return;
        try {
          // Verificar se o documento existe antes de atualizar
          const docRef = fb.firestore.collection("students").doc(ra);
          const doc = await docRef.get();
          
          if (!doc.exists) {
            alert("Erro: Este aluno não foi encontrado no sistema.");
            await loadAdminApprovedAndRender(); // Recarregar a lista
            return;
          }
          
          await docRef.update({
            status: "rejected",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await loadAdminApprovedAndRender();
        } catch (err) {
          console.error(err);
          alert("Não foi possível desativar. " + err.message);
        }
      });
    });

    // Event listeners para botões "Ver foto" na aba Ativos
    adminAtivosBody.querySelectorAll(".photo-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ra = btn.getAttribute("data-ra");
        await showPhotoModal(ra);
      });
    });
  }

  async function loadAdminApprovedAndRender() {
    const snap = await fb.firestore.collection("students").where("status", "==", "approved").get();
    adminApprovedList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    applyAdminActiveFilters();
  }

  // Aba Rejeitados
  async function renderAdminRejectedPanel() {
    if (!adminRejeitadosBody) return;
    adminRejeitadosBody.innerHTML = "";

    const snap = await fb.firestore.collection("students").where("status", "==", "rejected").get();
    const rejeitados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (rejeitados.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 9;
      td.textContent = "Nenhum pedido rejeitado/desativado.";
      tr.appendChild(td);
      adminRejeitadosBody.appendChild(tr);
      return;
    }

    rejeitados.forEach((u) => {
      const tr = document.createElement("tr");
      // Usar uid se existir, senão usar ra como fallback
      const docId = u.uid || u.ra;
      tr.innerHTML = `
        <td>${formatRequestDate(u.createdAt || u.updatedAt)}</td>
        <td><button class="photo-btn" data-ra="${docId}">Ver foto</button></td>
        <td>${u.nome || ""}</td>
        <td>${u.ra || ""}</td>
        <td>${u.curso || ""}</td>
        <td>${u.turma || ""}</td>
        <td>${u.responsavelNome || ""}</td>
        <td>${formatPhone(u.responsavelTelefone || "")}</td>
        <td>
          <button class="reapprove-btn" data-ra="${docId}">Tornar ativa</button>
          <button class="delete-btn" data-ra="${docId}">Excluir</button>
        </td>
      `;
      adminRejeitadosBody.appendChild(tr);
    });

    adminRejeitadosBody.querySelectorAll(".reapprove-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ra = btn.getAttribute("data-ra");
        const ok = confirm("Reaprovar este pedido?");
        if (!ok) return;
        try {
          await fb.firestore.collection("students").doc(ra).update({
            status: "approved",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await renderAdminRejectedPanel();
        } catch (err) {
          console.error(err);
          alert("Não foi possível reaprovar.");
        }
      });
    });

    // Botões de excluir na aba Rejeitados
    adminRejeitadosBody.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ra = btn.getAttribute("data-ra");
        const ok = confirm("Tem certeza que deseja EXCLUIR permanentemente este pedido?\n\nEsta ação não pode ser desfeita!");
        if (!ok) return;
        try {
          // Verificar se o documento existe antes de excluir
          const docRef = fb.firestore.collection("students").doc(ra);
          const doc = await docRef.get();
          
          if (!doc.exists) {
            alert("Erro: Este aluno não foi encontrado no sistema.");
            await renderAdminRejectedPanel(); // Recarregar a lista
            return;
          }
          
          await docRef.delete();
          await renderAdminRejectedPanel();
        } catch (err) {
          console.error(err);
          alert("Não foi possível excluir. " + err.message);
        }
      });
    });

    // Event listeners para botões "Ver foto" na aba Rejeitados
    adminRejeitadosBody.querySelectorAll(".photo-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ra = btn.getAttribute("data-ra");
        await showPhotoModal(ra);
      });
    });
  }

  // Aba Roles (Administradores)
  async function renderAdminRolesPanel() {
    if (!adminRolesBody) return;
    adminRolesBody.innerHTML = "";

    if (!currentUserIsAdmin) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = "Apenas administradores podem visualizar esta área.";
      tr.appendChild(td);
      adminRolesBody.appendChild(tr);
      return;
    }

    // Lista fixa de admins (bootstrap)
    const fixedAdmins = [
      "thiago.paes@ifsc.edu.br",
      "nauber.gavski@ifsc.edu.br", 
      "miguel.zarth@ifsc.edu.br",
      "felix.medina@ifsc.edu.br",
      "coord.pedagogica.gpb@ifsc.edu.br"
    ];

    let admins = fixedAdmins.map(email => ({ email, role: "admin", fromBootstrap: true }));

    admins.sort((a, b) => (a.email || "").localeCompare(b.email || ""));

    admins.forEach((adm) => {
      const tr = document.createElement("tr");
      const label = adm.fromBootstrap ? " (fixo)" : "";
      tr.innerHTML = `
        <td>${adm.email}</td>
        <td>${adm.role || "admin"}${label}</td>
        <td>
          ${adm.fromBootstrap 
            ? "<span style='font-size:0.8rem;color:#777'>Não removível</span>" 
            : `<button class="remove-admin-btn" data-email="${adm.email}">Remover</button>`}
        </td>
      `;
      adminRolesBody.appendChild(tr);
    });
  }

  // =============================
  // ADMIN: Event listeners das abas
  // =============================
  if (adminTabsPendingBtn) {
    adminTabsPendingBtn.addEventListener("click", async () => {
      setAdminTab("pendentes");
      await renderAdminPanel();
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

  // Filtros
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

  // Form de adicionar admin
  if (adminRolesForm && adminRoleLoginInput) {
    adminRolesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUserIsAdmin) {
        alert("Apenas administradores podem alterar esta lista.");
        return;
      }

      let login = adminRoleLoginInput.value.trim().toLowerCase();
      if (!login) {
        alert("Informe o login do servidor.");
        return;
      }

      if (!login.includes("@")) {
        login = `${login}@ifsc.edu.br`;
      }

      alert(`Admin ${login} seria adicionado (funcionalidade simulada).`);
      adminRoleLoginInput.value = "";
      await renderAdminRolesPanel();
    });
  }

  // =============================
  // SWITCH DE PAPEL: Admin <-> Aluno
  // =============================
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

  // Atualizar renderAdminPanel para usar setAdminTab
  const originalRenderAdminPanel = renderAdminPanel;
  renderAdminPanel = async function() {
    await originalRenderAdminPanel();
    setAdminTab("pendentes");
  };

  // BOTÃO DE COMPARTILHAR NO WHATSAPP
  const shareLinksBtn = document.getElementById("share-links-btn");
  if (shareLinksBtn) {
    shareLinksBtn.addEventListener("click", () => {
      const mensagem = encodeURIComponent(
        "📋 *Links úteis para Carteira de Saída Antecipada - IFSC Câmpus Garopaba*\n\n" +
        "📄 *Modelo de autorização em PDF:*\n" +
        "https://drive.google.com/file/d/1quMZtj1anlwpyKQMkZf6BSiIJJZBwkDA/view\n\n" +
        "✍️ *Assinador gov.br:*\n" +
        "https://assinador.iti.br/\n\n" +
        "📝 *Formulário institucional completo:*\n" +
        "https://docs.google.com/forms/d/e/1FAIpQLSdc7TBD05qC_7_iKxxi9TDlT6W5kWzR3qtEQNR-lCkMWXa1lQ/viewform\n\n" +
        "📱 *Sistema LiberaIFSC:*\n" +
        "https://carteirinha-ifsc.netlify.app/\n\n" +
        "_Compartilhado pelo sistema LiberaIFSC_"
      );
      
      const url = `https://wa.me/?text=${mensagem}`;
      window.open(url, '_blank');
    });
  }

  // BLOQUEIO DE ORIENTAÇÃO FORTE
  function lockOrientation() {
    // Tentar bloquear orientação via Screen Orientation API
    if (screen && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(err => {
        console.log('⚠️ Não foi possível bloquear orientação:', err);
      });
    }
    
    // Alternativas para diferentes navegadores
    if (screen && screen.lockOrientation) {
      screen.lockOrientation('portrait');
    }
    
    if (window.screen && window.screen.lockOrientation) {
      window.screen.lockOrientation('portrait');
    }
  }

  // Bloquear orientação ao carregar
  lockOrientation();
  
  // Bloquear orientação quando a tela fica visível
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lockOrientation();
    }
  });
  
  // Bloquear orientação quando o foco retorna
  window.addEventListener('focus', lockOrientation);
  
  // Prevenir rotação via eventos de orientação
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      if (window.orientation === 90 || window.orientation === -90) {
        // Forçar volta ao retrato
        lockOrientation();
        // Mostrar alerta
        if (confirm('📱 Por favor, mantenha seu celular na vertical (retrato) para usar o sistema.')) {
          lockOrientation();
        }
      }
    }, 100);
  });

  // EXIBIR INFORMAÇÕES DO ARQUIVO DE FOTO
  const fotoInput = document.getElementById("req-foto");
  const fileInfo = document.getElementById("file-info");
  const fileName = document.getElementById("file-name");
  const fileSize = document.getElementById("file-size");
  const compressionStatus = document.getElementById("compression-status");

  // FILTRAGEM DE TURMAS POR CURSO
  const cursoSelect = document.getElementById("req-curso");
  const turmaSelect = document.getElementById("req-turma");

  // Mapeamento de cursos para turmas
  const turmasPorCurso = {
    "Curso Técnico Integrado em Administração": ["ADM24", "ADM25", "ADM26"],
    "Curso Técnico Integrado em Informática": ["INF24", "INF25", "INF26"],
    "Curso Técnico Integrado em Lazer": ["LAZ25", "LAZ26"],
    "Curso Técnico Concomitante em Biotecnologia": ["BIT23", "BIT24", "BIT25", "BIT26"]
  };

  if (cursoSelect && turmaSelect) {
    cursoSelect.addEventListener("change", () => {
      const cursoSelecionado = cursoSelect.value;
      
      // Limpar opções atuais
      turmaSelect.innerHTML = '<option value="">Selecione...</option>';
      
      if (cursoSelecionado && turmasPorCurso[cursoSelecionado]) {
        // Adicionar turmas correspondentes ao curso
        turmasPorCurso[cursoSelecionado].forEach(turma => {
          const option = document.createElement("option");
          option.value = turma;
          option.textContent = turma;
          turmaSelect.appendChild(option);
        });
        turmaSelect.disabled = false;
      } else {
        // Se não houver curso selecionado, desabilitar turma
        turmaSelect.innerHTML = '<option value="">Selecione um curso primeiro...</option>';
        turmaSelect.disabled = true;
      }
    });

    // Desabilitar turma inicialmente
    turmaSelect.disabled = true;
  }

  if (fotoInput && fileInfo && fileName && fileSize && compressionStatus) {
    fotoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      
      if (file) {
        // Exibir informações do arquivo
        fileName.textContent = file.name;
        
        // Formatar tamanho do arquivo
        const bytes = file.size;
        let sizeText;
        let sizeClass = "file-ok";
        
        if (bytes < 1024) {
          sizeText = bytes + " B";
        } else if (bytes < 1024 * 1024) {
          const kb = (bytes / 1024).toFixed(1);
          sizeText = kb + " KB";
          
          // Verificar se está próximo ou acima do limite
          if (kb > 500) {
            sizeClass = "file-too-large";
            sizeText += " (será comprimido automaticamente)";
          } else if (kb > 400) {
            sizeClass = "file-large";
            sizeText += " (pode ser comprimido)";
          }
        } else {
          const mb = (bytes / (1024 * 1024)).toFixed(1);
          sizeText = mb + " MB";
          sizeClass = "file-too-large";
          sizeText += " (será comprimido automaticamente)";
        }
        
        fileSize.textContent = sizeText;
        
        // Aplicar classe CSS correspondente
        fileInfo.className = "file-info " + sizeClass;
        fileInfo.style.display = "block";
        
        // Se for grande, mostrar que será comprimido
        if (bytes > 500 * 1024) {
          compressionStatus.style.display = "block";
        } else {
          compressionStatus.style.display = "none";
        }
      } else {
        // Esconder informações se não houver arquivo
        fileInfo.style.display = "none";
        compressionStatus.style.display = "none";
      }
    });
  }
});
