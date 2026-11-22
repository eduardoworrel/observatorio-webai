// Fixture dos papeis de credito (?fixture=papeis): reescreve os creditos reais com os quatro papeis e acrescenta motivos de origem.
(function () {   // idempotente: se o dado ja traz o papel do credito, ele e refeito
  var D = window.MAPA_DADOS; if (!D) return;
  var pap = { fapergs: 'financiador', neuralmind: 'desenvolvedor', escavador: 'parceiro' }, n = 0;
  D.modelos.forEach(function (m) {
    if (m.creditos && m.creditos.length) { m.creditos = m.creditos.map(function (c) { var k = c.split(':'), id = k[1]; return k[0] + ':' + id + ':' + (pap[id] || 'desenvolvedor'); }); var k = m.creditos[0].split(':'); m.origem_motivo = [{ codigo: k[2], entidade: k[1] }]; }
    else if (m.escopo === 'br' && m.publicador === 'neuralmind' && !m.origem_motivo) m.origem_motivo = 'publicador_br';
  });
  var alvo = D.modelos.filter(function (m) { return m.escopo === 'br' && !(m.creditos || []).length; });
  if (alvo[0]) { alvo[0].creditos = ['inst:ufmg:plataforma']; alvo[0].origem_motivo = [{ codigo: 'plataforma', entidade: 'ufmg' }]; }
  if (alvo[1]) { alvo[1].creditos = ['inst:fapergs:parceiro', 'inst:usp:desenvolvedor']; alvo[1].origem_motivo = 'foco_pt_br'; }
})();
