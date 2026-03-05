# Como configurar CORS no Firebase Storage

## Passo 1: Acessar o Firebase Console
1. Acesse: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Selecione o projeto: **ifsc-carteirinha**

## Passo 2: Configurar regras de segurança do Storage
1. No menu lateral, vá em **Storage**
2. Clique na aba **Regras** (Rules)
3. Você verá algo como:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Passo 3: Atualizar as regras
Substitua as regras por:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permite leitura pública para fotos de alunos
    match /students/{ra}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Permite escrita para usuários autenticados
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Passo 4: Configurar CORS (via gsutil)
Se as regras acima não funcionarem, use o gsutil:

1. **Instale o gsutil** (se não tiver):
   - Windows: Baixe o Google Cloud SDK
   - Ou use: https://cloud.google.com/storage/docs/gsutil_install

2. **Configure o gsutil**:
   ```bash
   gcloud auth login
   gcloud config set project ifsc-carteirinha
   ```

3. **Crie o arquivo cors.json**:
   ```json
   [
     {
       "origin": ["https://paes.github.io", "http://localhost:5173"],
       "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
       "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

4. **Aplique as regras CORS**:
   ```bash
   gsutil cors set cors.json gs://ifsc-carteirinha.firebasestorage.app
   ```

## Passo 5: Verificar configuração
```bash
gsutil cors get gs://ifsc-carteirinha.firebasestorage.app
```

## Solução Alternativa (se gsutil não funcionar)

Use o Firebase Storage via **URL assinada** ou configure via **console do Google Cloud**:

1. Acesse: https://console.cloud.google.com/
2. Projeto: ifsc-carteirinha
3. Vá em: Cloud Storage → Browser
4. Selecione o bucket: ifsc-carteirinha.firebasestorage.app
5. Clique na aba **Proteção** (Protection)
6. Configure CORS lá

## Teste após configuração
1. Limpe o cache do navegador
2. Tente fazer upload de uma foto
3. Verifique no console se não há mais erros CORS

## Se ainda não funcionar
Pode ser necessário configurar o **app.json** do projeto ou usar um domínio personalizado.

Me avise quando configurar as regras para testarmos!
