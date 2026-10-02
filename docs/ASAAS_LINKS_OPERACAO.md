# Editalume — links Asaas e liberação comercial
_Conferência pública dos checkouts: 02/10/2026. Este documento não habilita cobranças na plataforma e não contém credenciais._

## 1. Dois links criados pelo proprietário

| Serviço | Tipo exibido pelo Asaas | Preço | Link |
|---|---|---|---|
| **Sob Medida Mensal** | Frequência **Mensal**; checkout chama **Editalume Sob Medida** | R$ 49,90/mês | https://www.asaas.com/000/c/nruxbdhrq24sn9db |
| **Sob Medida Individual** | **Somente à vista**; checkout chama **Editalume Sob Medida Individual** | R$ 49,90 uma vez | https://www.asaas.com/000/c/7ea8eja903t5z4wr |

Ambos disponibilizam boleto/Pix, cartão e Pix na página pública consultada. Antes de enviar o link a clientes reais, conferir os métodos ativos e o valor novamente no painel Asaas.

**Separação contratual absoluta:** a recorrência disponível é do **Sob Medida Mensal, um serviço manual**, e NÃO é o checkout do **Editalume Pro** (ferramentas da plataforma ainda não liberadas comercialmente). Não executar upgrade em `editalume_entitlements` a partir desses links. Não divulgar alertas automáticos como funcionalidade já contratável.

## 2. Problemas detectados na página de checkout

- O vendedor visível aparece como pessoa física, com dados pessoais do proprietário; definir a identificação comercial pretendida no painel Asaas conforme as opções de conta e obrigações aplicáveis. Não copiar identificadores pessoais para páginas ou mensagens.
- O site do vendedor exibido no checkout direciona para o radar pessoal de outro projeto, não para https://cipri-studios.github.io/editalume/. Corrigir no cadastro/painel Asaas, verificando ambos os links em janela sem login.
- Validar contatos de suporte e verificar o texto público sobre prestação, entregas, cobrança e cancelamento **antes de enviar cobrança real**.

## 3. Fluxo permitido após correção de identidade e termos

1. **Qualificar** por e-mail: razão/nome da empresa, atividade, categorias, municípios/UF, prazo de interesse e modalidade (individual ou mensal). Não solicitar dados de cartão, senhas ou credenciais.
2. **Confirmar viabilidade e escopo** da amostra antes de cobrar. Para o plano individual, a proposta-piloto existente é até três oportunidades compatíveis *caso existam*. Para o mensal, definir por escrito **quantidade e periodicidade das entregas, janela de busca, suporte e política de cancelamento** antes de enviar o link; nada disso é automaticamente garantido por uma página de pagamento.
3. Enviar **somente o link correto** após aceite:
   - individual: `https://www.asaas.com/000/c/7ea8eja903t5z4wr`;
   - mensal manual: `https://www.asaas.com/000/c/nruxbdhrq24sn9db`.
   Nunca encaminhar a assinatura mensal Sob Medida como se fosse Pro.
4. **Confirmar pagamento** no painel Asaas usando o identificador real da cobrança; criação de assinatura/visualização de boleto/retorno do navegador não prova quitação. Só então liberar/entregar o serviço manual. Registrar apenas o necessário no CRM, sem dados sensíveis de cartão e sem armazenar tokens.
5. Registrar prazo e data de entrega e encaminhar o relatório com link para os editais oficiais. Se não houver oportunidades compatíveis, aplicar as condições formalizadas antes da cobrança.
6. **Recorrência**: conferir novas mensalidades pagas no Asaas antes de executar novo período; em atrasos, cancelamentos e estornos, seguir a política comunicada ao cliente. Definir uma rotina operacional de conferência enquanto não houver integração de webhook + reconciliação.
7. Convites de **piloto gratuito já prometidos** devem ser respeitados.

## 4. Critérios de abertura para venda direta no site

- [ ] As duas telas do Asaas apresentam identidade comercial e URL corretas.
- [ ] Individual: termos, amostra/escopo e prazo de entrega escritos e testados.
- [ ] Mensal: calendário, quantidade de entregas, cancelamento e suporte publicados.
- [ ] Compra-testes/verificação de fluxo realizados de modo autorizado, sem cobrança involuntária.
- [ ] Suporte comercial pode verificar pagamento e organizar as entregas.
- [ ] Para **Pro futuro**, teste de duas contas reais + segurança do vínculo Asaas–Supabase; apenas webhook autenticado e pagamento verificado ativam `editalume_entitlements`.

Até esses itens estarem conferidos, o **site pode descrever as duas opções e receber pedidos por e-mail**, mas **não deve publicar os checkouts para autoatendimento**.
