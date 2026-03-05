# Onde encontrar as regras do Firebase Storage

## Opção 1: Firebase Console (mais provável)

1. **Acesse:** https://console.firebase.google.com/
2. **Selecione o projeto:** ifsc-carteirinha
3. **No menu lateral esquerdo, procure por:**
   - **Storage** (pode estar como "Cloud Storage")
   - Ou **Build → Storage**
   - Ou **Develop → Storage**

4. **Dentro do Storage, procure por:**
   - **Regras** (Rules)
   - Ou **Segurança** (Security)
   - Ou pode estar no menu ⋯ (três pontos)

## Opção 2: Google Cloud Console

Se não encontrar no Firebase:

1. **Acesse:** https://console.cloud.google.com/
2. **Mude o projeto para:** ifsc-carteirinha
3. **No menu, vá para:**
   - **Cloud Storage** → **Browser**
   - Ou **Storage** → **Browser**
4. **Clique no nome do bucket:** ifsc-carteirinha.firebasestorage.app
5. **Procure por:** **Proteção** (Protection) ou **Regras** (Rules)

## Opção 3: URL direta

Tente acessar diretamente:
- https://console.firebase.google.com/project/ifsc-carteirinha/storage/rules
- Ou: https://console.cloud.google.com/storage/browser/ifsc-carteirinha.firebasestorage.app

## Opção 4: Se não encontrar Storage

Pode ser que o Storage não foi ativado ainda:

1. **No Firebase Console:**
   - Vá em **Build → Storage**
   - Clique em **"Começar"** (Get started)
   - Siga as instruções para ativar

## O que procurar exatamente:

Você está procurando por algo parecido com isto:
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

## Se ainda não encontrar:

Me diga exatamente o que você vê no menu lateral do Firebase Console, e te ajudo a encontrar!
