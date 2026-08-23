import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "site");
const date = "2026-08-24";
const dateCn = "2026年8月24日";
const cutoff = "2026年8月24日 07:45（北京时间）";

const updates = [
  {
    target: "daily/10",
    oldTitle: "地缘事件要沿能源、贸易、金融与政策四条路径观察",
    title: "哈萨克斯坦首届库鲁尔泰选举完成投票，74.19%是初步投票率而非席位结果",
    label: "重点 · 地缘政治",
    eyebrow: "重点 · 地缘政治 · 选举进程",
    deck: "哈萨克斯坦中央选举委员会称，首届库鲁尔泰选举投票已结束，全国初步投票率为74.19%。计票仍在进行，所以现在能确认的是投票规模，不能提前推断哪个党获得多少席位。",
    primarySource: "哈萨克斯坦中央选举委员会",
    sourceDate: "2026-08-23",
    sources: [
      ["哈萨克斯坦中选委：20时初步投票率", "https://www.election.gov.kz/rus/news/releases/index.php?ID=10571"],
      ["哈萨克斯坦中选委：投票站开放", "https://www.election.gov.kz/rus/news/releases/index.php?ID=10535"],
      ["哈萨克斯坦中选委：首届库鲁尔泰选举说明", "https://election.gov.kz/eng/news/releases/index.php?ID=10256"],
    ],
    threads: ["投票已结束，计票刚开始", "全国投票率初步为74.19%", "投票率不能替代席位结果"],
    sections: [
      ["conclusion", "一、先说结果：现在能确认到哪一步", [
        "哈萨克斯坦在8月23日举行了历史上第一次库鲁尔泰议会选举。中央选举委员会在当地20时宣布，全国投票已经结束，选区开始计票；这意味着选举进入结果统计阶段，而不是已经产生最终席位。",
        "中选委给出的全国初步投票率为74.19%，对应9,352,151名领取选票的选民。这个数字只回答“有多少登记选民参加了投票”，不能回答各政党分别获得多少票，也不能直接说明选举质量。"
      ]],
      ["background", "二、背景：为什么这次选举值得单独看", [
        "官方把本次投票称为该国历史上的首届库鲁尔泰选举。投票前公布的登记选民为12,605,788人，全国和境外共设置10,423个投票站，其中79个位于61个国家。",
        "大白话说，这是新议会制度真正落地的一次关键步骤。制度名称变化不等于治理效果已经变化，后续仍要看正式席位分配、议会如何运作，以及政策是否出现可观察的改变。"
      ]],
      ["evidence", "三、原始资料里的关键数字", [
        "开票前，中选委称20个地区已有10,363个投票站在7时开始工作，另有107个投票站提前到6时开放。当天20时，全国投票站结束投票并开始计票，法律允许基层委员会在开始计票后最多用12小时完成统计。",
        "地区差异很大：阿拉木图市初步投票率为43.23%，突厥斯坦州为92.16%。这种差异可能来自人口结构、动员方式、地区政治和统计过程等多种因素；在没有更多资料前，不能把差异简单解释成某一种政治态度。"
      ]],
      ["case", "四、用一个例子理解“投票率不等于结果”", [
        "假设一个地区有100名登记选民，75人投票，投票率就是75%。但如果这75票分给七个政党，我们仍不知道谁领先；只有计票完成、无效票处理和席位换算规则确认后，才能讨论结果。",
        "同样，某地投票率高，也不等于所有投票者支持同一政党。把参与度当成胜负，是阅读选举新闻最常见的错误之一。"
      ]],
      ["action", "五、这对普通人有什么现实影响", [
        "对普通读者，短期最值得观察的是正式结果、席位分配和国际观察团的完整报告。对企业和投资者，更重要的是新议会是否会改变预算、产业、贸易或外资政策，而不是只看投票当天的热度。",
        "今天可以把这条消息记成三层：已确认的是投票结束和初步投票率；待确认的是政党得票与席位；更长期的问题是新制度会不会改变政策执行。"
      ]],
      ["boundary", "六、局限：现在还不能说什么", [
        "本文主要依据哈萨克斯坦中央选举委员会自己的公告，属于选举管理机构的第一手数据，但也代表官方口径。独立观察结论、申诉和最终结果尚未在本次整理中形成完整证据链。",
        "因此不能提前宣布胜者，也不能仅凭投票率评价选举是否公平。正式席位结果发布后，需要再核对政党得票、门槛、席位计算方法和观察机构报告。"
      ]]
    ]
  },
  {
    target: "health/10",
    oldTitle: "健康筛查并非项目越多越好",
    title: "美国召回苜蓿芽苗菜，55人染病但污染源调查仍在进行",
    label: "重点 · 食品安全",
    eyebrow: "重点 · 健康 · 食品召回",
    deck: "美国FDA公布苜蓿芽苗菜召回：相关多州暴发已报告55名患者、4人住院、无人死亡。品牌和批次已明确，但污染如何发生仍在调查，不能把风险扩大成“所有芽苗菜都有问题”。",
    primarySource: "美国FDA",
    sourceDate: "2026-08-22",
    sources: [
      ["FDA：Everything Sprouts苜蓿芽苗菜召回", "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/everything-sprouts-llc-recalls-alfalfa-sprouts-due-potential-e-coli-and-salmonella-risk"],
      ["FDA：2026年8月芽苗菜多州暴发调查", "https://www.fda.gov/food/outbreaks-foodborne-illness/outbreak-investigation-shiga-toxin-producing-e-coli-salmonella-sprouts-august-2026"],
    ],
    threads: ["55人患病、4人住院、0死亡", "召回对象是指定品牌和批次", "调查仍在进行，范围可能调整"],
    sections: [
      ["conclusion", "一、先说结果：谁需要立即行动", [
        "FDA在8月22日发布公司召回公告，涉及Everything Sprouts和Calco品牌的部分苜蓿芽苗菜及含这些芽苗菜的混合产品。消费者如果持有公告列出的批次，应停止食用并丢弃或退回，同时清洁接触过产品的冰箱、容器和台面。",
        "这不是对所有芽苗菜的全面禁令。风险对象有品牌、产品、批次和销售地区限制；读者应先核对包装信息，而不是只看到“芽苗菜”三个字就恐慌。"
      ]],
      ["background", "二、背景：召回为什么发生", [
        "FDA和CDC正在调查同时涉及产志贺毒素大肠杆菌（STEC）与沙门氏菌的多州暴发。STEC可以造成严重腹泻，少数患者会出现溶血性尿毒综合征；沙门氏菌常见症状包括腹泻、发热和腹痛。",
        "芽苗菜在温暖潮湿环境中发芽，这种环境也适合细菌繁殖。清洗可以降低表面污染，却不一定能消除已经进入种子或组织的病原体，因此供应链追溯和召回比家庭冲洗更关键。"
      ]],
      ["evidence", "三、病例和追溯证据说明了什么", [
        "截至FDA 8月21日更新，15个州共报告55名患者，其中46人感染STEC、7人感染沙门氏菌、2人同时感染两类病原体；4人住院，没有死亡。发病日期从5月31日延续到8月8日。",
        "34名接受饮食史访谈的患者中有26人，也就是76%，报告吃过苜蓿芽苗菜。餐馆和商店的追溯资料又指向Everything Sprouts分销的产品，所以FDA把它列为暴发来源；但调查仍在继续，污染发生在哪个环节尚未完全确认。"
      ]],
      ["case", "四、怎样核对自己手里的产品", [
        "召回公告列出多个5盎司包装和混合产品，涉及批次222、223、225、226和230，销售流向主要包括明尼苏达州和威斯康星州的批发商与商店。最稳妥的做法是按品牌、产品名称、条码和批次逐项对照FDA页面。",
        "如果产品已拆包且无法确认来源，不应凭外观或气味判断安全。病原体污染通常看不见也闻不出；公告建议无法确认的相关产品直接丢弃，并清洁接触面以减少交叉污染。"
      ]],
      ["action", "五、普通人应该怎么做", [
        "吃过相关产品但没有症状，不代表一定会发病，也不需要自行使用抗生素。若出现严重腹痛、血便、持续发热、明显脱水等情况，应及时联系医疗人员并说明可能的食品暴露。",
        "中国读者首先要核对产品是否来自公告涉及的美国品牌和批次。本文提供的是美国召回信息和通用食品安全知识，不意味着中国本地芽苗菜出现同一批污染。"
      ]],
      ["boundary", "六、局限：数字还可能变化", [
        "55例是FDA当时掌握的报告数，不等于所有真实病例。轻症患者可能没有就医或检测，后续调查也可能补充病例、销售地点或产品范围。",
        "召回公告由企业发布、FDA代为公开；FDA明确说明这不代表为企业或产品背书。最终污染源、责任和暴发结束时间，需要等待FDA和CDC后续更新。"
      ]]
    ]
  },
  {
    target: "papers/10",
    oldTitle: "论文的限制部分不是客套话，而是结论边界",
    title: "热电材料有了更明确的设计规则，但目前仍是理论框架",
    label: "重点 · 材料科学",
    eyebrow: "重点 · 论文 · 热电材料",
    deck: "东京首都大学团队用玻尔兹曼输运理论推导出热电材料的通用优化条件，重点涉及带隙、能带汇聚和掺杂水平。它能缩小材料搜索范围，但还不是已经完成的高效发电器件。",
    primarySource: "Materials Today Advances",
    sourceDate: "2026-07-17",
    sources: [
      ["论文DOI：Ideal band structures for high-performance thermoelectric materials", "https://doi.org/10.1016/j.mtadv.2026.100896"],
      ["东京首都大学研究新闻稿", "https://www.eurekalert.org/news-releases/1140629"],
    ],
    threads: ["把经验试错转成可计算规则", "能带汇聚要精确匹配", "理论最优不等于器件已量产"],
    sections: [
      ["conclusion", "一、先说结果：这篇论文解决了什么", [
        "研究团队试图回答一个很实际的问题：设计热电材料时，带隙、能带结构和掺杂程度应该朝什么方向调，才能提高把废热转成电的效率。过去这些参数彼此牵连，常靠大量试错寻找组合。",
        "论文给出的是一套理论设计规则。它可以帮助研究者先排除不合理方案、缩小实验范围，但并没有直接证明某一种新材料已经达到产业需要的效率、成本和寿命。"
      ]],
      ["background", "二、先把三个专业词讲明白", [
        "热电材料利用塞贝克效应：材料两端有温差时，载流子移动并形成电压。带隙是电子跨到更高能态需要越过的能量差；掺杂则是在材料中加入少量其他元素，用来改变载流子数量和能量位置。",
        "能带汇聚可以理解成让多条电子“通道”处在相近能量，使更多通道共同参与输运。问题是这些调整会同时改变电导、热导和塞贝克系数，所以单独把某一个指标拉高，整体性能不一定变好。"
      ]],
      ["evidence", "三、理论计算给出了哪些具体关系", [
        "团队使用玻尔兹曼输运理论比较多类理想化能带。新闻稿概括称，当环境热能达到约五倍带隙时，电子和空穴朝相反方向贡献的“双极效应”会明显增强，从而拖累热电性能。",
        "在能带汇聚的情形下，研究者发现不同能带的能量越精确匹配，塞贝克性能指标越容易达到最大值。他们还计算了最优化学势，用来指导不同材料大致需要多少掺杂。"
      ]],
      ["case", "四、用路线规划理解这项研究", [
        "把找材料想成在很多岔路中找路线。过去常见做法是每条路都试一段；这篇论文更像先根据地图排除明显绕远或会堵车的路线，再把实验资源集中到少数候选。",
        "地图仍不是实地驾驶。真实材料会有缺陷、晶界、制备误差和稳定性问题，器件还需要电极、封装和热循环测试，所以理论最优点只是实验起点。"
      ]],
      ["action", "五、它可能怎样影响普通人的生活", [
        "如果后续实验找到更好的热电材料，工业废热、汽车尾气和电子设备散热都有机会被部分转成电能。价值不在于“凭空发电”，而是把原本散失的热能回收一部分。",
        "对阅读科技新闻的人，最实用的判断是看研究处在哪一层：理论规则、材料样品、实验器件、长期可靠性还是规模制造。本篇处于前两层之间，距离商业产品仍有多道验证。"
      ]],
      ["boundary", "六、论文没有证明什么", [
        "本次工作主要是理论计算，没有展示一款按全部规则制成并长期运行的完整器件，也没有给出规模制造成本。不同材料中的散射机制和缺陷可能让真实结果偏离理想模型。",
        "新闻稿在8月22日发布，但论文日期为7月17日；本文在详情页保留原文日期，目录显示的是本站8月24日首次收录日期，两者不能混为一谈。"
      ]]
    ]
  },
  {
    target: "codex/10",
    oldTitle: "长任务要设置目标、阶段结果与验证标准",
    title: "OpenAI暂停部分前沿训练，说明高能力模型要把隔离和监控放在速度前面",
    label: "重点 · 安全治理",
    eyebrow: "重点 · Codex · 长任务安全",
    deck: "OpenAI称其因网络安全风险暂停了部分前沿模型训练与工具推理，并提高沙箱、网络隔离和持续监控要求。对个人使用Codex最直接的启示是：权限越高、任务越长，检查点和停止条件越重要。",
    primarySource: "OpenAI",
    sourceDate: "2026-08-18",
    sources: [
      ["OpenAI：Pacing model development in an era of cyber-critical capabilities", "https://openai.com/index/pacing-model-development-cyber-capabilities/"],
    ],
    threads: ["部分训练与工具推理被暂停", "隔离和监控成为硬条件", "这是机构自述，仍需后续技术报告"],
    sections: [
      ["conclusion", "一、先说结果：安全要求正在影响研发速度", [
        "OpenAI在8月18日表示，因一次与Hugging Face有关的事件以及即将推出的Astra模型可能达到其“关键网络安全能力”阈值，公司暂时放慢了部分前沿模型研发。最新模型的强化学习训练曾暂停两周，最大的一次前沿强化学习运行仍处于暂停状态。",
        "这条消息不是新模型发布，而是研发流程变化。它表明当模型能写代码、调用工具并访问网络时，安全边界不再只是上线前检查，而会直接决定哪些训练和推理可以继续运行。"
      ]],
      ["background", "二、为什么工具能力会抬高风险", [
        "只会回答文字的模型和能够执行代码、访问网络、调用内部服务的模型，风险不是同一个等级。后者一旦判断错误、权限配置过宽或环境被攻击，影响可能从一段错误答案扩大到真实系统。",
        "OpenAI称，事件发生后首先暂停了研究集群中可以执行代码或使用联网工具的前沿模型推理，随后逐个工作负载审查恢复。这个做法本质上是先缩小暴露面，再逐项放行。"
      ]],
      ["evidence", "三、公告列出的三类控制", [
        "第一类是工作负载隔离，也就是把不可信代码放进更严格的沙箱；第二类是网络隔离，避免单个工作负载被攻破后直接访问互联网或其他内部网络；第三类是持续安全测试和日志监控。",
        "OpenAI还称，新监控系统会在模型生成过程中持续检查信号，对高风险工具行为逐级升级调查；目标是在发现可疑活动后30分钟内告警。公司估算，被监控推理的计算开销约增加20%，说明安全并不是零成本附加项。"
      ]],
      ["case", "四、把它换成个人Codex场景", [
        "如果任务只是整理一份本地文档，权限可以很小；如果任务要运行脚本、改仓库、访问网络并发布网站，就应拆成“检索—写入—测试—发布”几个阶段，每一阶段只开放必要权限。",
        "例如发布网站前先生成基线和审计，再允许推送；如果测试失败，停止在本地而不是继续上线。这和OpenAI逐项恢复工作负载的思路相同：先证明边界可控，再继续执行。"
      ]],
      ["action", "五、今天可以直接采用的做法", [
        "给长任务写清四件事：允许操作的目录和系统、不能做的动作、必须保留的检查点、出现什么情况立即停止。高风险外部操作还要有独立复核，而不是把所有步骤交给一次自动批准。",
        "对普通用户，最重要的不是记住Astra这个代号，而是理解“能力越强，默认权限越应收紧”。速度慢一点通常只是时间成本，越权或错误发布则可能造成不可逆影响。"
      ]],
      ["boundary", "六、还需要怎样核验", [
        "目前资料来自OpenAI自己的公告，里面对事件、Astra能力和监控效果的描述属于机构自述。公告承诺后续发布技术报告，但本文整理时尚未用独立审计验证暂停范围和监控有效性。",
        "因此不能从这篇公告推出“风险已经消除”，也不能断言模型一定达到某种公开统一的网络安全等级。可确认的是OpenAI公布了暂停和控制措施，以及这些措施对研发节奏造成了实际影响。"
      ]]
    ]
  },
  {
    target: "finance/10",
    oldTitle: "油价上涨会同时影响通胀和利率，但持续时间比单日涨幅更重要",
    title: "美加关税谈判破裂，50%关税已生效但实际冲击取决于覆盖清单",
    label: "重点 · 国际金融",
    eyebrow: "重点 · 金融 · 贸易关税",
    deck: "美国对约200亿美元加拿大商品加征50%关税的措施已经生效，美加谈判随后破裂，加拿大宣布计划在9月8日实施对等反制。关税不是对所有加拿大商品统一加50%，实际影响要看清单、豁免和企业能否替代采购。",
    primarySource: "白宫公告＋美联社",
    sourceDate: "2026-08-23",
    sources: [
      ["白宫：对部分加拿大商品加征额外关税的公告", "https://www.whitehouse.gov/presidential-actions/2026/07/imposing-additional-duties-to-offset-canadian-discrimination-against-the-commerce-of-the-united-states-with-respect-to-alcoholic-beverages/"],
      ["白宫：加拿大关税措施说明", "https://www.whitehouse.gov/fact-sheets/2026/07/fact-sheet-president-donald-j-trump-imposes-additional-tariffs-on-canada/"],
      ["美联社：美加谈判破裂与新关税", "https://apnews.com/article/857ef76b20a766e370d70176135b678e"],
      ["美联社：加拿大总理与经济胁迫争议", "https://apnews.com/article/a180ac85a70bbfb512ea59c224cb6c31"],
    ],
    threads: ["50%是覆盖商品的额外税率", "约200亿美元商品受影响", "反制计划与谈判责任仍有争议"],
    sections: [
      ["conclusion", "一、先说结果：关税已经从威胁变成执行", [
        "白宫7月20日公告规定，清单内部分加拿大商品自8月19日起加征50%额外关税。美联社8月22日至23日报道称，美加最后阶段谈判破裂后，美国措施已执行，涉及商品规模约200亿美元。",
        "加拿大宣布计划从9月8日起实施等额反制，但具体法律清单和最终执行仍要继续核对。双方对谈判为什么破裂的说法不同，因此责任归属应明确标成当事方主张，而不是已证实事实。"
      ]],
      ["background", "二、50%到底覆盖什么", [
        "白宫说明称，三项基于1930年《关税法》第338条的公告分别针对加拿大汽车、酒类和乳制品等歧视问题，覆盖范围还包括曲棍球杆和水泥等产品。关税对清单内商品适用，即使商品符合美墨加协定原产地规则也不自动豁免。",
        "但能源、钾肥、已经受第232条关税约束的商品，以及鱼类和部分关键矿产等不在同一覆盖范围。大白话说，50%是特定清单的额外税率，不是所有从加拿大进口的东西统一涨价一半。"
      ]],
      ["evidence", "三、为什么新闻里的数字不能直接当损失", [
        "约200亿美元是受影响商品的贸易规模估计，不等于政府一定收回200亿美元税款，更不等于加拿大企业损失200亿美元。实际税收取决于进口量是否下降、是否转向其他供应商、企业是否申请豁免，以及谁承担新增成本。",
        "美联社报道称，加拿大计划采取“等额”反制，并把谈判破裂与更广泛的美墨加协定审查联系起来。美国贸易代表则反驳加拿大说法，称渥太华提出了新要求。两种叙述都属于谈判方陈述，需要等待文件和后续协议验证。"
      ]],
      ["case", "四、用一批商品说明价格怎样传导", [
        "假设美国进口商购买100万美元清单内加拿大商品，额外50%关税在不考虑其他税费时就是50万美元。进口商可以自己承担、提高售价、要求加拿大供应商降价，或改从其他国家采购，最终影响由谈判能力和替代难度决定。",
        "如果库存足够，零售价格可能不会立刻变化；如果商品难替代，成本更可能向下游传递。因此市场冲击要看数周和数月的数据，不能只看关税生效当天。"
      ]],
      ["action", "五、普通人和企业应该观察什么", [
        "普通消费者可关注酒类、乳制品、汽车相关和清单内商品是否真的涨价，而不是把所有加拿大产品都当成同一风险。企业应核对海关编码、原产地、合同中的税费承担条款和替代供应商交期。",
        "金融市场上，汇率、相关行业利润率和企业库存是更直接的观察点。只有当关税持续、进口量下降或成本明显传导，才更可能影响通胀和利率判断。"
      ]],
      ["boundary", "六、仍然不确定的部分", [
        "本次整理能确认美国公告的税率、主要范围和生效安排，也能确认美联社报道的谈判破裂与加拿大反制声明。加拿大反制的最终法律文本、豁免细节和执行效果仍需后续官方资料。",
        "关税政策也可能因重新谈判、法院审查或行政调整改变。本文不提供汇率、股票或商品买卖建议；涉及具体企业时必须继续看公司公告和财务报表。"
      ]]
    ]
  }
];

