/**
 * Fun, meaningful status phrases for 大师兄.
 * Drawn from classical Chinese poetry, Zen, and scholarly traditions.
 * Thinking phrases rotate during streaming; idle phrases are picked per transition.
 */

/** Shown while AI is streaming / working — classical "scholar at work" vibes */
export const THINKING_PHRASES = [
  // 经典思辨
  "冥思中…",       // deep contemplation
  "推敲中…",       // deliberating (贾岛推敲)
  "参悟中…",       // seeking enlightenment
  "沉吟中…",       // pondering (白居易《琵琶行》)
  "格物中…",       // investigating things (《大学》)
  "求索中…",       // seeking (屈原「上下求索」)
  "思辨中…",       // reasoning
  "悟道中…",       // comprehending the Dao
  "顿悟中…",       // epiphany
  "凝神中…",       // concentrating
  "入定中…",       // deep meditation (Buddhist)
  "运筹中…",       // strategizing (运筹帷幄)
  "苦吟中…",       // laboring over words (贾岛苦吟)

  // 文人雅趣
  "煮茶中…",       // brewing tea
  "焚香中…",       // burning incense (scholar's ritual)
  "磨墨中…",       // grinding ink
  "翻典中…",       // consulting the classics
  "挑灯中…",       // working by lamplight (辛弃疾「挑灯看剑」)
  "听雨中…",       // listening to rain (蒋捷《虞美人》)
  "观星中…",       // reading the stars
  "拈花中…",       // holding a flower (拈花微笑, Zen)
  "抽丝中…",       // unraveling threads (抽丝剥茧)
  "神游中…",       // spirit-wandering

  // 有趣/现代
  "卜算中…",       // divining
  "掐指算中…",     // counting on fingers (fortune-teller)
  "解题中…",       // solving the puzzle
  "理毛中…",       // grooming (cat moment)

  // 新增：有趣的状态
  "捋胡须中…",     // stroking beard (老学者)
  "翻箱倒柜中…",   // rummaging (找资料)
  "灵光乍现中…",   // flash of inspiration
  "修炼中…",       // cultivating
  "炼丹中…",       // refining elixir (道士)
  "施法中…",       // casting spell (法师)
  "掘地三尺中…",   // digging deep
  "上下求索中…",   // searching high and low
  "脑洞大开中…",   // brainstorming wildly
  "憋大招中…",     // charging ultimate skill
  "闭关中…",       // in seclusion
  "念咒中…",       // chanting
  "画符中…",       // drawing talismans
  "开光中…",       // consecrating
];

/** Shown when AI is idle / online — calm, witty, present */
export const IDLE_PHRASES = [
  // 王维·山水
  "坐看云起",       // sitting, watching clouds rise (王维《终南别业》)
  "独坐幽篁",       // sitting alone in bamboo (王维《竹里馆》)
  "竹里听风",       // listening to wind in bamboo

  // 陶渊明·闲适
  "悠然自得",       // at ease (陶渊明)
  "闲庭信步",       // strolling in the courtyard
  "清风徐来",       // a gentle breeze arrives (苏轼《赤壁赋》)
  "水波不兴",       // still water, no ripples (苏轼《赤壁赋》)

  // 文人雅致
  "半壶清茶",       // half a pot of clear tea
  "花间小酌",       // a sip among flowers (李白)
  "闲敲棋子",       // idly tapping chess pieces (赵师秀《约客》)
  "枕书小憩",       // napping on a book
  "月明风清",       // bright moon, clear breeze

  // 待命
  "候君多时",       // been waiting for you
  "静候差遣",       // awaiting your orders
  "蓄势待发",       // gathering momentum
  "拂袖待命",       // sleeves brushed, standing by
  "万事俱备",       // everything ready
  "一切就绪",       // all set

  // 猫
  "晒太阳中",       // sunbathing (cat moment)

  // 新增：更多有趣的状态
  "摊开四脚",       // sprawled out (cat躺平)
  "发呆放空",       // spacing out
  "望穿秋水",       // longing for you
  "打个盹儿",       // taking a nap
  "伸个懒腰",       // stretching
  "蹲守中",         // on standby
  "随时待命",       // ready anytime
  "养精蓄锐",       // conserving energy
  "偷得浮生半日闲", // stealing leisure (李涉)
  "闭目养神",       // resting with eyes closed
  "神清气爽",       // refreshed and alert
  "整装待发",       // all geared up
];

/** Time-based idle phrases — adds flavor based on time of day */
const TIME_BASED_IDLE: Record<string, string[]> = {
  morning: [    // 6:00 - 12:00
    "晨光熹微",       // dawn light
    "闻鸡起舞",       // rising with the rooster
    "朝露未晞",       // morning dew not yet dry
  ],
  afternoon: [  // 12:00 - 18:00
    "午后小憩",       // afternoon rest
    "日正当中",       // sun at its peak
    "茶歇时分",       // tea break time
  ],
  evening: [    // 18:00 - 22:00
    "华灯初上",       // lights coming on
    "日暮西山",       // sunset on western hills
    "月上柳梢",       // moon rising over willows
  ],
  night: [      // 22:00 - 6:00
    "挑灯夜读",       // reading by lamplight (辛弃疾)
    "秉烛夜游",       // touring by candlelight (李白)
    "万籁俱寂",       // all is silent
    "夜深人静",       // deep night, all quiet
  ],
};

/** Time-based thinking phrases */
const TIME_BASED_THINKING: Record<string, string[]> = {
  morning: [
    "晨起悟道中…",     // morning enlightenment
  ],
  afternoon: [
    "午后冥想中…",     // afternoon meditation
  ],
  evening: [
    "黄昏思索中…",     // dusk contemplation
  ],
  night: [
    "挑灯苦读中…",     // burning midnight oil
    "秉烛研究中…",     // researching by candlelight
    "夜半推敲中…",     // midnight deliberation
  ],
};

/** Get current time period */
function getTimePeriod(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/** Pick a random element, avoiding the previous one */
export function pickRandom<T>(list: T[], exclude?: T): T {
  if (list.length <= 1) return list[0];
  let pick: T;
  do {
    pick = list[Math.floor(Math.random() * list.length)];
  } while (pick === exclude);
  return pick;
}

/** Pick an idle phrase, with 20% chance of time-based phrase */
export function pickIdlePhrase(exclude?: string): string {
  if (Math.random() < 0.2) {
    const period = getTimePeriod();
    const timePhrases = TIME_BASED_IDLE[period];
    if (timePhrases.length > 0) {
      return pickRandom(timePhrases, exclude);
    }
  }
  return pickRandom(IDLE_PHRASES, exclude);
}

/** Pick a thinking phrase, with 15% chance of time-based phrase */
export function pickThinkingPhrase(exclude?: string): string {
  if (Math.random() < 0.15) {
    const period = getTimePeriod();
    const timePhrases = TIME_BASED_THINKING[period];
    if (timePhrases.length > 0) {
      return pickRandom(timePhrases, exclude);
    }
  }
  return pickRandom(THINKING_PHRASES, exclude);
}
