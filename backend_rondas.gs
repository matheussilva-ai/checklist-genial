// ============================================================
// BACKEND — Checklist de Ronda Mensal — Genial Care Facilities
// Google Apps Script — Web App (doGet / doPost)
//
// COMO CONFIGURAR:
//   1. Acesse script.google.com → Novo projeto
//   2. Cole este código
//   3. Clique em "Implantar" → "Nova implantação"
//   4. Tipo: Aplicativo da Web
//   5. Executar como: Eu (sua conta)
//   6. Quem pode acessar: Qualquer pessoa
//   7. Copie a URL gerada — você vai precisar dela no app web
// ============================================================

const SPREADSHEET_NAME = "Rondas Mensais — Genial Care Facilities";
const ABA_RONDAS = "Rondas";
const ABA_ITENS = "Itens Não Conformes";
const ABA_RESUMO = "Resumo por Unidade";

// ── INICIALIZAÇÃO DA PLANILHA ─────────────────────────────────────────

function inicializarPlanilha() {
  const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  const ssId = ss.getId();
  
  // Aba 1: Rondas (uma linha por ronda)
  const abaRondas = ss.getActiveSheet().setName(ABA_RONDAS);
  abaRondas.getRange(1, 1, 1, 8).setValues([[
    "ID Ronda", "Data", "Unidade", "Responsável",
    "Total Itens", "Respondidos", "Não Conformes", "Itens Críticos NC"
  ]]);
  abaRondas.getRange(1, 1, 1, 8)
    .setBackground("#4b2d6f").setFontColor("#ffffff").setFontWeight("bold");
  abaRondas.setFrozenRows(1);
  abaRondas.setColumnWidth(1, 180);
  abaRondas.setColumnWidth(2, 160);
  abaRondas.setColumnWidth(3, 140);
  abaRondas.setColumnWidth(4, 160);

  // Aba 2: Itens Não Conformes (uma linha por item NC)
  const abaItens = ss.insertSheet(ABA_ITENS);
  abaItens.getRange(1, 1, 1, 7).setValues([[
    "ID Ronda", "Data", "Unidade", "Responsável", "Grupo", "Item", "Observação"
  ]]);
  abaItens.getRange(1, 1, 1, 7)
    .setBackground("#dc2626").setFontColor("#ffffff").setFontWeight("bold");
  abaItens.setFrozenRows(1);
  abaItens.setColumnWidth(1, 180);
  abaItens.setColumnWidth(2, 160);
  abaItens.setColumnWidth(3, 140);
  abaItens.setColumnWidth(4, 160);
  abaItens.setColumnWidth(5, 200);
  abaItens.setColumnWidth(6, 300);
  abaItens.setColumnWidth(7, 300);

  // Aba 3: Resumo por Unidade (dashboard simples)
  const abaResumo = ss.insertSheet(ABA_RESUMO);
  abaResumo.getRange(1, 1, 1, 5).setValues([[
    "Unidade", "Total Rondas", "Último Responsável", "Última Ronda", "Total NC (todas as rondas)"
  ]]);
  abaResumo.getRange(1, 1, 1, 5)
    .setBackground("#4b2d6f").setFontColor("#ffffff").setFontWeight("bold");
  abaResumo.setFrozenRows(1);

  // Salva o ID da planilha nas propriedades do script
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ssId);
  
  Logger.log("✅ Planilha criada!");
  Logger.log("📊 Link: https://docs.google.com/spreadsheets/d/" + ssId);
  Logger.log("🔗 Abra a planilha e compartilhe com quem precisar.");
}

// ── WEB APP: doGet (health check) ────────────────────────────────────

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "API Rondas Genial Care funcionando." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── WEB APP: doPost (recebe ronda) ───────────────────────────────────

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const ssId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    
    if (!ssId) {
      return resposta(false, "Planilha não inicializada. Execute inicializarPlanilha() primeiro.");
    }

    const ss = SpreadsheetApp.openById(ssId);
    const agora = new Date(dados.data || Date.now());
    const dataFormatada = Utilities.formatDate(agora, "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

    // ── Salvar na aba Rondas ─────────────────────────────────────────
    const abaRondas = ss.getSheetByName(ABA_RONDAS);
    abaRondas.appendRow([
      dados.id,
      dataFormatada,
      dados.unidade,
      dados.responsavel,
      dados.resumo.total,
      dados.resumo.respondidos,
      dados.resumo.naoConformes,
      dados.resumo.criticos,
    ]);

    // Colorir linha se houver não conformes
    if (dados.resumo.naoConformes > 0) {
      const ultimaLinha = abaRondas.getLastRow();
      abaRondas.getRange(ultimaLinha, 7).setBackground("#fef2f2").setFontColor("#dc2626").setFontWeight("bold");
      if (dados.resumo.criticos > 0) {
        abaRondas.getRange(ultimaLinha, 8).setBackground("#fff7ed").setFontColor("#ea580c").setFontWeight("bold");
      }
    }

    // ── Salvar itens não conformes ───────────────────────────────────
    const abaItens = ss.getSheetByName(ABA_ITENS);
    if (dados.chamados && dados.chamados.length > 0) {
      const linhasNC = dados.chamados.map(c => [
        dados.id,
        dataFormatada,
        dados.unidade,
        dados.responsavel,
        c.grupo,
        (c.critico ? "⚠ " : "") + c.texto,
        c.obs || "",
      ]);
      abaItens.getRange(abaItens.getLastRow() + 1, 1, linhasNC.length, 7).setValues(linhasNC);
      
      // Destacar itens críticos em laranja
      const primeiraLinha = abaItens.getLastRow() - linhasNC.length + 1;
      dados.chamados.forEach((c, i) => {
        if (c.critico) {
          abaItens.getRange(primeiraLinha + i, 1, 1, 7)
            .setBackground("#fff7ed").setFontColor("#9a3412");
        }
      });
    }

    // ── Atualizar aba Resumo ─────────────────────────────────────────
    atualizarResumo(ss, dados.unidade, dados.responsavel, dataFormatada, dados.resumo.naoConformes);

    return resposta(true, "Ronda salva com sucesso.");

  } catch (err) {
    return resposta(false, "Erro: " + err.toString());
  }
}

// ── ATUALIZAR RESUMO POR UNIDADE ─────────────────────────────────────

function atualizarResumo(ss, unidade, responsavel, data, naoConformes) {
  const aba = ss.getSheetByName(ABA_RESUMO);
  const dados = aba.getDataRange().getValues();
  
  // Procura linha da unidade
  let linhaUnidade = -1;
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === unidade) { linhaUnidade = i + 1; break; }
  }

  if (linhaUnidade === -1) {
    // Nova unidade
    aba.appendRow([unidade, 1, responsavel, data, naoConformes]);
  } else {
    // Atualiza existente
    const totalRondas = (dados[linhaUnidade - 1][1] || 0) + 1;
    const totalNC = (dados[linhaUnidade - 1][4] || 0) + naoConformes;
    aba.getRange(linhaUnidade, 2, 1, 4).setValues([[totalRondas, responsavel, data, totalNC]]);
  }
}

// ── HELPER ───────────────────────────────────────────────────────────

function resposta(sucesso, mensagem) {
  return ContentService
    .createTextOutput(JSON.stringify({ sucesso, mensagem }))
    .setMimeType(ContentService.MimeType.JSON);
}