const columnNames = { daily: "每日资讯", health: "身体健康", papers: "论文研究", codex: "Codex 学习", finance: "金融" };
const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function renderHero(item) {
  const [column, index] = item.target.split("/");
  const threads = item.threads.map((thread, position) => `<div><b>0${position + 1}</b><strong>${esc(thread)}</strong><p>${esc(item.sections[Math.min(position, 2)][2][0])}</p></div>`).join("");
  return `<header class="shell reading-hero"><div class="breadcrumbs"><a href="/">首页</a><span>/</span><a href="/column/${column}">${columnNames[column]}</a><span>/</span><span>第 <!-- -->${index}<!-- --> 篇</span></div><p class="eyebrow">${esc(item.eyebrow)}</p><h1>${esc(item.title)}</h1><p class="reading-deck">${esc(item.deck)}</p><div class="reading-meta"><span>本站首次发布：${date}</span><span>原文发布：${item.sourceDate}</span><span>资料截止：${cutoff}</span><span class="source-grade grade-a">A级 · 原始或权威来源</span><span>预计阅读：8—12分钟</span></div><div class="summary-blueprint"><div class="summary-blueprint-lead"><span>30秒先看懂</span><p>${esc(item.deck)}</p><small>先看已确认事实，再看解释、现实影响与仍不确定的部分。</small></div><div class="summary-threads">${threads}</div><div class="source-digest-attribution"><strong>主要依据</strong><a href="${item.sources[0][1]}" target="_blank" rel="noreferrer">${esc(item.primarySource)} · 原文发布：${item.sourceDate} ↗</a></div><div class="summary-card-grid"><div><strong>一个具体例子</strong><p>${esc(item.sections[3][2][0])}</p></div><div><strong>对普通人的影响</strong><p>${esc(item.sections[4][2][0])}</p></div><div><strong>今天可以怎样用</strong><p>${esc(item.sections[4][2][1])}</p></div><div><strong>不能说得太满</strong><p>${esc(item.sections[5][2][0])}</p></div></div></div></header>`;
}

