(function () {
  var P = {
    ch12: {
      term: [
        { id: "p0_ch12_term_caspase", term: "Caspase（半胱天冬酶）", def: "一类以半胱氨酸为活性中心、切割天冬氨酸后肽键的蛋白酶；启动型caspase被激活后激活执行型caspase，降解底物导致凋亡。", kp: "ch12_s5_42", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch12_term_aging", term: "衰老（aging / senescence）", def: "细胞或机体随年龄增长出现的结构、功能和代谢的退行性变化；细胞衰老表现为不可逆的增殖停滞、端粒缩短、氧化损伤和衰老相关分泌表型。", kp: "ch12_s0_2", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_ch12_term_telomerase", term: "端粒酶（telomerase）", def: "由RNA组分和逆转录酶组成的核糖核蛋白复合物，以自身RNA为模板延长端粒DNA；在干细胞和多数肿瘤细胞中活性较高，体细胞中较低。", kp: "ch12_s3_11", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    tb15: {
      term: [
        { id: "p0_tb15_term_esc", term: "胚胎干细胞（ESC）", def: "来源于囊胚内细胞团或原始生殖细胞的多能干细胞，可体外长期增殖并分化为三个胚层来源的细胞；研究需注意伦理规范。", kp: "tb15_s1_322", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_tb15_term_ips", term: "诱导多能干细胞（iPS细胞）", def: "通过导入Oct4、Sox2、Klf4、c-Myc等转录因子，将体细胞重编程为具有多能性的细胞；避免使用胚胎，但需评估致瘤性。", kp: "tb15_s1_322", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    tb03: {
      term: [
        { id: "p0_tb03_term_cellline", term: "细胞系（cell line）", def: "原代培养细胞经首次传代后形成的细胞群体；若发生遗传突变、获得无限增殖能力，则成为连续细胞系。", kp: "tb03_s2_43", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb03_term_cellstrain", term: "细胞株（cell strain）", def: "从原代培养或细胞系中选出的、具有特定性状或标记的细胞群体；通常保持二倍体核型和接触抑制，可有限传代。", kp: "tb03_s2_43", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_tb03_term_mab", term: "单克隆抗体（monoclonal antibody）", def: "由单一B细胞克隆与骨髓瘤细胞融合形成的杂交瘤产生、只识别单一抗原表型的抗体；特异性强、可大量制备。", kp: "tb03_s2_44", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb03_term_immunoem", term: "免疫电镜（immunoelectron microscopy）", def: "用胶体金等标记抗体，在电镜下定位细胞内特定抗原的技术；结合超薄切片可揭示蛋白在亚细胞结构中的分布。", kp: "tb03_s1_41", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" }
      ]
    }
  };
  Object.keys(P).forEach(function (cid) {
    var ch = window.CHAPTERS && window.CHAPTERS[cid];
    if (!ch) return;
    Object.keys(P[cid]).forEach(function (kind) {
      ch[kind] = (ch[kind] || []).concat(P[cid][kind]);
    });
  });
})();
