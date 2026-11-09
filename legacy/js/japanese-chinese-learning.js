// 示例单词数据
const allWords = [
    {
        "index": 1,
        "cn": "大学生",
        "jp": "だいがくせい",
        "jp_kanji": "大学生",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 2,
        "cn": "学生",
        "jp": "がくせい",
        "jp_kanji": "学生",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 3,
        "cn": "先生",
        "jp": "せんせい",
        "jp_kanji": "先生",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 4,
        "cn": "老师",
        "jp": "きょうし",
        "jp_kanji": "教師",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 5,
        "cn": "大学",
        "jp": "だいがく",
        "jp_kanji": "大学",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 6,
        "cn": "是,好,知道了,对的,引起对方注意的喊声~",
        "jp": "はい",
        "jp_kanji": "はい",
        "part_of_speech": "感叹词",
        "lesson": 1
    },
    {
        "index": 7,
        "cn": "不,不是",
        "jp": "いいえ",
        "jp_kanji": "いいえ",
        "part_of_speech": "感叹词",
        "lesson": 1
    },
    {
        "index": 8,
        "cn": "不,不是（口语方式，随便说说可以不允许写入作文中）",
        "jp": "いや",
        "jp_kanji": "嫌",
        "part_of_speech": "感叹词",
        "lesson": 1
    },
    {
        "index": 9,
        "cn": "不知道，不明白",
        "jp": "わかりません",
        "jp_kanji": "分かりません",
        "part_of_speech": "动词",
        "lesson": 1
    },
    {
        "index": 10,
        "cn": "中国人",
        "jp": "ちゆうごくじん",
        "jp_kanji": "中国人",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 11,
        "cn": "日本人",
        "jp": "にほんじん",
        "jp_kanji": "日本人",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 12,
        "cn": "韩国人",
        "jp": "かんこくじん",
        "jp_kanji": "韓国人",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 13,
        "cn": "美国人(アメリカ人)",
        "jp": "アメリカじん",
        "jp_kanji": "アメリカ人",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 14,
        "cn": "法国人(フランス人)",
        "jp": "フランスじん",
        "jp_kanji": "フランス人",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 15,
        "cn": "先生,老师（广泛的尊称）",
        "jp": "せんせい",
        "jp_kanji": "先生",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 16,
        "cn": "老师(强调从事老师的职业身份)",
        "jp": "きょうし",
        "jp_kanji": "教師",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 17,
        "cn": "茶",
        "jp": "おちや",
        "jp_kanji": "お茶",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 18,
        "cn": "留学生",
        "jp": "りゆうがくせい",
        "jp_kanji": "留学生",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 19,
        "cn": "教授",
        "jp": "きょうじゅ",
        "jp_kanji": "教授",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 20,
        "cn": "职员(社員)",
        "jp": "しゃいん",
        "jp_kanji": "社員",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 21,
        "cn": "公司职员(会社員)",
        "jp": "かいしゃいん",
        "jp_kanji": "会社員",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 22,
        "cn": "店员(店員)",
        "jp": "てんいん",
        "jp_kanji": "店員",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 23,
        "cn": "进修生(研修生)",
        "jp": "けんしゆうせい",
        "jp_kanji": "研修生",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 24,
        "cn": "企业(企業)",
        "jp": "きぎょう",
        "jp_kanji": "企業",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 25,
        "cn": "(我)父亲",
        "jp": "ちち",
        "jp_kanji": "父",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 26,
        "cn": "科长(課長)",
        "jp": "かちょう",
        "jp_kanji": "課長",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 27,
        "cn": "总经理,社长(设镸)",
        "jp": "しゃちょう",
        "jp_kanji": "社長",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 28,
        "cn": "迎接(出迎え)",
        "jp": "でむかえ",
        "jp_kanji": "出迎え",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 29,
        "cn": "那个（あの人）",
        "jp": "あのひと",
        "jp_kanji": "あの人",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 30,
        "cn": "我(私)",
        "jp": "わたし",
        "jp_kanji": "私",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 31,
        "cn": "你",
        "jp": "あなた",
        "jp_kanji": "貴方",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 32,
        "cn": "表示轻微感谢,再见,友好招呼",
        "jp": "とうモ",
        "jp_kanji": "どうも",
        "part_of_speech": "感叹词",
        "lesson": 1
    },
    {
        "index": 33,
        "cn": "哎,哎呀表示感叹词",
        "jp": "あっ",
        "jp_kanji": "あっ",
        "part_of_speech": "感叹词",
        "lesson": 1
    },
    {
        "index": 34,
        "cn": "李-专有名词姓氏",
        "jp": "り",
        "jp_kanji": "李",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 35,
        "cn": "王-专有名词姓氏",
        "jp": "おう",
        "jp_kanji": "王",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 36,
        "cn": "张(張)-专有名词姓氏",
        "jp": "ちよお",
        "jp_kanji": "張",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 37,
        "cn": "森-专有名词姓氏",
        "jp": "もり",
        "jp_kanji": "森",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 38,
        "cn": "林-专有名词姓氏",
        "jp": "はやし",
        "jp_kanji": "林",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 39,
        "cn": "小野-专有名词姓氏",
        "jp": "おの",
        "jp_kanji": "小野",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 40,
        "cn": "吉田-专有名词姓氏",
        "jp": "よしだ",
        "jp_kanji": "吉田",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 41,
        "cn": "田中-专有名词姓氏",
        "jp": "たなか",
        "jp_kanji": "田中",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 42,
        "cn": "中村-专有名词姓氏",
        "jp": "なかむら",
        "jp_kanji": "中村",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 43,
        "cn": "太郎-专有名词姓氏",
        "jp": "たるう",
        "jp_kanji": "太郎",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 44,
        "cn": "金-专有名词姓氏",
        "jp": "キム",
        "jp_kanji": "金",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 45,
        "cn": "迪蓬-专有名词姓氏",
        "jp": "デュボン",
        "jp_kanji": "デュボン",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 46,
        "cn": "Smith史密斯-专有名词姓氏",
        "jp": "スミス",
        "jp_kanji": "スミス",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 47,
        "cn": "Jsonhnson约翰逊-专有名词姓氏",
        "jp": "ジョンソン",
        "jp_kanji": "ジョンソン",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 48,
        "cn": "中国-专有名词",
        "jp": "ちゆうごく",
        "jp_kanji": "中国",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 49,
        "cn": "东京大学(東京大学)-专有名词",
        "jp": "とうきょうだいがく",
        "jp_kanji": "東京大学",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 50,
        "cn": "北京大学-专有名词",
        "jp": "ペキンだいがく",
        "jp_kanji": "北京大学",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 51,
        "cn": "JC策划公司(JC企画)-专有名词",
        "jp": "ジインーシーきかく",
        "jp_kanji": "JC企画",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 52,
        "cn": "北京旅行社-专有名词",
        "jp": "ペキンりょこうしや",
        "jp_kanji": "北京旅行社",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 53,
        "cn": "日中商事-专有名词",
        "jp": "にっちゆうしょうじ",
        "jp_kanji": "日中商事",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 54,
        "cn": "你好",
        "jp": "こんにちは",
        "jp_kanji": "今日は",
        "part_of_speech": "问候语",
        "lesson": 1
    },
    {
        "index": 55,
        "cn": "对不起,请问",
        "jp": "すみません",
        "jp_kanji": "済みません",
        "part_of_speech": "寒暄语",
        "lesson": 1
    },
    {
        "index": 56,
        "cn": "请",
        "jp": "どうぞ",
        "jp_kanji": "どうぞ",
        "part_of_speech": "副词",
        "lesson": 1
    },
    {
        "index": 57,
        "cn": "请多关照",
        "jp": "よろしくあねがいします",
        "jp_kanji": "宜しくお願いします",
        "part_of_speech": "寒暄语",
        "lesson": 1
    },
    {
        "index": 58,
        "cn": "初期见面",
        "jp": "はじぬまして",
        "jp_kanji": "初めまして",
        "part_of_speech": "寒暄语",
        "lesson": 1
    },
    {
        "index": 59,
        "cn": "我才要(请您),我这边也是,",
        "jp": "こちらこそ",
        "jp_kanji": "こちらこそ",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 60,
        "cn": "是,是这样",
        "jp": "そうてす",
        "jp_kanji": "そうです",
        "part_of_speech": "副词",
        "lesson": 1
    },
    {
        "index": 61,
        "cn": "不是",
        "jp": "ちがいます",
        "jp_kanji": "違います",
        "part_of_speech": "动词",
        "lesson": 1
    },
    {
        "index": 62,
        "cn": "不知道",
        "jp": "わかりませい",
        "jp_kanji": "分かりません",
        "part_of_speech": "动词",
        "lesson": 1
    },
    {
        "index": 63,
        "cn": "非常,很",
        "jp": "どうも",
        "jp_kanji": "どうも",
        "part_of_speech": "副词",
        "lesson": 1
    },
    {
        "index": 64,
        "cn": "实在对不起",
        "jp": "どうもすみませい",
        "jp_kanji": "どうも済みません",
        "part_of_speech": "寒暄语",
        "lesson": 1
    },
    {
        "index": 65,
        "cn": "酱,君",
        "jp": "～ちん／～ちやん／～くん（君）",
        "jp_kanji": "～ちゃん／～くん",
        "part_of_speech": "后缀",
        "lesson": 1
    },
    {
        "index": 66,
        "cn": "八百屋,蔬菜水果店",
        "jp": "やおや",
        "jp_kanji": "八百屋",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 67,
        "cn": "米粥",
        "jp": "おかゆ",
        "jp_kanji": "お粥",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 68,
        "cn": "半夜",
        "jp": "よなか",
        "jp_kanji": "夜中",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 69,
        "cn": "休息",
        "jp": "やすみ",
        "jp_kanji": "休み",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 70,
        "cn": "请给我",
        "jp": "ください",
        "jp_kanji": "下さい",
        "part_of_speech": "动词",
        "lesson": 1
    },
    {
        "index": 71,
        "cn": "茶",
        "jp": "おちゃ",
        "jp_kanji": "お茶",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 72,
        "cn": "水",
        "jp": "みず",
        "jp_kanji": "水",
        "part_of_speech": "名词",
        "lesson": 1
    },
    {
        "index": 73,
        "cn": "我(私)-多数情况下用这个",
        "jp": "わたし",
        "jp_kanji": "私",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 74,
        "cn": "我-可爱女性一般用这个",
        "jp": "ぁたし",
        "jp_kanji": "あたし",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 75,
        "cn": "我-彪悍男性用这个",
        "jp": "おれ",
        "jp_kanji": "俺",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 76,
        "cn": "我-可爱男性用这个",
        "jp": "ぼく",
        "jp_kanji": "僕",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 77,
        "cn": "你-恋人或夫妻称呼",
        "jp": "あなた",
        "jp_kanji": "貴方",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 78,
        "cn": "你(君)-友好关系称呼你",
        "jp": "きみ",
        "jp_kanji": "君",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 79,
        "cn": "你-上下级雇佣关系",
        "jp": "まえ",
        "jp_kanji": "前",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 80,
        "cn": "他,那个人(あの人)",
        "jp": "あのひと",
        "jp_kanji": "あの人",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 81,
        "cn": "他(彼)",
        "jp": "かね",
        "jp_kanji": "彼",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 82,
        "cn": "她(彼女)",
        "jp": "かのじょ",
        "jp_kanji": "彼女",
        "part_of_speech": "代词",
        "lesson": 1
    },
    {
        "index": 83,
        "cn": "那位",
        "jp": "どなた",
        "jp_kanji": "誰",
        "part_of_speech": "代词",
        "lesson": 2
    },
    {
        "index": 84,
        "cn": "钥匙,锁",
        "jp": "かぎ",
        "jp_kanji": "鍵",
        "part_of_speech": "名词",
        "lesson": 2
    },
    {
        "index": 85,
        "cn": "车",
        "jp": "くるま",
        "jp_kanji": "車",
        "part_of_speech": "名词",
        "lesson": 2
    },
    {
        "index": 86,
        "cn": "谢谢",
        "jp": "ありがとうございます",
        "jp_kanji": "谢谢",
        "part_of_speech": "名词",
        "lesson": 2
    },
    {
        "jp_kanji": "彼女",
        "part_of_speech": "代词",
        "lesson": 2
    },
    {
        "index": 0,
        "cn": "",
        "jp": "",
        "jp_kanji": "",
        "part_of_speech": "",
        "lesson": 0
    }
];