function renderArticle(item) {
  const sections = item.sections.map(([id, heading, paragraphs]) => `<section id="${id}"${id === "conclusion" ? ` data-substantive-update="${date}"` : ""}><p class="section-pattern-label">${id === "conclusion" ? "30秒结论后的完整解构" : "原始资料深读"}</p><h2>${esc(heading)}</h2>${paragraphs.map((paragraph) => `<div class="sourced-paragraph"><p>${esc(paragraph)}</p></div>`).join("")}</section>`).join("");
  const sources = item.sources.map(([name, url], position) => `<a href="${url}" target="_blank" rel="noreferrer"><span>${esc(name)}${position === 0 ? ` · 原文发布：${item.sourceDate}` : ""}</span><b>打开原文 ↗</b></a>`).join("");
  return `<article class="long-article">${sections}<section id="reading-check"><p class="section-pattern-label">最后一步 · 把知识变成自己的判断</p><h2>读完以后，留下四项记录</h2><div class="sourced-paragraph"><p>分别写下已经确认的事实、来源或当事方的主张、本站为了帮助理解所作的解释，以及仍然缺少的证据。四类内容混在一起时，结论很容易被说得过满。</p></div><div class="sourced-paragraph"><p>下一次复查时，先看原始页面是否更新，再看数字和结论是否改变。只有新增事实、来源或结论修正，才算本站实质更新。</p></div></section><section id="sources" class="full-source-list"><h2>参考资料与原始来源</h2><p>以下链接用于核对原始内容。本站正文是中文整理与解释，不代替来源全文。</p>${sources}</section></article>`;
}

