# Bootstrap do primeiro administrador

Não existe senha padrão, cadastro público ou promoção automática de usuário autenticado.

## Processo recomendado

1. No painel Supabase do ambiente de desenvolvimento, abra Authentication → Users.
2. Use **Send invitation** para o e-mail autorizado.
3. Aguarde a criação do usuário e a aceitação do convite.
4. Defina `BOOTSTRAP_ADMIN_EMAIL` apenas no `.env.local` da pessoa responsável.
5. Execute:

```bash
npm run admin:bootstrap
```

6. Remova `BOOTSTRAP_ADMIN_EMAIL` do ambiente local se ele não for mais necessário.

O script consulta usuários com o cliente server-only, exige correspondência exata do e-mail já convidado e ativa o `profile` como `admin`. Ele não cria senha, não convida automaticamente e não imprime o e-mail.

## Novos usuários depois do bootstrap

O administrador convida novos usuários pela tela `/admin/usuarios`. O Supabase Auth envia o fluxo de definição de senha, mas o profile fica pendente por padrão e só recebe acesso quando um administrador clica em aprovar no dashboard. Nunca editar `auth.users` por tabela pública.

## Recuperação

Se nenhum administrador ativo permanecer, repita o processo com outro usuário convidado. Não inserir senha ou papel administrativo em migration e não habilitar cadastro público como atalho.

## Estado desta entrega

O bootstrap foi executado para o usuário explicitamente autorizado. Foi confirmada uma única identidade correspondente, um único profile com o mesmo UUID, papel `admin`, `active = true`, além de login, dashboard, área exclusiva de admin e logout reais. O processo não criou duplicata nem alterou senha.
