# Apresentar a Mell Maia ao cliente

**Não foi publicada uma versão online.** O projeto Sites criado durante a preparação permanece sem versão publicada. A apresentação deve ser feita localmente, no seu computador.

## Abrir

1. Dentro desta pasta, dê dois cliques em **INICIAR-DEMONSTRACAO.cmd**.
2. A loja abrirá automaticamente no navegador padrão. Mantenha a janela do servidor aberta. Estes são os endereços:
   - Loja: http://127.0.0.1:4173/
   - Painel: http://127.0.0.1:4173/admin
3. No painel, clique em **Explorar o painel de demonstração**. Não é necessário criar senha para mostrar os dados fictícios.
4. Para encerrar, feche a janela do servidor.

O Node.js precisa estar instalado; já está disponível neste computador. O servidor de apresentação usa somente Node e os arquivos `dist`, sem exigir nova instalação de pacotes. A URL é local e não abre no computador do cliente. Para apresentar a distância, compartilhe a sua tela em uma chamada.

Se o link ficar em branco dentro do aplicativo de conversa, copie o endereço completo e cole na barra do Chrome, Edge ou outro navegador do seu computador. Se não conectar, abra novamente `INICIAR-DEMONSTRACAO.cmd`. O endereço só funciona enquanto o servidor local estiver ligado. Não abra `dist/index.html` diretamente pelo Explorador de Arquivos.

As fotos de referência carregam da internet; mantenha conexão para que apareçam. Os dados demonstrativos ficam no navegador usado para a apresentação. Trocar de navegador ou abrir uma janela privada inicia outra cópia dos exemplos.

## Roteiro sugerido (8 a 10 minutos)

1. **Identidade da loja:** mostre a paleta inspirada no logo e a página inicial.
2. **Escolher unidade:** abra o seletor, escolha uma das três lojas e confira seu endereço.
3. **Escolher um produto:** alterne categorias, pesquise, use os filtros de tamanho e preço.
4. **Produto e sacola:** abra um modelo, escolha tamanho, adicione à sacola e mostre o total e a unidade de retirada. O checkout demonstrativo não cobra nem cria pedido real.
5. **Contato:** mostre os links de Maps e WhatsApp sem precisar enviar mensagens. O WhatsApp da loja 3 aguarda o telefone.
6. **Painel:** entre na demonstração e apresente indicadores, vendas, estoque e relatórios.
7. **Editar:** altere o preço ou estoque de uma variação, registre uma venda de balcão e veja a baixa no estoque e o efeito nos indicadores.
8. **Relatórios:** selecione loja/período e exporte um CSV. Explique que os números são fictícios e que os dados reais virão do Supabase.
9. **Lojas:** mostre onde os responsáveis editarão contatos, endereços e horários.

## Alinhar com o cliente

- Aprovação de cores, logo, textos, fotos e organização das categorias.
- Lista real de produtos, tamanhos, preços e estoques por unidade.
- Telefone da loja 3 e horários das três lojas.
- Responsáveis e permissões por unidade.
- Procedimento de retirada, trocas e devoluções.
- Dados da empresa e revisão do aviso de privacidade e condições de compra.
- Conta recebedora Mercado Pago e aceitação das tarifas por transação.

Depois da validação, siga `PUBLICACAO.md` para configurar os provedores e publicar. Não é necessário contratar hospedagem para esta apresentação.

## Atualizar a demonstração após alterar o código

```powershell
npm run build
```

Reinicie `INICIAR-DEMONSTRACAO.cmd` e atualize o navegador.

Para voltar aos dados iniciais, use uma janela privada ou remova apenas a chave `mell-demo-v1` do armazenamento local deste site. Isso apaga as alterações fictícias desse navegador, não dados de uma loja real.
