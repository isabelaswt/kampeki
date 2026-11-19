// Dados do cliente: Kampeki Sushi - Porto Alegre
// Fonte: https://app.cardapioweb.com/kampeki_sushi_porto_alegre (lido em 2026-11-19)
// O cardapio NAO informa medidas. Todas as medidas abaixo (mm) sao PADRAO DE MERCADO ESTIMADO,
// editaveis na tela. Confirmar com a cozinha do cliente antes de fechar faca.
// Cada variacao de peca e UM PRODUTO DO CARDAPIO (descricao no menu); a imagem sai dessa descricao.

(function () {
  const V = (grupo, base, lista) => Object.fromEntries(lista.map(([k, nome, cor]) => [`${grupo}_${k}`, { ...base, nome, cor }]));

  // uramaki: roll de salmao (ou arroz por fora, nos vegetarianos); vendido em fileiras; a foto e UMA peca repetida
  const URAMAKI = V('uramaki', { w: 42, d: 39, h: 32, perCell: 5, step: 30 }, [
    ['filadelfia', 'Uramaki filadélfia', '#f0a58a'], ['palha', 'Uramaki palha doce', '#e0a84a'], ['shake_ebi', 'Uramaki shake ebi', '#e8815a'],
    ['poro', 'Uramaki alho-poró', '#c9b26a'], ['skin', 'Uramaki shake skin', '#b07a4a'], ['ebi', 'Uramaki ebi', '#e3946a'],
    ['brocolis', 'Uramaki brócolis', '#7fa06a'], ['shimeji', 'Uramaki shimeji', '#8a6a4f'], ['ebi_tuna', 'Uramaki ebi tuna', '#a8323e']]);
  const HOSSO = V('hosso', { w: 24, d: 24, h: 26, perCell: 8, step: 13 }, [
    ['filadelfia', 'Hossomaki filadélfia', '#8fb58a'], ['salmao', 'Hossomaki salmão', '#7fa58a'],
    ['ebi', 'Hossomaki ebi', '#9fb08a'], ['kappa', 'Hossomaki kappa (pepino)', '#6f9a7a']]);
  const HOT = V('hot', { w: 40, d: 39, h: 32, perCell: 1 }, [
    ['filadelfia', 'Hot filadélfia', '#c9a46a'], ['poro', 'Hot poró', '#c9b26a'], ['couve', 'Hot couve', '#9aa46a'],
    ['salmao', 'Hot salmão', '#d9946a'], ['lemon', 'Hot gunkan lemon', '#d9c46a'], ['shimeji', 'Hot shimeji', '#a58a6a']]);
  const NIGIRI_DIM = {"atum": [60, 23.4], "barriga": [60, 22.9], "ebi": [60, 24.4], "poro": [52, 25.5], "salmao": [60, 23.3], "skin": [60, 23.7], "tamago": [60, 22.7], "vieira": [52, 25.2]};
  const NIGIRI = V('nigiri', { w: 60, d: 23, h: 32, perCell: 1 }, [
    ['salmao', 'Niguiri salmão', '#e8a07a'], ['barriga', 'Niguiri barriga de salmão', '#e89a7a'], ['atum', 'Niguiri atum', '#a8323e'],
    ['skin', 'Niguiri skin', '#8a5a3a'], ['tamago', 'Niguiri shake tamagô', '#e9c46a'], ['vieira', 'Niguiri vieira', '#f2e6d0'],
    ['ebi', 'Niguiri ebi', '#e0885a'], ['poro', 'Niguiri salmão poró', '#c9b26a']]);
  Object.keys(NIGIRI).forEach(k => { const [w, dd] = NIGIRI_DIM[k.slice(7)]; NIGIRI[k].w = w; NIGIRI[k].d = dd; });
  // gunkan: redondo, enrolado em salmao, mesma forma do roll; muda so a cobertura
  const GUNKAN = V('gunkan', { w: 42, d: 39, h: 38, perCell: 1 }, [
    ['salmao', 'Gunkan salmão / trufado', '#e8a07a'], ['filadelfia', 'Gunkan filadélfia', '#f0d9c8'], ['tamago', 'Gunkan tamagô', '#e9c46a'],
    ['palha', 'Gunkan palha doce', '#d9a441'], ['poro', 'Gunkan alho-poró', '#c7b26a'], ['shimeji', 'Gunkan shimeji', '#8a6a4f'],
    ['ebi', 'Gunkan ebi', '#d9894a'], ['gorgonzola', 'Gunkan gorgonzola', '#e6dcc8'], ['atum', 'Gunkan atum alho negro', '#a8323e'],
    ['vieira', 'Gunkan vieira', '#f2e6d0']]);

  window.PIECES = {
    ...NIGIRI, ...GUNKAN, ...HOSSO, ...URAMAKI, ...HOT,
    futo:     { nome: 'Futomaki shake tuna', w: 48, d: 48, h: 40, perCell: 1, cor: '#9aa6c9' },
    shake:    { nome: 'Shake (sem arroz)',   w: 34, d: 40, h: 30, perCell: 1, cor: '#e58f7a' },
    sashimi:  { nome: 'Sashimi (lâmina)',    w: 17, d: 53, h: 16, perCell: 12, step: 8, cor: '#f2b8a2' }, // 6 ou 12 lâminas: 1 fileira
    porcao:   { nome: 'Porção (copo)',       w: 70, d: 70, h: 40, perCell: 1, cor: '#b7c7d6' },
    crispy:   { nome: 'Crispy / chips (separado)', w: 60, d: 58, h: 25, perCell: 1, cor: '#e0a85a' },
    oniguiri: { nome: 'Oniguiri',            w: 90, d: 82, h: 36, perCell: 1, cor: '#cfcfcf' },
  };

  // Combos conforme a descricao do cardapio. "~" no comentario = o cardapio nao especifica, aproximado.
  window.COMBOS = [
    { nome: 'Combo Individual (19)', itens: { sashimi: 4, hosso_filadelfia: 4, uramaki_palha: 5, gunkan_salmao: 4, nigiri_barriga: 2 } },
    { nome: 'Seleção de Niguiris (8)', itens: { nigiri_tamago: 2, nigiri_vieira: 2, nigiri_salmao: 2 /* ~peixe branco */, nigiri_barriga: 2 } },
    { nome: 'Meio Combo Gunkan (10)', itens: { gunkan_palha: 2, gunkan_shimeji: 2, gunkan_ebi: 2, gunkan_gorgonzola: 2, gunkan_poro: 2 } },
    { nome: 'Seleção de Gunkans (16)', itens: { gunkan_salmao: 4, gunkan_atum: 4, gunkan_vieira: 4, gunkan_tamago: 4 } },
    { nome: 'Combo Gunkan (20)', itens: { gunkan_palha: 4, gunkan_shimeji: 4, gunkan_ebi: 4, gunkan_gorgonzola: 4, gunkan_poro: 4 } },
    { nome: 'Meio Combo Nashi Shari (20)', itens: { sashimi: 8, futo: 4, shake: 6, gunkan_filadelfia: 2 } },
    { nome: 'Meio Combo Salmão (26)', itens: { sashimi: 6, hosso_filadelfia: 4, uramaki_filadelfia: 5, uramaki_palha: 5, nigiri_salmao: 3 /* ~niguiri filadélfia */, gunkan_filadelfia: 3 } },
    { nome: 'Combo Shake Tuna (38)', itens: { nigiri_atum: 4, nigiri_barriga: 4, gunkan_tamago: 4, gunkan_atum: 4, sashimi: 12, uramaki_ebi_tuna: 10, porcao: 1, crispy: 1 } },
    { nome: 'Combo Nashi Shari (40)', itens: { sashimi: 16, futo: 8, shake: 12, gunkan_filadelfia: 4 } },
    { nome: 'Combo Hot (40)', itens: { hot_filadelfia: 10, hot_poro: 10, hot_couve: 10, hot_salmao: 10 } },
    { nome: 'Combo Vegetariano (40)', itens: { uramaki_brocolis: 8, uramaki_shimeji: 8, hosso_kappa: 8, hot_shimeji: 8, gunkan_shimeji: 8 /* ~gunkan vegetariano da casa */ } },
    { nome: 'Combo Exclusivo (42)', itens: { sashimi: 12, uramaki_palha: 10, uramaki_shake_ebi: 10, nigiri_salmao: 2, nigiri_barriga: 2, nigiri_tamago: 2 /* ~6 variados */, gunkan_filadelfia: 4 } },
    { nome: 'Combo Yuzu (42)', itens: { hot_lemon: 8, uramaki_poro: 10, sashimi: 12, nigiri_ebi: 4, nigiri_barriga: 4, gunkan_filadelfia: 4 } },
    { nome: 'Combo Ebi (42)', itens: { uramaki_shake_ebi: 10, gunkan_ebi: 10, sashimi: 10, shake: 12 } },
    { nome: 'Combo Experiência (48)', itens: { uramaki_palha: 5, uramaki_filadelfia: 10 /* ~salad + filadélfia crispy */, uramaki_skin: 5, nigiri_poro: 6, nigiri_skin: 6, hosso_filadelfia: 8, hot_poro: 8 } },
    { nome: 'Combo Experiência 2.0 (48)', itens: { uramaki_palha: 10, uramaki_skin: 10, hosso_ebi: 8, nigiri_skin: 4, nigiri_poro: 4, gunkan_poro: 4, hot_poro: 8 } },
    { nome: 'Combo Tradicional (48)', itens: { sashimi: 12, uramaki_filadelfia: 10, uramaki_ebi: 10, hosso_salmao: 8, nigiri_salmao: 4, gunkan_salmao: 4 } },
    { nome: 'Combo Salmão (52)', itens: { sashimi: 12, hosso_filadelfia: 8, uramaki_filadelfia: 10, uramaki_palha: 10, nigiri_salmao: 6 /* ~niguiri filadélfia */, gunkan_filadelfia: 6 } },
  ];

  // Pecas avulsas do cardapio
  const av = (nome, itens) => ({ nome, itens });
  const gun = Object.keys(GUNKAN).flatMap(k => [av(`${PIECES[k].nome} (4)`, { [k]: 4 }), av(`${PIECES[k].nome} (8)`, { [k]: 8 })]);
  window.AVULSOS = [
    ...['filadelfia', 'palha', 'shake_ebi', 'ebi_tuna', 'shimeji', 'skin', 'brocolis'].map(k => av(`${PIECES['uramaki_' + k].nome} (10)`, { ['uramaki_' + k]: 10 })),
    ...['filadelfia', 'poro', 'couve', 'salmao', 'lemon'].map(k => av(`${PIECES['hot_' + k].nome} (8)`, { ['hot_' + k]: 8 })),
    ...['salmao', 'filadelfia', 'ebi', 'kappa'].map(k => av(`${PIECES['hosso_' + k].nome} (8)`, { ['hosso_' + k]: 8 })),
    av('Niguiri salmão (4)', { nigiri_salmao: 4 }), av('Niguiri salmão (8)', { nigiri_salmao: 8 }),
    av('Niguiri barriga de salmão (4)', { nigiri_barriga: 4 }),
    av('Niguiri atum (4)', { nigiri_atum: 4 }), av('Niguiri atum (8)', { nigiri_atum: 8 }),
    av('Niguiri skin (4)', { nigiri_skin: 4 }), av('Niguiri skin (8)', { nigiri_skin: 8 }),
    av('Niguiri shake tamagô (4)', { nigiri_tamago: 4 }), av('Niguiri shake tamagô (8)', { nigiri_tamago: 8 }),
    av('Niguiri vieira (2)', { nigiri_vieira: 2 }), av('Niguiri ebi (4)', { nigiri_ebi: 4 }),
    ...gun,
    av('Sashimi (6)', { sashimi: 6 }), av('Sashimi (12)', { sashimi: 12 }),
    av('Shake sem arroz (4)', { shake: 4 }),
    av('Oniguiri (1)', { oniguiri: 1 }),
    // entram sozinhos: o crispy/chips que acompanha e outra embalagem, outra imagem
    av('Ceviche / Tartar (120g)', { porcao: 1 }), av('Crispy / chips (acompanha)', { crispy: 1 }),
  ];
})();
