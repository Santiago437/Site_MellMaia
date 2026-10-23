# Validação

## Resultado em 20/10/2026

- Compilação TypeScript do frontend: aprovada.
- Verificação TypeScript das Edge Functions com tipos locais equivalentes aos módulos instalados: aprovada. Não é execução no runtime Deno remoto.
- Build de produção Vite: aprovado, com arquivos de React e Supabase separados para cache.
- Testes automatizados: **14 aprovados, nenhum reprovado**.
- Consulta npm audit de dependências de produção: nenhuma vulnerabilidade conhecida reportada naquele momento.
- Servidor de apresentação limitado a `127.0.0.1:4173`; publicação externa não realizada, por solicitação do usuário.
- Revisão visual e teste de cliques no navegador: **não concluídos**, pois o navegador integrado não conseguiu conectar à página. O retorno HTTP local e a compilação foram verificados; layout e interações precisam da conferência manual descrita abaixo.

## Testes locais automatizados

`npm test` executa a migração principal em PostgreSQL via PGlite e verifica:

- Visitante pode ler catálogo e lojas, mas não pedidos, gravações diretas de estoque ou reservas privilegiadas.
- Gerente não modifica outra unidade, não altera papéis e não edita produtos globais.
- Escritas exigem AAL2, mesmo com usuário correto em AAL1.
- Reserva insuficiente falha sem efeito parcial.
- Preço do pedido vem do banco; valor divergente não confirma pagamento.
- Notificação repetida não baixa estoque duas vezes.
- Reembolso não repõe produto automaticamente.
- Pedidos e seus itens não são expostos a usuário sem vínculo.
- Expiração libera reservas uma única vez; pagamento tardio sem disponibilidade entra em revisão.
- Venda de balcão e ajuste respeitam estoque, acesso e motivo registrado na auditoria.
- Assinaturas inválidas, alteração de IDs e replay antigo são rejeitados.
- Valor, moeda, recebedor, referência e modo de pagamento precisam coincidir.
- Sacolas vazias/duplicadas e quantidades negativas/excessivas são rejeitadas.
- A política de upload permite o proprietário em AAL2 e recusa gerente, AAL1 e SVG; o bucket limita MIME e tamanho.

PGlite executa SQL real, mas não simula duas conexões concorrentes, o gateway Supabase, o Supabase Auth real nem o servidor Mercado Pago. Valide concorrência no ambiente remoto antes da operação.

## Roteiro obrigatório de homologação com as contas da empresa

1. Projeto Supabase separado de produção, migrações aplicadas e cadastro público desativado.
2. Login de proprietário e gerente; TOTP configurado; AAL1 não permite consultar vendas nem escrever; AAL2 permite somente o escopo esperado.
3. Tentar editar a loja 2 com um gerente vinculado apenas à loja 1 pela API, além da interface. Confirmar bloqueio.
4. Criar produto com foto, disponibilizar tamanhos/preços diferentes nas unidades e verificar vitrine pública.
5. Executar duas compras simultâneas da última unidade e uma venda de balcão concorrente; só uma pode consumi-la.
6. Com usuários/credenciais de teste do Mercado Pago: aprovação, recusa, pendência, cancelamento e reembolso.
7. Confirmar webhook correto, repetir o evento e adulterar a assinatura: nenhum estoque duplicado ou pagamento falso.
8. Esperar a expiração, confirmar execução de cron e simular aprovação tardia com e sem disponibilidade.
9. Verificar origem e hostname Turnstile e bloqueio por ausência/expiração do token. Nunca resolver desafios pelo código.
10. Comparar valores dos relatórios com pedidos pagos; exportar CSV; verificar filtros em datas próximas à meia-noite de São Paulo.
11. Testar tela pequena e teclado: menu, filtros, produto, sacola, fechamento do modal, formulários do painel e mensagens de erro.
12. Conferir Headers e HTTPS no domínio final, acesso direto a `/admin`, ausência de chaves privadas no bundle e ausência de cobrança no modo demonstrativo.
13. Verificar backup e restauração; acesso de equipe removida deve parar imediatamente nas operações do banco.

O teste completo de pagamento, MFA e publicação do backend aguarda a configuração dos provedores pelo titular das contas. Nenhuma cobrança foi realizada durante o desenvolvimento.
