(function () {
  var P = {
    ch07: {
      term: [
        { id: "p0_ch07_term_treadmill", term: "踏车行为（treadmilling）", def: "微丝正极因G-actin不断加入而延长、负极因去组装而缩短，而微丝总长度基本不变的现象；与ATP水解和临界浓度有关，是微丝动态性的重要表现。", kp: "ch07_s1_7", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch07_term_arp", term: "Arp2/3复合体", def: "由Arp2、Arp3及多种调节蛋白组成的复合体，结合在已存在微丝的侧面，促进新微丝分支成核，参与细胞迁移、片状伪足和胞吞等。", kp: "ch07_s1_9", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" }
      ]
    },
    ch08: {
      term: [
        { id: "p0_ch08_term_keratin", term: "角蛋白（keratin）", def: "上皮细胞中的一类中间纤维蛋白，由酸性I型和碱性II型角蛋白形成异二聚体后组装；组织特异性强，是上皮性肿瘤鉴别的重要标志。", kp: "ch08_s2_6", freq: "常考", prio: "A", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch08_term_vimentin", term: "波形蛋白（vimentin）", def: "间充质来源细胞中常见的中间纤维蛋白，常与微管、微丝协同维持细胞形态和力学稳定，是间叶性肿瘤常用标志物。", kp: "ch08_s2_6", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_ch08_term_desmin", term: "结蛋白（desmin）", def: "肌细胞中主要的中间纤维蛋白，连接肌原纤维与细胞膜/细胞连接，维持肌细胞的机械稳定。", kp: "ch08_s2_6", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_ch08_term_nf", term: "神经丝蛋白（neurofilament）", def: "神经元轴突中主要的中间纤维蛋白，由NF-L、NF-M、NF-H组成，维持轴突口径和机械强度；异常与神经退行性疾病相关。", kp: "ch08_s2_8", freq: "了解", prio: "B", req: "了解", src: "网盘P0/试题解析" },
        { id: "p0_ch08_term_lamin", term: "核纤层蛋白（lamin）", def: "核纤层的主要成分，属V型中间纤维蛋白，位于核内膜内侧，支持核膜并参与染色质组织；有丝分裂时被磷酸化而解聚。", kp: "ch08_s7_19", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    ch13: {
      term: [
        { id: "p0_ch13_term_marker", term: "肿瘤标志物（tumor marker）", def: "肿瘤组织或体液中可出现、用于提示肿瘤存在、类型、疗效或预后的分子（蛋白、糖类、核酸等）；理想标志物应敏感、特异，如AFP、CEA、PSA。", kp: "ch13_s3_33", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_ch13_term_indirect", term: "间接致癌物（indirect carcinogen）", def: "本身不直接致癌，需经体内代谢（如P450酶系）活化后才具有致癌活性的化学物，如苯并芘、黄曲霉毒素B1。", kp: "ch13_s3_33", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_ch13_term_anchor", term: "锚定依赖性（anchorage dependence）", def: "正常细胞需黏附于适宜的细胞外基质才能存活和增殖；失去锚定通常发生失巢凋亡。肿瘤细胞可丧失锚定依赖性。", kp: "ch13_s0_14", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch13_term_tumorigenesis", term: "肿瘤发生（tumorigenesis）", def: "由多种致癌因素引起基因突变累积，使细胞生长调控失控，获得无限增殖、侵袭和转移能力的过程；具有多阶段、多基因特征。", kp: "ch13_s3_33", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_ch13_term_p53", term: "p53", def: "重要抑癌基因，编码转录因子；DNA损伤时诱导p21使细胞周期阻滞，修复失败则诱导凋亡；突变后功能丧失，促进肿瘤发生。", kp: "ch13_s4_38", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ],
      calc: [
        { id: "p0_ch13_calc_aponec", q: "实验室培养的HeLa细胞经药物处理后发生死亡。请设计两种实验方案，区别细胞是发生了凋亡还是坏死，并说明预期结果与对照。", a: "方案一：Annexin V-FITC/PI流式检测。早期凋亡细胞磷脂酰丝氨酸外翻，呈Annexin V阳性、PI阴性；坏死细胞膜破损，PI阳性；晚期凋亡可双阳性。方案二：DNA片段化分析。凋亡时DNA被切割成约180—200 bp及其倍数的片段，琼脂糖凝胶电泳呈“梯状”；坏死时DNA随机降解，呈弥散“拖尾”。还可辅以Hoechst/DAPI形态观察（凋亡核浓缩、边集、凋亡小体；坏死细胞肿胀、膜破裂）、caspase-3活性或PARP切割检测、LDH释放实验。应设未处理对照、阳性对照，并在多个时间点重复。", kp: "ch13_s0_14", kps: "两种方案(2分)+凋亡/坏死预期结果(2分)+对照与重复(1分)", subtype: "实验设计", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_ch13_calc_g418", q: "有一个带新霉素抗性、表达α-微管蛋白-GFP融合蛋白的真核表达质粒。简述如何用G418筛选稳定表达该质粒的HeLa细胞系，并利用该细胞系观察细胞周期。", a: "①构建含neo抗性基因与α-tubulin-GFP的质粒，转染HeLa；②48 h后改用含G418的选择培养基，先做G418浓度杀伤曲线，选择未转染细胞全部死亡、转染细胞可存活的最低浓度；③每隔2—3天换液，形成抗性克隆后挑取单克隆，有限稀释法纯化；④用荧光显微镜、Western blot或流式验证GFP-微管蛋白表达；⑤用血清饥饿、胸苷双阻断或诺考达唑同步化，洗脱释放后活细胞时间序列成像，DAPI染核，观察微管、纺锤体和染色体变化，统计各细胞周期时相比例。设空载体、未转染和DMSO对照。", kp: "tb13_s0_283", kps: "转染与G418筛选(2分)+单克隆验证(1分)+同步化与成像(2分)+对照(1分)", subtype: "实验设计", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    tb03: {
      term: [
        { id: "p0_tb03_term_resolution", term: "分辨率（resolution）", def: "能区分两个质点间的最小距离。光镜受衍射限制约0.2 μm；电镜可达0.1—0.2 nm。提高分辨率可缩短波长或增大数值孔径。", kp: "tb03_s0_31", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb03_term_fluorescence", term: "荧光显微镜（fluorescence microscope）", def: "用激发光照射荧光标记样品，检测发射荧光；常用于DAPI、GFP等定位，灵敏度高，但需注意光漂白和自发荧光。", kp: "tb03_s0_33", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_tb03_term_confocal", term: "激光扫描共焦显微镜（confocal microscope）", def: "用激光逐点扫描，并用共焦针孔排除焦外光，实现光学切片和三维重建；分辨率和对比度高于普通荧光显微镜。", kp: "tb03_s0_34", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb03_term_frap", term: "FRAP（荧光恢复后光漂白）", def: "用强激光漂白细胞内局部荧光，再观察该区域荧光恢复的速度和程度，以分析分子的扩散、流动性和结合动力学。", kp: "tb03_s3_45", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ],
      calc: [
        { id: "p0_tb03_calc_frap", q: "如何用FRAP实验检测某种膜蛋白在细胞膜上的流动性？请写出主要步骤、对照和结果分析。", a: "①构建GFP-目标膜蛋白表达载体并转染细胞，确认蛋白定位于质膜；②用共焦显微镜选取质膜平坦区域，设定感兴趣区（ROI）；③用高强度激光短时漂白ROI，立即以低强度激光时间序列采集ROI及周围区域荧光；④绘制ROI荧光恢复曲线，计算半恢复时间、移动分数和扩散系数；⑤对照：未漂白区域、固定细胞、已知流动性不同的膜蛋白；⑥结果：恢复快、移动分数高提示膜蛋白扩散/流动性强；恢复慢或几乎不恢复提示与膜骨架/蛋白复合物结合。注意校正背景、光漂白和细胞运动。", kp: "tb03_s3_45", kps: "标记与成像(2分)+漂白/恢复曲线(2分)+对照与解释(2分)", subtype: "实验设计", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    tb12: {
      term: [
        { id: "p0_tb12_term_ribosome", term: "核糖体（ribosome）", def: "无膜包裹的核糖核蛋白颗粒，由rRNA和r蛋白组成，是蛋白质合成场所；原核70S（50S+30S），真核80S（60S+40S）。", kp: "tb12_s0_262", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb12_term_polysome", term: "多核糖体（polyribosome）", def: "一个mRNA上同时结合多个核糖体形成的串珠状结构，可同时翻译多条相同多肽，提高翻译效率。", kp: "tb12_s2_267", freq: "常考", prio: "A", req: "理解", src: "网盘P0/试题解析" },
        { id: "p0_tb12_term_ribozyme", term: "核酶（ribozyme）", def: "具有催化活性的RNA。核糖体的肽酰转移酶活性由rRNA承担，是核酶；核酶的发现为RNA世界假说提供证据。", kp: "tb12_s2_270", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb12_term_pt", term: "肽酰转移酶（peptidyl transferase）", def: "核糖体大亚基中催化肽键形成的活性中心；其催化本质由rRNA承担，属于核酶，而不是蛋白质酶。", kp: "tb12_s2_266", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ],
      calc: [
        { id: "p0_tb12_calc_ribozyme", q: "设计实验证明核糖体的肽酰转移酶活性来自rRNA而不是蛋白质。", a: "①分离纯化核糖体大亚基，建立体外肽键形成/肽酰转移酶测定体系；②用蛋白酶K充分消化去除蛋白质，检测rRNA是否仍具有肽酰转移酶活性；③用RNase处理作为对照，活性应丧失；④设未处理核糖体、单独rRNA、单独r蛋白及已知抑制剂对照；⑤若去蛋白后仍保留活性、RNase处理后失活，则支持催化活性由rRNA承担。注意设置空白对照、重复和活性定量。", kp: "tb12_s2_266", kps: "分离/体外体系(2分)+蛋白酶与RNase对照(2分)+结果解释(2分)", subtype: "实验设计", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    tb13: {
      calc: [
        { id: "p0_tb13_calc_colchicine", q: "设计实验观察微管解聚药物对细胞有丝分裂纺锤体装配和染色体排列的影响，并说明如何验证药物的可逆性。", a: "①取对数期细胞，设DMSO对照和秋水仙素/诺考达唑处理组；②用α-tubulin免疫荧光标记微管，DAPI染染色体，统计纺锤体形态、染色体是否排列在赤道板、后期A/B是否发生；③处理组预期微管解聚、纺锤体不能正常装配、染色体不能整列，细胞阻滞于前中期；④洗去药物后在不同时间点观察纺锤体重新装配、染色体整列和分裂恢复，验证可逆性；⑤设阳性/阴性对照，重复并定量统计。", kp: "tb13_s0_284", kps: "分组与药物(2分)+免疫荧光指标(2分)+洗脱可逆实验(2分)", subtype: "实验设计", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
      ]
    },
    tb17: {
      term: [
        { id: "p0_tb17_term_tight", term: "紧密连接（tight junction）", def: "相邻上皮细胞膜蛋白直接接触形成的封闭连接，封闭细胞间隙、维持细胞极性，并限制膜蛋白和膜脂的侧向扩散。", kp: "tb17_s0_362", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb17_term_desmo", term: "桥粒（desmosome）", def: "锚定连接的一种，跨膜钙黏蛋白（桥粒芯蛋白/桥粒胶蛋白）经致密斑连接中间纤维，增强组织抗机械张力。", kp: "tb17_s0_363", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb17_term_hemi", term: "半桥粒（hemidesmosome）", def: "上皮细胞基底面与基膜之间的锚定连接，跨膜整联蛋白连接层粘连蛋白与细胞内中间纤维。", kp: "tb17_s0_363", freq: "常考", prio: "A", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb17_term_gap", term: "间隙连接（gap junction）", def: "由连接蛋白形成的通道连接，允许离子和小分子代谢物通过，介导代谢偶联和电偶联。", kp: "tb17_s0_364", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb17_term_collagen", term: "胶原（collagen）", def: "细胞外基质中最丰富的纤维蛋白，三股螺旋结构，提供抗张强度；合成需羟化、糖基化与交联。", kp: "tb17_s2_373", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" },
        { id: "p0_tb17_term_fn", term: "纤连蛋白（fibronectin）", def: "ECM中的糖蛋白，含RGD等结合位点，连接细胞（整联蛋白）与ECM，参与黏附、迁移和伤口修复。", kp: "tb17_s2_377", freq: "常考", prio: "A", req: "掌握", src: "网盘P0/试题解析" }
      ],
      calc: [
        { id: "p0_tb17_calc_integrin", q: "设计实验检测某细胞表面整联蛋白的表达及其介导的细胞黏附功能。", a: "①表达检测：用抗整联蛋白抗体做流式或免疫荧光，设同型IgG对照；Western blot/免疫沉淀可验证总蛋白。②功能检测：用纤连蛋白或胶原包被培养板，接种细胞，设BSA/未包被对照，观察贴壁、铺展和迁移；加入RGD肽或抗整联蛋白抗体阻断，预期黏附/铺展下降；检测黏着斑蛋白、FAK磷酸化。③设阳性对照细胞和剂量依赖实验，重复定量。", kp: "tb17_s1_371", kps: "表达检测(2分)+黏附功能(2分)+阻断与对照(2分)", subtype: "实验设计", freq: "高频", prio: "S", req: "掌握", src: "网盘P0/试题解析" }
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