// 存储单词错误次数的对象
let wordErrorCounts = {};

// 初始化本地存储中的错误计数
function initErrorCounts() {
    const storedCounts = localStorage.getItem('wordErrorCounts');
    if (storedCounts) {
        wordErrorCounts = JSON.parse(storedCounts);
    } else {
        // 初始化每个单词的错误计数为0
        allWords.forEach(word => {
            const key = word.cn + '-' + word.jp;
            wordErrorCounts[key] = 0;
        });
        saveErrorCounts();
    }
}

// 保存错误计数到本地存储
function saveErrorCounts() {
    localStorage.setItem('wordErrorCounts', JSON.stringify(wordErrorCounts));
}

// 获取单词的错误权重
function getWordWeight(word) {
    const key = word.cn + '-' + word.jp;
    // 基础权重为1，每错一次增加1的权重
    return 1 + (wordErrorCounts[key] || 0);
}

// 使用权重随机选择单词
function selectRandomWordsWithWeights(count, wordsList = allWords) {
    // 创建一个包含所有单词的数组副本
    const wordsCopy = [...wordsList];

    // 计算总权重
    let totalWeight = 0;
    wordsCopy.forEach(word => {
        totalWeight += getWordWeight(word);
    });

    const selectedWords = [];
    const selectedIndices = new Set();

    // 选择指定数量的单词
    while (selectedWords.length < count && selectedWords.length < wordsCopy.length) {
        // 生成一个0到总权重之间的随机数
        let randomWeight = Math.random() * totalWeight;

        // 找到对应的单词
        for (let i = 0; i < wordsCopy.length; i++) {
            if (selectedIndices.has(i)) continue;

            const weight = getWordWeight(wordsCopy[i]);
            randomWeight -= weight;

            if (randomWeight <= 0) {
                selectedWords.push(wordsCopy[i]);
                selectedIndices.add(i);
                // 从总权重中减去已选单词的权重
                totalWeight -= weight;
                break;
            }
        }
    }

    // 如果没有选够指定数量的单词，随机补充
    if (selectedWords.length < count) {
        // 打乱数组
        for (let i = 0; i < wordsCopy.length; i++) {
            const j = Math.floor(Math.random() * wordsCopy.length);
            [wordsCopy[i], wordsCopy[j]] = [wordsCopy[j], wordsCopy[i]];
        }

        // 补充单词
        for (let i = 0; i < wordsCopy.length && selectedWords.length < count; i++) {
            if (!selectedIndices.has(i)) {
                selectedWords.push(wordsCopy[i]);
                selectedIndices.add(i);
            }
        }
    }

    // 打乱选中的单词顺序
    return shuffleArray(selectedWords);
}

