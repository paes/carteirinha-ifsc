// Script para limpar registros do thiago.paes@ifsc.edu.br
// Execute este código no console do navegador (F12 → Console)

async function limparRegistrosThiago() {
  try {
    console.log("🔍 Buscando registros para thiago.paes@ifsc.edu.br...");
    
    // Buscar todos os documentos do email
    const snap = await fb.firestore
      .collection("students")
      .where("googleEmail", "==", "thiago.paes@ifsc.edu.br")
      .get();
    
    if (snap.empty) {
      console.log("✅ Nenhum registro encontrado para thiago.paes@ifsc.edu.br");
      return;
    }
    
    console.log(`📋 Encontrados ${snap.size} registros para limpar:`);
    
    // Lista todos os registros encontrados
    snap.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`- RA: ${data.ra}, Nome: ${data.nome}, Status: ${data.status}`);
    });
    
    // Confirmar exclusão
    const confirmar = confirm(`Deseja EXCLUIR ${snap.size} registros de thiago.paes@ifsc.edu.br?\n\nEsta ação NÃO pode ser desfeita!`);
    
    if (!confirmar) {
      console.log("❌ Operação cancelada pelo usuário");
      return;
    }
    
    // Excluir todos os documentos
    const batch = fb.firestore.batch();
    snap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ ${snap.size} registros excluídos com sucesso!`);
    
    // Limpar cache local
    if (typeof currentStudentCard !== 'undefined') {
      currentStudentCard = null;
    }
    if (typeof updateHomeView !== 'undefined') {
      updateHomeView();
    }
    
    alert(`${snap.size} registros de thiago.paes@ifsc.edu.br foram excluídos com sucesso!`);
    
  } catch (err) {
    console.error("❌ Erro ao limpar registros:", err);
    alert("Erro ao limpar registros: " + err.message);
  }
}

// Executar a função
limparRegistrosThiago();
