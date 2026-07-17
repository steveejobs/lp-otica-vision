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

O administrador poderá futuramente liberar papéis pela interface específica. Até essa tela existir, novos usuários devem ser convidados no painel e ativados por um processo server-only revisado. Nunca editar `auth.users` por tabela pública.

## Recuperação

Se nenhum administrador ativo permanecer, repita o processo com outro usuário convidado. Não inserir senha ou papel administrativo em migration e não habilitar cadastro público como atalho.

## Estado desta entrega

Nenhum administrador foi criado porque não foi fornecido `BOOTSTRAP_ADMIN_EMAIL`. A tela de login e a proteção de sessão estão implementadas; o dashboard autenticado ficará disponível após o convite e bootstrap explícitos.