function renderCard(item) {
  const [column, index] = item.target.split("/");
  return `<article class="article-card"><div class="article-order">${index}</div><div class="article-preview-main"><p class="card-label">${esc(item.label)}</p><h3><a href="/column/${column}/${index}">${esc(item.title)}</a><small class="article-updated-date">本站发布：${date}</small></h3><p class="article-preview-summary">${esc(item.deck)}</p><div class="article-meta"><span>${esc(item.threads.join(" · "))}</span><span>主要资料：<!-- -->${esc(item.primarySource)}</span><span class="source-grade grade-a">A级 · 原始或权威来源</span></div></div><a href="/column/${column}/${index}" class="article-enter" aria-label="进入全文：${esc(item.title)}"><span>进入全文</span><b>→</b></a></article>`;
}

function updateChrome(html) {
  return html
    .replace(/<div class="live-status"><span><\/span>[\s\S]*?<\/div>/, '<div class="live-status"><span></span> <!-- -->2026.08.24<!-- --> · <!-- -->每日更新 24</div>')
    .replace(/(<aside class="column-status"><span>)[\s\S]*?(<\/span>)/, `$1${dateCn}<!-- --> · <!-- -->每日更新 24$2`)
    .replace(/(<footer class="site-footer">[\s\S]*?<p>)(?:\d{4}年\d{1,2}月\d{1,2}日)([\s\S]*?每日更新(?:<!-- -->)?\s*)\d+(<\/p>)/, `$1${dateCn}$2 24$3`);
}

