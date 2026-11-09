# Coleção de testes - BeatStage

Arquivo: `BeatStage-Banda-Equipamento.postman_collection.json`

Coleção do Postman (v2.1) com **75 requisições** e **144 asserts** cobrindo autenticação JWT,
perfil, autorização por associação, Banda, Equipamento, Ensaio, Evento, Repertório, Agenda e
Feedback.

## Como usar

1. Suba a API (o `.env` precisa ter `JWT_SECRET`):

   ```bash
   npm run dev
   ```

2. Importe o JSON:
   - **Postman**: Import → File → selecione o JSON.
   - **Insomnia**: Import → From File (Formato Postman).
   - **Thunder Client (VS Code)**: import de coleção Postman.

3. Rode a coleção inteira com o **Collection Runner**, na ordem original.

4. Linha de comando (opcional):

   ```bash
   npx newman run docs/postman/BeatStage-Banda-Equipamento.postman_collection.json
   ```

A coleção usa autenticação **Bearer** no nível da coleção (`{{tokenLider}}`), então todas as
rotas privadas já vão autenticadas. As requisições públicas (cadastro e login) ignoram o token,
e algumas requisições sobrescrevem a autenticação para testar 401/403:

- "Rota protegida sem token": `noauth`
- "Rota protegida com token inválido": token fixo inválido
- "Membro 1/2 exclui o próprio cadastro": token do próprio membro

## Variáveis da coleção

| Variável | Preenchida por |
|---|---|
| `baseUrl` | valor fixo `http://localhost:3000/api` (edite se mudar a porta) |
| `emailLider`, `emailMembro1`, `emailMembro2` | criação dos músicos |
| `idLider`, `idMembro1`, `idMembro2` | criação dos músicos |
| `tokenLider` | login do líder (auth padrão da coleção) |
| `tokenMembro1`, `tokenMembro2` | login dos membros na limpeza |
| `idBanda`, `codigoConvite` | cadastro da banda |
| `idEquipamento`, `idEquipamento2` | cadastro dos equipamentos |
| `idEnsaio`, `idRepertorio`, `idEvento` | cadastro das novas entidades |
| `idAgenda`, `idAgendaBanda`, `idFeedback` | cadastro de agenda e feedback |

Os e-mails usam `{{$timestamp}}`, então a coleção pode ser executada várias vezes sem
conflito de e-mail duplicado. A senha inicial dos três músicos é `senhaSegura123`; a do líder
é trocada para `senhaNova123` no meio da coleção.

## Atenção: ids no corpo precisam ser números

O Zod exige `number` em `idLider`, `idMembros`, `idBanda`, `idEquipamentos`, `idRepertorios` e
`idEvento`. Em JSON, `"idBanda": "6"` é string e retorna 400. Por isso os corpos da coleção usam
as variáveis **sem aspas**:

```json
{ "idBanda": {{idBanda}}, "idMembros": [{{idMembro1}}] }
```

## Cobertura

1. **Setup - Músicos**: cria líder e dois membros (rota pública) e guarda e-mails e ids.
2. **Autenticação e perfil**: login válido/inválido, token JWT, rotas sem token, perfil,
   IDOR (403) e troca de senha.
3. **Banda - CRUD**: cadastro, listagem restrita às bandas do músico, busca, atualização,
   membros e dedupe.
4. **Banda - validações**: payload inválido, sem `idLider`, líder que não é o autenticado (403),
   membro inexistente, banda inexistente, PATCH vazio.
5. **Equipamento - CRUD**: cadastro, listagem, busca e atualização pelo líder.
6. **Equipamento - validações**: enum inválido, sem `idBanda`, banda inexistente, PATCH vazio.
7. **Ensaio, Evento, Repertório, Agenda e Feedback**: criação, listagem, alteração,
   vínculos N:N (evento com equipamentos e repertórios), músico com função, agenda individual
   e da banda, feedback anônimo, exclusão lógica e 404 depois de excluído.
8. **Integridade e exclusão**: 409 ao inativar líder com banda ativa, exclusão lógica de
   equipamento, cascata ao excluir a banda (evento inativado), limpeza dos músicos.
9. **Erros gerais**: JSON malformado (400) e rota inexistente (404).

## Exclusão lógica

Todas as rotas `DELETE` continuam existindo, mas **não apagam registros**: marcam `ativo=false`.
Depois disso o registro:

- não aparece mais nas listagens;
- retorna 404 na busca por id;
- continua no banco (para histórico/auditoria).

Ao excluir uma banda, seus equipamentos, ensaios, eventos, repertórios, agendas e feedbacks
também são inativados. O perfil de músico só pode ser inativado se ele não liderar nenhuma banda
ativa (senão a API responde 409).

## Observação

A coleção apaga apenas o que ela mesma cria (músicos, banda, equipamentos e demais entidades do
teste). Registros que já existiam no banco não são tocados.
