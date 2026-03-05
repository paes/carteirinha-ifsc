# CORREÇÕES NECESSÁRIAS - README

## Problemas identificados e soluções:

### 1. ❌ CORS do Firebase Storage (URGENTE)
**Erro:** Access to fetch at 'https://firebasestorage.googleapis.com/...' blocked by CORS policy

**Solução:** Configurar CORS no Firebase Console:
1. Acesse: https://console.firebase.google.com/
2. Selecione projeto: ifsc-carteirinha
3. Vá em: Storage → Regras
4. Adicione as regras CORS:
```json
[
  {
    "origin": ["https://paes.github.io"],
    "method": ["GET", "POST", "PUT"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization"]
  }
]
```

### 2. ❌ Logo do IFSC não aparece
**Causa:** Cache do GitHub Pages ou arquivo não encontrado

**Solução:** Verificar se o arquivo existe em:
https://paes.github.io/carteirinha-ifsc/icons/logo-v.png

### 3. ❌ Formulário não envia
**Causa:** Erro no upload da foto (CORS)

**Solução temporária:** Permitir envio sem foto

### 4. ❌ Data padrão não funciona
**Causa:** Deploy ainda não atualizado

## Passos para corrigir:

1. **Configure CORS no Firebase Storage** (prioridade)
2. **Teste upload de foto**
3. **Verifique logo do IFSC**
4. **Teste data padrão**

## Deploy atual:
- URL: https://paes.github.io/carteirinha-ifsc/
- Último commit: INF23 → INF24 + data padrão
