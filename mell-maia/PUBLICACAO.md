# Como colocar a Mell Maia no ar com planos gratuitos

O código está pronto para configuração. A publicação gratuita não elimina tarifas de pagamentos, registro de domínio próprio ou possíveis custos ao exceder limites. Os serviços devem ficar em contas da própria empresa.

## 1. Criar o backend Supabase

1. Crie uma conta em https://supabase.com e um projeto no plano Free. Escolha uma região próxima ao Brasil e uma senha de banco forte. Guarde-a no gerenciador de senhas da empresa.
2. Em SQL Editor, execute primeiro `supabase/migrations/202610200001_core.sql` e depois `supabase/migrations/202610200002_storage.sql`. Alternativamente use a CLI com `supabase link --project-ref SEU_PROJECT_REF` e `supabase db push`.
3. Ative `pg_cron` e execute `supabase/schedule.sql` uma única vez. A rotina libera reservas após 30 minutos. Verifique `cron.job_run_details` para confirmar que está funcionando.
4. Em Authentication, desative cadastro público, provedores não utilizados e login anônimo. Configure limites de login e confirme TOTP/MFA habilitado. `supabase/config.toml` contém a configuração de referência; alterações pelo SQL Editor não aplicam configurações de Auth automaticamente.
5. Crie/convidе o proprietário em Authentication → Users. A conta precisa conseguir entrar por e-mail e senha. Não cadastre senhas no código ou no SQL. Crie os responsáveis pelo mesmo fluxo.
6. Copie o UUID do usuário e vincule-o pelo SQL Editor, que é uma operação privilegiada. Substitua `UUID_DO_PROPRIETARIO` pelo UUID real:

```sql
insert into public.store_members(user_id,store_id,role)
select 'UUID_DO_PROPRIETARIO'::uuid,id,'owner' from public.stores;
```

Para um gerente restrito à loja 1:

```sql
insert into public.store_members(user_id,store_id,role)
values ('UUID_DO_RESPONSAVEL'::uuid,'10000000-0000-4000-8000-000000000001','manager');
```

Não existe botão público de cadastrar equipe ou promover permissões. O proprietário tem acesso a todas as unidades; gerente só às suas operações. O catálogo público continua visível a todos.

7. Copie a Project URL e a chave pública/anon em Project Settings → API. Crie `.env` a partir de `.env.example` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. **Nunca coloque `service_role`, secret key ou token Mercado Pago em variável `VITE_`.** A implementação de chamadas guest usa a chave legada `anon` do projeto; não use uma chave privada.
8. Execute a aplicação e entre em `/admin`. Na primeira entrada real, configure o aplicativo autenticador e informe o código de seis dígitos. Escritas e dados de vendas exigem AAL2 no banco, independentemente da interface.
9. Cadastre produtos, fotos e estoque. Os exemplos da demonstração não são copiados para o ambiente real.

## 2. Publicar o frontend no Cloudflare Pages

Não é necessário comprar domínio para começar: use o subdomínio `pages.dev` incluído.

### Opção A: upload direto

```powershell
npm ci
npm run build
```

No Cloudflare Dashboard → Workers & Pages → Create → Pages → Direct Upload, crie o projeto e envie o **conteúdo da pasta `dist`**. Não envie a pasta do projeto inteiro, `.env`, arquivos Supabase ou `node_modules`. Anote o endereço fornecido. Os arquivos `_headers` e `_redirects` precisam estar no upload.

Para atualizar, execute novamente `npm run build` e faça um novo deployment de `dist` no mesmo projeto.

O Cloudflare informa que um projeto criado por Direct Upload não pode ser convertido depois para integração Git; nesse caso, será necessário criar um novo projeto. Escolha a opção B desde o início se quiser deploy automático.

### Opção B: Git e atualização automática

Publique o código em um repositório privado da empresa. No Cloudflare Pages, conecte o repositório, escolha o diretório `mell-maia` caso ele não seja a raiz e configure:

| Campo | Valor |
|---|---|
| Comando de instalação | `npm ci` (ou instalação automática padrão do Pages) |
| Comando de build | `npm run build` |
| Diretório de saída | `dist` |
| Versão Node | `24` |

Em Settings → Variables, adicione as três variáveis públicas: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_TURNSTILE_SITE_KEY`. Faça novo deploy após alterar essas variáveis, pois são incorporadas ao build.

Com um único projeto, os endereços serão `https://SEU-PROJETO.pages.dev/` e `https://SEU-PROJETO.pages.dev/admin`. São duas áreas distintas com a mesma publicação.

**Para dois endereços independentes**, publique o mesmo frontend em dois projetos Pages, por exemplo `mell-maia` e `mell-maia-admin`, ambos usando o mesmo Supabase. O portal fica em `https://SEU-ADMIN.pages.dev/admin`; a raiz também é entregue, pois o código é compartilhado. Se preferir um domínio administrativo com apenas o painel, configure no provedor o redirecionamento da raiz para `/admin`. Não trate um endereço secreto como proteção: a segurança é o login, MFA e RLS.

O link administrativo no rodapé aponta para `/admin` na mesma origem. Atualize-o se usar um domínio administrativo independente. Sessões são mantidas só na memória: recarregar ou trocar de domínio exige novo login.

## 3. Configurar Turnstile

