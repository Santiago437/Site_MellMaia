# Mell Maia Calçados

Loja para clientes em `/` e portal administrativo em `/admin`, com a mesma base TypeScript/React e um backend Supabase (PostgreSQL, Auth, Storage e Edge Functions em Deno/TypeScript). As duas áreas podem usar um único endereço gratuito; o guia também explica como usar dois endereços.

**Estado atual: apresentação local, sem publicação online, conforme solicitado.** Para mostrar ao cliente, abra `INICIAR-DEMONSTRACAO.cmd` e siga [APRESENTACAO.md](APRESENTACAO.md). A loja estará em `http://127.0.0.1:4173/` e o painel em `http://127.0.0.1:4173/admin`.

## O que já está implementado

- Identidade em rosa suave, off-white e preto a partir da imagem enviada. O logo é exibido com recorte CSS da imagem original, preservada em `public/images/logo-original.jpeg`.
- Catálogo por unidade, categoria, pesquisa, tamanho e ordenação; favoritos; sacola vinculada à unidade e à numeração.
- Três lojas, endereços editáveis e links de Google Maps e WhatsApp. Loja 3 fica sem WhatsApp até informar o telefone.
- Retirada na loja. Não foi criado cálculo de frete nem prometida entrega domiciliar.
- Painel com produtos, upload de fotos, variações de estoque, preço por unidade, vendas de balcão e pedidos online.
- Relatórios com filtro de período e unidade, receita bruta confirmada, vendas, ticket médio, quantidade vendida, estoque baixo, receita diária, ranking de produtos, desempenho por loja e por canal, exportação CSV.
- Login real pelo Supabase Auth, TOTP obrigatório, RLS por unidade, funções transacionais e registros de auditoria.
- Checkout Pro do Mercado Pago: preferência criada no servidor, validação de assinatura, consulta do pagamento, comparação de valor/moeda/conta recebedora/ambiente e processamento idempotente.
- Turnstile no checkout, limites de requisições, payload limitado, validação de entrada e cabeçalhos de segurança para Cloudflare Pages.

## Demonstração e operação real

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, o sistema entra em **demonstração**: produtos, preços, fotos e vendas são exemplos. Alterações ficam no `localStorage` deste navegador. O botão de entrada do painel é explicitamente demonstrativo; ele não autentica usuários reais e não tem acesso ao banco da loja. O checkout de demonstração não cria cobranças.

Com as duas variáveis definidas, o sistema usa somente o Supabase. Falhas de conexão geram erro; não há retorno silencioso a dados fictícios. Dados demonstrativos não são importados para o banco real. A vitrine real começa sem produtos, até o cadastro pela equipe.

## Rodar no computador

Requer Node.js 22.12+ (testado com 24).

```powershell
cd "C:\Users\maris\OneDrive\Área de Trabalho\Site Mell Maia\mell-maia"
npm ci
npm run dev
```

Abra `http://127.0.0.1:5173` e `http://127.0.0.1:5173/admin`. Sem configuração adicional, já é possível explorar a demonstração.

Se o launcher `npm` desta instalação do Windows apresentar erro de caminho, use o executável diretamente:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" ci
node node_modules/vite/bin/vite.js --host 127.0.0.1
```

## Verificar

```powershell
npm test
npm run build
```

Os testes executam PostgreSQL em WebAssembly (PGlite), com papéis e funções de Auth simulados para validar a migração real, permissões, reservas, preço e idempotência. Também validam a assinatura HMAC e a correspondência de pagamentos. Isso não substitui os testes em um projeto Supabase e na conta de testes do Mercado Pago.

## Próximos passos para vender

Siga [PUBLICACAO.md](PUBLICACAO.md), [SEGURANCA.md](SEGURANCA.md) e [VALIDACAO.md](VALIDACAO.md). São necessárias contas da própria empresa, credenciais privadas inseridas nos provedores e produtos reais. Não envie chaves privadas pelo chat.

## Estrutura

```text
src/                  Vitrine, painel, integração Supabase e estilos
public/               Logo, favicon, redirecionamentos e headers
supabase/migrations/  Banco, RLS, funções transacionais e Storage
supabase/functions/   Checkout e webhook de pagamentos
supabase/schedule.sql Liberação de reservas expiradas
tests/                Testes de banco e pagamentos
```

## Limites e pendências explícitas

- As contas Supabase, Mercado Pago e Cloudflare não foram provisionadas em nome do cliente nem conectadas com credenciais reais.
- Não foram realizadas cobranças, testes com cartões, testes TOTP reais nem implantação das migrações em um Supabase remoto.
- A loja precisa informar CNPJ, razão social, contato para dados pessoais, política de retenção, horários reais e telefone da loja 3. Os textos jurídicos publicados são uma base para revisão e complementação pela empresa.
- Produtos/fotos reais precisam ser cadastrados. As fotos Unsplash são ilustrativas e carregadas externamente.
- Sem emissão de nota fiscal, integração com ERP, cálculo de margem/custos, notificações automáticas de e-mail ou entrega domiciliar.
- Vendas de balcão registram um produto/tamanho por operação; pedidos online aceitam até dez variações. Reembolsos são feitos no Mercado Pago. O estoque de devoluções precisa de conferência física e ajuste pelo responsável.
- Pagamentos aprovados após expirar a reserva tentam consumir o estoque disponível; se insuficiente, o pedido fica em revisão. A equipe deve resolver e providenciar estorno quando necessário. Pagamento duplicado também exige revisão.
- Até 100 mil registros por tabela são lidos com paginação. Acima disso, a aplicação exibe erro explícito; será necessário migrar relatórios para agregações no servidor.
- O plano gratuito é adequado para começar, com limites e sem garantia de disponibilidade de uma infraestrutura paga.

## Skills

Usada a skill de frontend já instalada. Instaladas `security-best-practices`, `security-threat-model`, `cloudflare-deploy` (OpenAI) e `supabase-postgres-best-practices` (Supabase). A skill de modelagem de ameaças foi instalada para uso futuro; não foi realizado um serviço independente de modelagem ou auditoria externa.