// 打乱数组顺序
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 增加单词的错误计数
function incrementErrorCount(word) {
    const key = word.cn + '-' + word.jp;
    wordErrorCounts[key] = (wordErrorCounts[key] || 0) + 1;
    saveErrorCounts();
}

// Vue应用
new Vue({
    el: '#app',
    data: {
        mode: 'cn2jp', // 默认模式：看中文写日语
        currentLesson: 0, // 当前课时(0:全部,1:第一课,2:第二课)
        kanaDialogVisible: false, // 控制50音图对话框显示
        kanaColumns: ['a', 'i', 'u', 'e', 'o'], // 50音图列名
        hiraganaChart: [ // 平假名50音图
            { a: { hiragana: 'あ', katakana: 'ア', romaji: 'a' }, i: { hiragana: 'い', katakana: 'イ', romaji: 'i' }, u: { hiragana: 'う', katakana: 'ウ', romaji: 'u' }, e: { hiragana: 'え', katakana: 'エ', romaji: 'e' }, o: { hiragana: 'お', katakana: 'オ', romaji: 'o' } },
            { a: { hiragana: 'か', katakana: 'カ', romaji: 'ka' }, i: { hiragana: 'き', katakana: 'キ', romaji: 'ki' }, u: { hiragana: 'く', katakana: 'ク', romaji: 'ku' }, e: { hiragana: 'け', katakana: 'ケ', romaji: 'ke' }, o: { hiragana: 'こ', katakana: 'コ', romaji: 'ko' } },
            { a: { hiragana: 'さ', katakana: 'サ', romaji: 'sa' }, i: { hiragana: 'し', katakana: 'シ', romaji: 'shi' }, u: { hiragana: 'す', katakana: 'ス', romaji: 'su' }, e: { hiragana: 'せ', katakana: 'セ', romaji: 'se' }, o: { hiragana: 'そ', katakana: 'ソ', romaji: 'so' } },
            { a: { hiragana: 'た', katakana: 'タ', romaji: 'ta' }, i: { hiragana: 'ち', katakana: 'チ', romaji: 'chi' }, u: { hiragana: 'つ', katakana: 'ツ', romaji: 'tsu' }, e: { hiragana: 'て', katakana: 'テ', romaji: 'te' }, o: { hiragana: 'と', katakana: 'ト', romaji: 'to' } },
            { a: { hiragana: 'な', katakana: 'ナ', romaji: 'na' }, i: { hiragana: 'に', katakana: 'ニ', romaji: 'ni' }, u: { hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu' }, e: { hiragana: 'ね', katakana: 'ネ', romaji: 'ne' }, o: { hiragana: 'の', katakana: 'ノ', romaji: 'no' } },
            { a: { hiragana: 'は', katakana: 'ハ', romaji: 'ha' }, i: { hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi' }, u: { hiragana: 'ふ', katakana: 'フ', romaji: 'fu' }, e: { hiragana: 'へ', katakana: 'ヘ', romaji: 'he' }, o: { hiragana: 'ほ', katakana: 'ホ', romaji: 'ho' } },
            { a: { hiragana: 'ま', katakana: 'マ', romaji: 'ma' }, i: { hiragana: 'み', katakana: 'ミ', romaji: 'mi' }, u: { hiragana: 'む', katakana: 'ム', romaji: 'mu' }, e: { hiragana: 'め', katakana: 'メ', romaji: 'me' }, o: { hiragana: 'も', katakana: 'モ', romaji: 'mo' } },
            { a: { hiragana: 'や', katakana: 'ヤ', romaji: 'ya' }, i: null, u: { hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu' }, e: null, o: { hiragana: 'よ', katakana: 'ヨ', romaji: 'yo' } },
            { a: { hiragana: 'ら', katakana: 'ラ', romaji: 'ra' }, i: { hiragana: 'り', katakana: 'リ', romaji: 'ri' }, u: { hiragana: 'る', katakana: 'ル', romaji: 'ru' }, e: { hiragana: 'れ', katakana: 'レ', romaji: 're' }, o: { hiragana: 'ろ', katakana: 'ロ', romaji: 'ro' } },
            { a: { hiragana: 'わ', katakana: 'ワ', romaji: 'wa' }, i: null, u: null, e: null, o: { hiragana: 'を', katakana: 'ヲ', romaji: 'wo' } },
            { a: { hiragana: 'ん', katakana: 'ン', romaji: 'n' }, i: null, u: null, e: null, o: null }
        ],
        youonChart: [ // 拗音
            { a: { hiragana: 'きゃ', katakana: 'キャ', romaji: 'kya' }, i: { hiragana: 'きゅ', katakana: 'キュ', romaji: 'kyu' }, u: null, e: null, o: { hiragana: 'きょ', katakana: 'キョ', romaji: 'kyo' } },
            { a: { hiragana: 'しゃ', katakana: 'シャ', romaji: 'sha' }, i: { hiragana: 'しゅ', katakana: 'シュ', romaji: 'shu' }, u: null, e: null, o: { hiragana: 'しょ', katakana: 'ショ', romaji: 'sho' } },
            { a: { hiragana: 'ちゃ', katakana: 'チャ', romaji: 'cha' }, i: { hiragana: 'ちゅ', katakana: 'チュ', romaji: 'chu' }, u: null, e: null, o: { hiragana: 'ちょ', katakana: 'チョ', romaji: 'cho' } },
            { a: { hiragana: 'にゃ', katakana: 'ニャ', romaji: 'nya' }, i: { hiragana: 'にゅ', katakana: 'ニュ', romaji: 'nyu' }, u: null, e: null, o: { hiragana: 'にょ', katakana: 'ニョ', romaji: 'nyo' } },
            { a: { hiragana: 'ひゃ', katakana: 'ヒャ', romaji: 'hya' }, i: { hiragana: 'ひゅ', katakana: 'ヒュ', romaji: 'hyu' }, u: null, e: null, o: { hiragana: 'ひょ', katakana: 'ヒョ', romaji: 'hyo' } },
            { a: { hiragana: 'みゃ', katakana: 'ミャ', romaji: 'mya' }, i: { hiragana: 'みゅ', katakana: 'ミュ', romaji: 'myu' }, u: null, e: null, o: { hiragana: 'みょ', katakana: 'ミョ', romaji: 'myo' } },
            { a: { hiragana: 'りゃ', katakana: 'リャ', romaji: 'rya' }, i: { hiragana: 'りゅ', katakana: 'リュ', romaji: 'ryu' }, u: null, e: null, o: { hiragana: 'りょ', katakana: 'リョ', romaji: 'ryo' } }
        ],
        dakuonChart: [ // 浊音/半浊音
            { a: { hiragana: 'が', katakana: 'ガ', romaji: 'ga' }, i: { hiragana: 'ぎ', katakana: 'ギ', romaji: 'gi' }, u: { hiragana: 'ぐ', katakana: 'グ', romaji: 'gu' }, e: { hiragana: 'げ', katakana: 'ゲ', romaji: 'ge' }, o: { hiragana: 'ご', katakana: 'ゴ', romaji: 'go' } },
            { a: { hiragana: 'ざ', katakana: 'ザ', romaji: 'za' }, i: { hiragana: 'じ', katakana: 'ジ', romaji: 'ji' }, u: { hiragana: 'ず', katakana: 'ズ', romaji: 'zu' }, e: { hiragana: 'ぜ', katakana: 'ゼ', romaji: 'ze' }, o: { hiragana: 'ぞ', katakana: 'ゾ', romaji: 'zo' } },
            { a: { hiragana: 'だ', katakana: 'ダ', romaji: 'da' }, i: { hiragana: 'ぢ', katakana: 'ヂ', romaji: 'ji' }, u: { hiragana: 'づ', katakana: 'ヅ', romaji: 'zu' }, e: { hiragana: 'で', katakana: 'デ', romaji: 'de' }, o: { hiragana: 'ど', katakana: 'ド', romaji: 'do' } },
            { a: { hiragana: 'ば', katakana: 'バ', romaji: 'ba' }, i: { hiragana: 'び', katakana: 'ビ', romaji: 'bi' }, u: { hiragana: 'ぶ', katakana: 'ブ', romaji: 'bu' }, e: { hiragana: 'べ', katakana: 'ベ', romaji: 'be' }, o: { hiragana: 'ぼ', katakana: 'ボ', romaji: 'bo' } },
            { a: { hiragana: 'ぱ', katakana: 'パ', romaji: 'pa' }, i: { hiragana: 'ぴ', katakana: 'ピ', romaji: 'pi' }, u: { hiragana: 'ぷ', katakana: 'プ', romaji: 'pu' }, e: { hiragana: 'ぺ', katakana: 'ペ', romaji: 'pe' }, o: { hiragana: 'ぽ', katakana: 'ポ', romaji: 'po' } }
        ],
        currentWords: [], // 当前测试的单词列表
        userAnswers: [], // 用户输入的所有答案
        answerResults: [], // 每个答案的正确性
        answersChecked: false, // 是否已检查答案
        results: [], // 测试结果
        showResults: false, // 是否显示结果页面
        correctCount: 0 // 正确答案计数
    },
    computed: {
        // 将单词列表转换为成对的格式，每行显示两个问题
        wordPairs() {
            const pairs = [];
            for (let i = 0; i < this.currentWords.length; i += 2) {
                const pair = {
                    word1: this.currentWords[i],
                    index1: i
                };

                // 如果还有下一个单词，添加到同一行
                if (i + 1 < this.currentWords.length) {
                    pair.word2 = this.currentWords[i + 1];
                    pair.index2 = i + 1;
                }

                pairs.push(pair);
            }
            return pairs;
        }
    },
    methods: {
        // 初始化测试
        initTest() {
            // 初始化错误计数
            initErrorCounts();

            // 根据当前课时筛选单词
            const filteredWords = this.currentLesson === 0 ?
                allWords :
                allWords.filter(word => word.lesson === this.currentLesson);

            // console.log('筛选后的单词:', filteredWords);
            // console.log('当前课时:', this.currentLesson);

            // 随机选择单词
            this.currentWords = selectRandomWordsWithWeights(16, filteredWords);
            this.userAnswers = new Array(this.currentWords.length).fill('');
            this.answerResults = new Array(this.currentWords.length).fill(false);
            this.answersChecked = false;
            this.results = [];
            this.showResults = false;
            this.correctCount = 0;
        },

        // 重置测试（切换模式时调用）
        resetTest() {
            this.initTest();
        },

        // 检查所有答案
        checkAllAnswers() {
            if (this.answersChecked) return;

            this.correctCount = 0;
            this.results = [];

            // 检查每个答案
            for (let i = 0; i < this.currentWords.length; i++) {
                const word = this.currentWords[i];
                const userAnswer = this.userAnswers[i].trim();
                const expectedAnswer = this.mode === 'cn2jp' ? word.jp : word.cn;
                const isCorrect = userAnswer === expectedAnswer;

                // 更新结果
                this.answerResults[i] = isCorrect;

                // 记录结果
                this.results.push({
                    word: word,
                    userAnswer: userAnswer || '(未填写)',
                    isCorrect: isCorrect
                });

                // 更新计数
                if (isCorrect) {
                    this.correctCount++;
                } else {
                    incrementErrorCount(word);
                }
            }

            // 标记为已检查
            this.answersChecked = true;
        },

        // 开始新测试
        startNewTest() {
            this.initTest();
        },

        // 显示50音图
        showKanaChart() {
            this.loadVoices().then(() => {
                this.kanaDialogVisible = true;
            });
        },

        // 朗读假名
        speakKana(kana) {
            if (!kana) return;

            const utter = new SpeechSynthesisUtterance(kana);
            utter.lang = "ja-JP";

            // 使用选定的语音或默认日语语音
            if (this.selectedVoice) {
                utter.voice = this.selectedVoice;
            } else {
                const japaneseVoices = this.availableVoices.filter(v => v.lang === "ja-JP");
                if (japaneseVoices.length > 0) {
                    utter.voice = japaneseVoices[0];
                }
            }

            window.speechSynthesis.speak(utter);
        }
    },
    watch: {
        currentLesson(newVal, oldVal) {
            if (newVal !== oldVal) {
                this.resetTest();
            }
        }
    },
    mounted() {
        // 初始化测试
        this.initTest();
    }
});