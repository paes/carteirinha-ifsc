# Configurar Regras do Firestore

## Problema: Missing or insufficient permissions

## Solução - Atualizar regras do Firestore:

1. **Acesse:** https://console.firebase.google.com/
2. **Projeto:** ifsc-carteirinha
3. **Firestore Database** → **Regras** (Rules)
4. **Substitua as regras atuais por:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para a coleção students
    match /students/{documentId} {
      // Permitir leitura para qualquer usuário autenticado
      allow read: if request.auth != null;
      
      // Permitir escrita se:
      // - Usuário está autenticado E
      // - Está criando seu próprio documento OU é admin
      allow write: if request.auth != null && (
        request.auth.token.email == resource.data.googleEmail ||
        request.auth.token.email == resource.data.email ||
        request.auth.token.email.matches('.*@ifsc\\.edu\\.br$') ||
        (!exists(resource.data) && request.auth.token.email == request.resource.data.googleEmail)
      );
    }
    
    // Permitir leitura/escrita para usuários autenticados em outras coleções
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. **Clique em "Publicar"**

## Regra simplificada (se a acima não funcionar):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Teste após configurar:
1. Limpe o cache do navegador
2. Tente enviar o formulário novamente
3. Verifique no console se não há mais erros de permissão
