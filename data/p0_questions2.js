(function () {
  var P = {
    ch09: {
      term: [
        { id: "p0_ch09_term_cyclin", term: "细胞周期蛋白（cyclin）", def: "一类随细胞周期进程周期性合成和降解的蛋白质，作为调节亚基与CDK结合并决定其底物特异性；cyclin B-CDK1构成MPF，驱动G2/M转换。", kp: "ch09_s4_44", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch09_term_mpf", term: "M期促进因子（MPF）", def: "由催化亚基CDK1和调节亚基cyclin B组成的蛋白激酶复合物，能使靶蛋白磷酸化，驱动细胞从G2期进入M期；其活性受磷酸化、cyclin降解和CKI调控。", kp: "ch09_s3_40", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch09_term_checkpoint", term: "细胞周期检查点（checkpoint）", def: "细胞周期中监测关键事件是否完成的调控通路，如G1/S、G2/M和纺锤体组装检查点；异常时暂时阻滞周期，为修复或纠正争取时间。", kp: "ch09_s2_20", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    ch12: {
      term: [
        { id: "p0_ch12_term_necrosis", term: "细胞坏死（necrosis）", def: "由强烈损伤引起的被动性细胞死亡，表现为细胞肿胀、膜破裂、内容物释放并引发炎症；与凋亡的主动、程序性过程不同。", kp: "ch12_s4_25", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch12_term_apoptosis", term: "细胞凋亡（apoptosis）", def: "由基因编程的主动、有序细胞死亡过程，特征为细胞皱缩、染色质凝集、核碎裂、凋亡小体形成，通常不引起炎症。", kp: "ch12_s4_25", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch12_term_caspase", term: "Caspase（半胱天冬酶）", def: "一类以半胱氨酸为活性中心、切割天冬氨酸后肽键的蛋白酶；启动型caspase被激活后激活执行型caspase，降解底物导致凋亡。", kp: "ch12_s5_42", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch12_term_autophagy", term: "自噬（autophagy）", def: "细胞通过双层膜自噬体包裹胞内物质并送至溶酶体降解的过程；适度自噬维持稳态，过度自噬可导致自噬性细胞死亡。", kp: "ch12_s8_0", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" }
      ]
    },
    tb15: {
      term: [
        { id: "p0_tb15_term_stem", term: "干细胞（stem cell）", def: "具有自我更新和多向分化潜能的细胞，可分为全能、多能和单能干细胞；是组织修复和再生医学的重要来源。", kp: "tb15_s1_322", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb15_term_esc", term: "胚胎干细胞（ESC）", def: "来源于囊胚内细胞团或原始生殖细胞的多能干细胞，可体外长期增殖并分化为三个胚层来源的细胞；研究需注意伦理规范。", kp: "tb15_s1_322", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_tb15_term_ips", term: "诱导多能干细胞（iPS细胞）", def: "通过导入Oct4、Sox2、Klf4、c-Myc等转录因子，将体细胞重编程为具有多能性的细胞；避免使用胚胎，但需评估致瘤性。", kp: "tb15_s1_322", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb15_term_regeneration", term: "再生（regeneration）", def: "生物体对损伤或缺失的组织、器官进行修复和重建的过程；可分生理性再生和病理性再生，涉及干细胞、去分化和转分化。", kp: "tb15_s1_321", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" }
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