for (const item of updates) {
  const [column, index] = item.target.split("/");
  const detailPath = path.join(site, "column", column, index, "index.html");
  let detail = await readFile(detailPath, "utf8");
  detail = detail
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(item.title)} · 自学总站</title>`)
    .replace(/<meta name="description" content="[^"]*"\/>/, `<meta name="description" content="${esc(item.deck)}"/>`)
    .replace(/<header class="shell reading-hero">[\s\S]*?<\/header>/, renderHero(item))
    .replace(/<article class="long-article"[^>]*>[\s\S]*?<\/article>/, renderArticle(item));
  detail = updateChrome(detail);
  await writeFile(detailPath, detail, "utf8");

  const columnPath = path.join(site, "column", column, "index.html");
  const relativeColumnPath = `site/column/${column}/index.html`;
  let columnHtml = execFileSync("git", ["show", `HEAD:${relativeColumnPath}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  columnHtml = columnHtml.replace(/<article class="[^"]*article-card[^"]*">[\s\S]*?<\/article>/g, (article) =>
    article.includes(`href="/column/${column}/${index}"`) ? renderCard(item) : article
  );
  columnHtml = updateChrome(columnHtml);
  await writeFile(columnPath, columnHtml, "utf8");
}

const htmlFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name === "index.html") htmlFiles.push(full);
  }
}
await walk(site);
for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  for (const item of updates) html = html.replaceAll(item.oldTitle, item.title);
  html = updateChrome(html);
  if (file === path.join(site, "index.html")) {
    const todayOrder = ["finance/10", "daily/10", "health/10", "codex/10", "papers/10"];
    const accents = { finance: "accent-navy", daily: "accent-vermilion", health: "accent-green", codex: "accent-teal", papers: "accent-blue" };
    const todayCards = todayOrder.map((target, position) => {
      const item = updates.find((entry) => entry.target === target);
      const [column] = target.split("/");
      return `<a href="/column/${target}" class="today-card ${accents[column]}"><span>0${position + 1}<!-- --> · <!-- -->${esc(columnNames[column])}</span><h3>${esc(item.title)}</h3><small class="today-updated-date">本站发布：${date}</small><p>${esc(item.deck)}</p></a>`;
    }).join("");
    html = html
      .replace(/(<section class="shell directory-header"><p>)[\s\S]*?(<\/p>)/, `$1${dateCn}<!-- --> · <!-- -->每日更新 24$2`)
      .replace(/资料截止：\d{4}年\d{1,2}月\d{1,2}日\s+\d{2}:\d{2}（北京时间）(?:；未发布新批次的平台采用最近完整资料)?/, `资料截止：${cutoff}`)
      .replace(/<div class="today-grid">[\s\S]*?<\/div><\/section>/, `<div class="today-grid">${todayCards}</div></section>`);
    const note = `<p class="today-update-note">8月24日新增5篇逐项核验文章；只有这5篇显示浅蓝“今日新增”，其余旧文不冒充更新。<a href="/audit">查看真实更新清单 →</a></p>`;
    html = html.includes('class="today-update-note"')
      ? html.replace(/<p class="today-update-note">[\s\S]*?<\/p>/, note)
      : html.replace('<h2 id="today-title">今日必读</h2>', `<h2 id="today-title">今日必读</h2>${note}`);
  }
  if (file === path.join(site, "archive", "index.html")) {
    html = html.replace(/<article class="archive-entry" data-archive-date="2026-08-24">[\s\S]*?<\/article>/, "");
    const archive = `<article class="archive-entry" data-archive-date="2026-08-24"><div class="archive-date"><strong>2026.08.24</strong><span>每日更新 24 · 5篇真实新增</span></div><div class="archive-content"><h2>2026年8月24日</h2><p>今天从三级来源筛查中选出5条可核验资料，分别写成独立文章。110篇中真实新增5篇，更新率4.5%；未用旧资料改日期、排版或通用模板凑80%。</p><ul><li><span>更新审计</span><a href="/audit">查看5篇真实新增清单 →</a></li></ul></div></article>`;
    html = html.replace('<section class="shell archive-list" aria-label="每日版本">', `<section class="shell archive-list" aria-label="每日版本">${archive}`);
  }
  await writeFile(file, html, "utf8");
}

