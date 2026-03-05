# Como fazer deploy no GitHub Pages

## Opção 1: GitHub Pages (Recomendado - Gratuito)

1. **Crie um repositório no GitHub** chamado `liberaifsc`
2. **Faça push dos arquivos:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/liberaifsc.git
   git push -u origin main
   ```
3. **Ative o GitHub Pages:**
   - Vá em Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / root
   - Clique em Save
4. **Acesse:** `https://seu-usuario.github.io/liberaifsc/`

## Opção 2: Netlify Drop (Mais simples, sem build)

1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta do projeto para a área indicada
3. Pronto! Site publicado instantaneamente

## Sobre o erro "Não foi possível desativar"

Isso provavelmente é um problema de **CORS** no Live Server local. O Firebase bloqueia requisições de `localhost` por padrão. No ambiente de produção (GitHub Pages/Netlify) isso deve funcionar normalmente.

Se o erro persistir no ambiente de produção, verifique as regras de segurança do Firestore no console do Firebase.
