# Usar o projeto pelo Git em outro computador

A pasta principal `Site Mell Maia` é a raiz do repositório. A aplicação está em `mell-maia` e contém a loja, o painel administrativo e o código do backend Supabase.

## O que vai para o Git

Código (`src`), imagens (`public`), scripts, migrações e funções (`supabase`), testes, documentação, `package.json`, `package-lock.json` e exemplos de configuração sem segredos (`.env.example`).

Não envie `node_modules`, `dist`, `.tools`, arquivos ZIP, caches nem arquivos `.env` com credenciais. O `.gitignore` da raiz já exclui esses itens. As dependências e o build são reconstruídos no computador de destino. Não é necessário Git LFS para os arquivos atuais deste projeto.

## Publicar no GitHub pelo GitHub Desktop

1. Abra GitHub Desktop e entre na sua conta.
2. Escolha **File → Add local repository** e selecione a pasta principal `Site Mell Maia` (a pasta que contém `mell-maia` e `.gitignore`).
3. Confira os arquivos na lista de alterações. `node_modules`, `.tools` e arquivos `.env` privados não devem aparecer.
4. Se ainda houver alterações sem commit, faça o primeiro commit com uma mensagem como `Projeto inicial Mell Maia`.
5. Clique em **Publish repository**, escolha um nome e mantenha **Keep this code private** marcado, se desejar um repositório privado. Confirme a publicação na sua conta.

## Abrir no outro computador

1. Instale Git/GitHub Desktop e Node.js 24 LTS pelas fontes oficiais.
2. Entre na mesma conta do GitHub ou em uma conta com acesso ao repositório.
3. No GitHub Desktop, escolha **File → Clone repository** e clone o projeto.
4. Abra um terminal na pasta clonada e execute:

```powershell
cd mell-maia
npm ci
npm run build
```

5. Dê dois cliques em `INICIAR-DEMONSTRACAO.cmd`. O comando funciona no Windows; mantenha a janela aberta.
6. Acesse `http://127.0.0.1:4173/` e `http://127.0.0.1:4173/admin`.

Para desenvolvimento, use `npm run dev` e abra o endereço local exibido no terminal. Em macOS ou Linux, após compilar, execute `node scripts/preview.mjs` em vez de usar o arquivo `.cmd`.

O projeto começa em demonstração sem credenciais. Configurações reais e dados de serviços externos não são transferidos pelo Git: configure o ambiente separadamente seguindo `PUBLICACAO.md`. Alterações fictícias feitas no painel são salvas no navegador e também não são levadas pelo Git.

## Atualizações

No primeiro computador: faça commit das alterações e use **Push origin**. No segundo: use **Fetch origin / Pull origin**, depois rode `npm ci` se as dependências mudaram e `npm run build` para atualizar a demonstração.

Se um envio falhar, guarde a mensagem exata. Adicionar um `.gitignore` não remove arquivos grandes que já tenham sido incluídos em commits antigos; esse caso exige examinar o histórico antes de corrigir. Não apague nem reescreva o histórico sem uma cópia de segurança.