const auditArticles = updates.map((item) => ({
  target: item.target,
  changeType: "new",
  changeSummary: `用${item.primarySource}等已核验资料替换原有泛化文章，新增具体事实、数字、白话解释、现实影响和局限。`,
  title: item.title,
  sourceVerification: { ok: true, checkedAt: cutoff, sources: item.sources.map(([name, url]) => ({ name, url })) },
}));
const audit = {
  date,
  sourceCutoff: cutoff,
  totalArticles: 110,
  substantivelyUpdated: auditArticles.length,
  updateRate: auditArticles.length / 110,
  target: 0.8,
  targetMet: false,
  localModel: { available: false, used: 0, reason: "127.0.0.1:1234 refused connection" },
  articles: auditArticles,
};
await writeFile(path.join(root, "data", `update-audit-${date}.json`), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
await mkdir(path.join(site, "audit"), { recursive: true });
await writeFile(path.join(site, "audit", `update-${date}.json`), `${JSON.stringify(audit, null, 2)}\n`, "utf8");

const rows = updates.map((item) => `<li><strong>${item.target}</strong><span>${esc(item.title)}</span><small>${esc(item.primarySource)}；新增事实、数字、解释、影响和局限。</small></li>`).join("");
const auditPage = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/assets/index-CVB57ELS.css"/><link rel="stylesheet" href="/assets/daily-highlights.css"/><title>8月24日更新审计 · 自学总站</title><script defer src="https://cloud.umami.is/script.js" data-website-id="b0b06b94-08e9-4d2c-b764-b905e45e3da1"></script></head><body><header class="site-header"><div class="shell header-inner"><a href="/" class="brand"><span class="brand-mark">知</span><span>自学总站</span></a><nav class="main-nav"><a href="/">全部专栏</a><a href="/ski-training">滑雪训练</a><a href="/archive">每日归档</a></nav><div class="live-status"><span></span> 2026.08.24 · 每日更新 24</div></div></header><main class="shell audit-page"><header class="directory-header"><p>${dateCn} · 真实更新审计</p><h1>5 / 110 篇真实新增，更新率4.5%</h1><p>没有达到80%目标。本页只统计正文和主要来源都发生真实变化的5篇；其他旧文没有改日期，也没有高亮。</p></header><section class="audit-summary"><h2>质量说明</h2><p>本地模型接口未启动，实际处理0篇；5篇均由Codex核对原始来源后写作。周末可用的新批次有限，因此质量优先、如实统计。</p></section><section class="audit-list"><h2>逐篇变更</h2><ul>${rows}</ul></section></main><footer class="site-footer"><div class="shell footer-inner"><p>自学总站 · 长期自学知识库</p><p>${dateCn} · 每日更新 24</p></div></footer></body></html>`;
await writeFile(path.join(site, "audit", "index.html"), auditPage, "utf8");

const mirrorPath = path.join(site, "mirror-status.json");
const mirror = JSON.parse(await readFile(mirrorPath, "utf8"));
mirror.generatedAt = new Date().toISOString();
mirror.update = { date, articles: 5, rate: "4.5%", targetMet: false };
await writeFile(mirrorPath, `${JSON.stringify(mirror, null, 2)}\n`, "utf8");

console.log("Prepared 5/110 verified new articles (4.5%); target 80% not met and not claimed.");