1. Em Cloudflare → Turnstile, crie um widget Managed e adicione somente o hostname público da loja.
2. A site key é pública: configure `VITE_TURNSTILE_SITE_KEY` no build.
3. O secret fica somente nas Supabase Edge Functions, em `TURNSTILE_SECRET_KEY`.
4. O checkout verifica o resultado e o hostname no servidor. Nunca use as chaves de teste em produção.

Sem o Turnstile configurado, o checkout real permanece bloqueado.

## 4. Mercado Pago Checkout Pro

O Checkout Pro foi escolhido pela integração para o Brasil e pelo pagamento hospedado pelo provedor. Há **tarifas por transação**, que dependem do meio de pagamento e das condições da conta. Consulte os valores atuais no próprio Mercado Pago. A loja não processa nem armazena cartão.

1. Na conta da própria empresa, acesse https://www.mercadopago.com.br/developers e crie uma aplicação de Checkout Pro.
2. Comece com credenciais e usuários de teste. O arquivo `supabase/functions/.env.example` lista os nomes esperados.
3. Configure nas Edge Functions: `MP_ACCESS_TOKEN`, `MP_COLLECTOR_ID` (ID da conta recebedora), `MP_WEBHOOK_SECRET`, `MP_MODE=sandbox`, `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_SALT` (valor aleatório forte), `SITE_URL` (origem HTTPS exata da loja) e `ALLOWED_ORIGINS` (mesma origem).
4. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo ambiente Supabase. Não copie essas credenciais para o frontend.
5. Instale a CLI Supabase por um método oficial, faça login e vincule o projeto. Depois publique:

```powershell
supabase functions deploy checkout
supabase functions deploy payment-webhook
```

`verify_jwt = false` é intencional só nesses endpoints: o checkout de visitante exige Turnstile e validação; o webhook exige HMAC Mercado Pago. Nenhum deles depende de um usuário administrativo logado.

6. Em Suas integrações → Webhooks, configure o evento **Pagamentos**, modo teste, com URL `https://SEU_PROJECT_REF.supabase.co/functions/v1/payment-webhook`. Copie o segredo da assinatura para `MP_WEBHOOK_SECRET` no servidor. As notificações antigas por IPN não substituem esse fluxo assinado.
7. Faça o roteiro de `VALIDACAO.md`. Teste aprovação, rejeição, pendência, repetição de webhook, estorno e falta de estoque. O provedor de pagamentos é externo: estes testes não foram feitos sem suas contas.
8. Ao passar para produção, troque pelas credenciais de produção, configure o webhook de produção e defina `MP_MODE=production`. Confirme que `MP_COLLECTOR_ID` é a conta da empresa. Publique novamente as funções se necessário.

Meios de pagamento disponíveis dependem da conta e do Mercado Pago. Boleto foi excluído na preferência, pois a implementação usa reserva curta de estoque; Pix/cartão e pagamentos pendentes podem ser aprovados depois. Uma aprovação tardia sem estoque vai para revisão, e a equipe deverá contatar o cliente ou estornar.

**Não confirme a venda pela URL de retorno.** A aplicação só confirma após receber uma notificação verificada, buscar o pagamento e confrontar os dados. A página de retorno informa que a confirmação depende dessa validação.

## 5. Antes de entregar ao cliente

- Cadastre telefone da loja 3, horários e contatos reais.
- Substitua os exemplos por produtos, fotos, preços e quantidades reais.
- Complete os textos de privacidade e compra com razão social, CNPJ, contato do controlador, política de retenção e procedimentos reais de retirada e troca. Providencie a revisão adequada à empresa.
- Confirme a URL `/admin` em acesso direto, o HTTPS e os headers no domínio público.
- Verifique o cron, o webhook, os testes de MFA, o isolamento dos gerentes e o backup.
- Defina uma rotina de conferência do Mercado Pago para reconciliar notificações perdidas, pagamentos duplicados e pedidos em revisão.
- Desative ou remova a demonstração caso ela não deva ficar acessível no endereço de apresentação. A implantação com variáveis Supabase já usa só dados reais e exige login real.

## O que pode ser gratuito

| Serviço | Uso inicial | Limite/custo |
|---|---|---|
| Cloudflare Pages | Frontend estático e HTTPS | Sujeito aos limites do Free, inclusive builds |
| Supabase Free | Banco, Auth, Storage e funções | Cotas de banco, armazenamento, tráfego e execução; projeto pode pausar por baixa atividade |
| Cloudflare Turnstile | Proteção do checkout | Plano gratuito disponível, sujeito aos termos/cotas |
| Maps e WhatsApp | Links para localização e conversa | Não usam API paga nem envio automatizado de mensagens |
| Mercado Pago | Integração e checkout | Tarifas por transação; não foi prometido processamento gratuito |
| Domínio próprio | Opcional | Registro/renovação geralmente pagos |

O Supabase informa pausa de projetos Free com pouca atividade em um período de sete dias. Não há garantia de operação contínua gratuita. Para uma loja que depende de vendas, acompanhe as cotas e planeje evolução de infraestrutura.

Referências oficiais consultadas em 20/10/2026:

- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/functions/deploy
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications

## Prévia por Sites

A publicação de apresentação via plugin Sites, quando concluída, é privada ao proprietário por padrão e usa dados demonstrativos. Ela não substitui a configuração acima para disponibilizar uma loja pública no Cloudflare com backend e pagamentos reais.
