# KAMPEKI · Embalagens

Dimensiona as caixas dos combos e peças do Kampeki Sushi (Porto Alegre) a partir do cardápio
(https://app.cardapioweb.com/kampeki_sushi_porto_alegre).

- `data.js` — peças (medidas **estimadas**, editáveis na tela), combos e avulsos conforme o cardápio.
- `app.js` — encaixe por blocos (um produto = um bloco, tudo colado), organizações salvas (clique seleciona, R gira),
  caixas padrão (menor número de caixas).
- `img/` — imagens das peças (recortadas, vista de cima) e `meta.json` com a área ocupada de cada uma.
- `brand/logo.svg` — logo Kampeki; cor da marca `#ff8b86`.

Rodar: servir a pasta com qualquer servidor estático (ex.: `python3 -m http.server 8844`).
