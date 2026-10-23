# Segurança da Mell Maia

## Controles implementados

| Camada | Proteção no código |
|---|---|
| Autenticação | Supabase Auth e autenticação TOTP, sem formulário público de criar equipe |
| Sessão | Token somente na memória; ao recarregar, exige login novamente |
| Autorização | RLS em todas as tabelas públicas; AAL2 nos helpers `private.can_manage` e `private.is_owner` |
| Equipe | Vínculos cadastrados somente por operação privilegiada; funcionário não altera seu papel |
| Catálogo | Leitura pública de produtos ativos; escrita de produto só proprietário |
| Estoque | RPC com autorização, validação, restrições de banco, bloqueio por linha e motivo do ajuste |
| Vendas | Pedidos/itens privados por unidade; gravação pelo servidor, não por insert público |
| Checkout | Payload limitado, Zod, Turnstile verificado com hostname e limite por e-mail normalizado com hash e salt |
| Pagamentos | Segredos só no servidor; HMAC-SHA256, janela de 15 minutos, consulta ao recurso, checagem de moeda/valor/recebedor/ambiente; confirmação idempotente |
| Imagens | Bucket restrito a JPEG, PNG e WebP até 5 MB; upload só proprietário em AAL2; sem overwrite/delete público |
| Auditoria | Triggers para produtos, estoque, lojas e pedidos; clientes sem permissão de alterar o log; identidade do comprador omitida do histórico de pedidos |
| Frontend | React escapa texto; sem HTML arbitrário, eval ou scripts inline; redirecionamento de checkout limitado ao Mercado Pago |
| Publicação | CSP, nosniff, anti-frame e política de referrer em `_headers` para Cloudflare Pages |
| Exportações | CSV protege valores que possam virar fórmulas em planilhas |

O frontend usa `style-src 'unsafe-inline'` exclusivamente para estilos dinâmicos de gráficos e animações; scripts inline e `unsafe-eval` não são permitidos. O único script remoto de operação é o widget oficial Turnstile, cuja versão é gerida pelo provedor. Fotos externas são apenas de demonstração. Em operação, prefira fotos próprias no Storage.

## Limites que exigem operação

- Segurança não é garantia absoluta nem auditoria independente. Foram realizados testes locais descritos em `VALIDACAO.md`; os serviços externos precisam de validação com contas reais/de teste.
- O limite de checkout por e-mail é complementar ao Turnstile; e-mails podem ser alternados. Configure limites/WAF e monitoramento de abuso nas plataformas conforme o tráfego. Não há proteção ilimitada contra negação de serviço ou atacantes com acesso ao próprio provedor.
- O banco confia em Supabase Auth e em sua validação de JWT. PGlite simula essa parte para testar as regras SQL, sem validar a infraestrutura de autenticação do provedor.
- A chave `service_role` ignora RLS. Nunca a distribua. Quem tiver acesso administrativo ao Supabase pode alterar dados e políticas; proteja essas contas com MFA.
- Os cabeçalhos estão no arquivo de configuração de Cloudflare Pages. Verifique os cabeçalhos efetivamente servidos ao mudar de hospedagem. A prévia Sites pode aplicar sua própria política.
- Pagamentos com webhook perdido precisam de reconciliação na conta Mercado Pago. Existe tolerância de horário de 15 minutos na assinatura; notificações antigas podem exigir reenvio ou investigação.
- Pagamentos tardios sem disponibilidade e cobranças duplicadas ficam em revisão. Não foi criado um botão para resolver divergências financeiras automaticamente: use o provedor para verificar/estornar e registre a resolução operacional.
- Reembolso não implica entrada automática de produto no estoque; faça a conferência física antes do ajuste.
- O cron de expiração precisa ser habilitado e monitorado. Sem ele, reservas pendentes continuam ocupando estoque.
- Os relatórios são gerenciais: receita bruta de pedidos pagos, sem taxas, custos ou emissão fiscal.
- Fotos e arquivos devem ser legítimos e pertencer à loja; validar MIME e extensão não substitui uma política de upload de conteúdo confiável.
- O cadastro de gerente e as mudanças de vínculo feitas pelo SQL Editor não são registradas nos triggers da aplicação. Use o histórico administrativo do provedor e mantenha controle de aprovação de acessos.

## Rotina recomendada

1. Use MFA nos provedores, senhas individuais e gerenciador de senhas. Não compartilhe a conta do proprietário.
2. Revogue os vínculos em `store_members` quando um responsável sair. O banco consulta o vínculo em cada operação.
3. Defina e teste backups/exportações de banco e Storage. Não presuma backup automático recuperável no Free. Proteja os arquivos exportados, que contêm dados pessoais.
4. Acompanhe falhas de funções, cron e entregas de webhook sem registrar tokens ou dados de cartão em logs.
5. Rode `npm audit`, atualize dependências com revisão e execute os testes antes de publicar mudanças.
6. Complete a política de dados, retenção e atendimento aos titulares. Colete apenas o necessário.

## Se houver incidente

Interrompa o checkout se houver risco financeiro, revogue tokens afetados no provedor, preserve os registros necessários, revise vínculos e reconcilie pedidos com o Mercado Pago. Rotacione os segredos no ambiente servidor e publique a configuração corrigida. Avalie as obrigações de comunicação da empresa com apoio profissional adequado.
