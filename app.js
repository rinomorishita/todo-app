import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFIM9V9C09vQNsqUOf5yw4RqOmUJH5OSg",
  authDomain: "todo-app-25032.firebaseapp.com",
  projectId: "todo-app-25032",
  storageBucket: "todo-app-25032.firebasestorage.app",
  messagingSenderId: "992707449756",
  appId: "1:992707449756:web:e34cace69d61d618d0ae59",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const STORAGE_KEY = "todo-app-state-v3";
const LEGACY_STORAGE_KEY_V2 = "todo-app-state-v2";
const LEGACY_STORAGE_KEY_V1 = "todo-app-items";

const GROUPS = [
  {
    key: "todo",
    label: "To do",
    children: [
      { key: "dailytask", label: "Daily" },
      { key: "work", label: "Work" },
      { key: "shopping", label: "Shopping" },
    ],
  },
  {
    key: "diary",
    label: "Diary",
    children: null,
  },
  {
    key: "wishlist",
    label: "Wish List",
    children: [
      { key: "travel", label: "Travel/Leisure" },
      { key: "book", label: "Book" },
      { key: "movie", label: "Movie" },
      { key: "music", label: "Music" },
    ],
  },
  {
    key: "english",
    label: "English",
    children: null,
  },
];

// Categories scanned for the Today dashboard (Today's task / Others).
// Diary and Wish List are intentionally excluded — they only show in their
// own tabs, never on the Today dashboard.
const TODO_KEYS = ["dailytask", "work", "shopping"];

const CATEGORY_LABELS = {};
const CATEGORY_TO_GROUP = {};
for (const g of GROUPS) {
  if (g.children) for (const c of g.children) {
    CATEGORY_LABELS[c.key] = c.label;
    CATEGORY_TO_GROUP[c.key] = g.key;
  }
}

const ENGLISH_BANK = [
  ["be going to do", "I'm going to visit my parents this weekend.", "今週末、両親を訪ねるつもりです。"],
  ["go to sleep", "I usually go to sleep around midnight.", "私はたいてい深夜0時ごろに寝ます。"],
  ["have to do", "I have to finish this report by tomorrow.", "明日までにこの報告書を仕上げなければなりません。"],
  ["because of", "The flight was delayed because of the storm.", "嵐のせいで飛行機が遅れました。"],
  ["in front of", "There is a big tree in front of my house.", "私の家の前に大きな木があります。"],
  ["more and more", "More and more people are working from home.", "在宅勤務をする人がますます増えています。"],
  ["do the dishes", "Can you do the dishes after dinner?", "夕食のあと、お皿を洗ってくれますか？"],
  ["from a distance", "I watched the parade from a distance.", "私は遠くからパレードを見ました。"],
  ["rather than", "I'd rather walk than take the bus.", "バスに乗るよりむしろ歩きたいです。"],
  ["in depth", "We discussed the plan in depth.", "私たちはその計画について詳しく話し合いました。"],
  ["one day", "One day, I want to travel around the world.", "いつか世界中を旅したいです。"],
  ["do well", "She did well on her English exam.", "彼女は英語の試験でよい成績を取りました。"],
  ["get in shape", "I've been exercising to get in shape.", "体を鍛えるために運動しています。"],
  ["the other day", "I saw an old friend the other day.", "先日、旧友に会いました。"],
  ["make a noise", "Please don't make a noise in the library.", "図書館では音を立てないでください。"],
  ["in the middle of", "I was in the middle of a meeting when you called.", "あなたが電話をくれたとき、私は会議の最中でした。"],
  ["and so on", "We need pens, notebooks, and so on.", "ペンやノートなどが必要です。"],
  ["each other", "They have known each other since childhood.", "彼らは子どもの頃からお互いを知っています。"],
  ["fall asleep", "I fell asleep during the movie.", "私は映画の途中で眠ってしまいました。"],
  ["for sale", "This house has been for sale for months.", "この家は何か月も売りに出されています。"],
  ["on foot", "It's faster to get there on foot than by car.", "そこへは車より徒歩の方が早く着きます。"],
  ["at first", "At first, I didn't understand the instructions.", "最初は説明が理解できませんでした。"],
  ["together with", "I sent the invoice together with the receipt.", "領収書と一緒に請求書を送りました。"],
  ["these days", "These days, more people shop online.", "最近はオンラインで買い物をする人が増えています。"],
  ["ever since", "She has lived in Tokyo ever since she graduated.", "彼女は卒業して以来ずっと東京に住んでいます。"],
  ["such as", "I like fruits such as apples and oranges.", "リンゴやオレンジのような果物が好きです。"],
  ["so ~ that", "It was so cold that we stayed indoors.", "とても寒かったので私たちは屋内にいました。"],
  ["up and down", "The elevator kept going up and down.", "エレベーターは上下し続けていました。"],
  ["a couple of", "I'll be back in a couple of minutes.", "数分で戻ります。"],
  ["every other", "I go to the gym every other day.", "私は一日おきにジムに通っています。"],
  ["at all times", "Please wear your ID badge at all times.", "常にIDバッジを着用してください。"],
  ["at the same time", "You can't work and study at the same time.", "仕事と勉強を同時にすることはできません。"],
  ["by heart", "I learned the poem by heart.", "私はその詩を暗記しました。"],
  ["on board", "Welcome on board! Please take your seat.", "ご搭乗ありがとうございます。お席にお着きください。"],
  ["even if", "I'll go for a run even if it rains.", "たとえ雨が降っても私は走りに行きます。"],
  ["at least", "It will take at least two hours to finish.", "終えるのに少なくとも2時間はかかるでしょう。"],
  ["with pleasure", "I'll help you with pleasure.", "喜んでお手伝いします。"],
  ["in order to do", "I woke up early in order to catch the train.", "電車に間に合うように早起きしました。"],
  ["lose your way", "We lost our way in the old town.", "私たちは旧市街で道に迷いました。"],
  ["day after day", "He practiced the piano day after day.", "彼は来る日も来る日もピアノを練習しました。"],
  ["as usual", "The train was crowded as usual.", "電車はいつものように混んでいました。"],
  ["instead of", "Let's take a taxi instead of walking.", "歩く代わりにタクシーに乗りましょう。"],
  ["in force", "The new law will be in force from next month.", "新しい法律は来月から施行されます。"],
  ["on sale", "These shoes are on sale this week.", "この靴は今週セール中です。"],
  ["in time", "We arrived in time for the meeting.", "私たちは会議に間に合いました。"],
  ["by accident", "I found this recipe by accident.", "偶然このレシピを見つけました。"],
  ["at risk", "Your data may be at risk without a backup.", "バックアップがないとデータが危険にさらされるかもしれません。"],
  ["time after time", "He made the same mistake time after time.", "彼は何度も同じ間違いをしました。"],
  ["had better do", "You had better see a doctor soon.", "すぐに医者に診てもらった方がいいです。"],
  ["once upon a time", "Once upon a time, there lived a king.", "昔々、ある王様がいました。"],
  ["one by one", "The teacher called the students one by one.", "先生は生徒を一人ずつ呼びました。"],
  ["make friends with", "It's easy for her to make friends with anyone.", "彼女は誰とでも簡単に友達になれます。"],
  ["as well", "I ordered coffee and a sandwich as well.", "コーヒーとサンドイッチも注文しました。"],
  ["not only ~ but (also)", "She is not only smart but also kind.", "彼女は頭がいいだけでなく親切でもあります。"],
  ["no longer", "He is no longer working at that company.", "彼はもうその会社では働いていません。"],
  ["for a while", "Let's rest here for a while.", "しばらくここで休みましょう。"],
  ["right now", "I'm busy right now, can I call you back?", "今忙しいので、後で電話してもいいですか？"],
  ["side by side", "We walked side by side along the river.", "私たちは川沿いを並んで歩きました。"],
  ["get lost", "We got lost on our way to the hotel.", "私たちはホテルへ行く途中で道に迷いました。"],
  ["face to face", "It's better to talk face to face about this.", "この件は直接会って話した方がいいです。"],
  ["on schedule", "The construction is on schedule.", "工事は予定通り進んでいます。"],
  ["all the time", "She listens to music all the time.", "彼女はいつも音楽を聴いています。"],
  ["thanks to", "We finished early thanks to your help.", "あなたの助けのおかげで早く終わりました。"],
  ["one another", "The team members trust one another.", "チームのメンバーはお互いを信頼しています。"],
  ["after all", "After all, honesty is the best policy.", "結局のところ、正直が一番です。"],
  ["by mistake", "I sent the email to the wrong person by mistake.", "間違えて違う人にメールを送ってしまいました。"],
  ["by the way", "By the way, did you finish the report?", "ところで、レポートは終わりましたか？"],
  ["at the moment", "I'm not available at the moment.", "今は都合がつきません。"],
  ["one after another", "Customers came in one after another.", "お客さんが次々に入ってきました。"],
  ["in fact", "In fact, I've never been abroad.", "実は、私は海外に行ったことがありません。"],
  ["right away", "Please call me right away if anything happens.", "何かあったらすぐに電話してください。"],
  ["take part in", "I'd like to take part in the volunteer program.", "そのボランティアプログラムに参加したいです。"],
  ["used to do", "I used to play soccer when I was a kid.", "子どもの頃はサッカーをしていました。"],
  ["take care of", "Can you take care of my cat this weekend?", "今週末、私の猫の世話をしてくれますか？"],
  ["fall in love with", "He fell in love with the city at first sight.", "彼はその街に一目惚れしました。"],
  ["manage to do", "We managed to catch the last train.", "私たちはなんとか終電に間に合いました。"],
  ["just around the corner", "Summer vacation is just around the corner.", "夏休みはもうすぐそこです。"],
  ["as well as", "She speaks French as well as English.", "彼女は英語だけでなくフランス語も話します。"],
  ["as if", "He talks as if he knew everything.", "彼はまるで何でも知っているかのように話します。"],
  ["in spite of", "We went hiking in spite of the rain.", "雨にもかかわらず私たちはハイキングに行きました。"],
  ["make up your mind", "Take your time to make up your mind.", "ゆっくり決心してください。"],
  ["by yourself", "Did you build this website by yourself?", "このウェブサイトを自分一人で作ったのですか？"],
  ["first of all", "First of all, let's introduce ourselves.", "まず最初に自己紹介をしましょう。"],
  ["keep in touch with", "Let's keep in touch with each other.", "お互い連絡を取り合いましょう。"],
  ["from all sides", "The team faced criticism from all sides.", "そのチームはあらゆる方面から批判を受けました。"],
  ["neither ~ nor ~", "He drinks neither coffee nor tea.", "彼はコーヒーも紅茶も飲みません。"],
  ["out loud", "Please read the sentence out loud.", "その文を声に出して読んでください。"],
  ["in the world", "She is the kindest person in the world.", "彼女は世界で一番優しい人です。"],
  ["in a hurry", "I'm in a hurry, so let's talk later.", "急いでいるので、また後で話しましょう。"],
  ["out of breath", "He was out of breath after running.", "彼は走った後、息を切らしていました。"],
  ["at times", "At times, I feel like giving up.", "時々、あきらめたくなることがあります。"],
  ["so far", "So far, everything has gone well.", "今のところ、すべて順調に進んでいます。"],
  ["in someone's absence", "I handled the calls in her absence.", "彼女の不在中、私が電話対応をしました。"],
  ["according to", "According to the weather forecast, it will rain tomorrow.", "天気予報によると、明日は雨が降るそうです。"],
  ["on time", "Please make sure to arrive on time.", "時間通りに到着するようにしてください。"],
  ["keep in mind", "Please keep in mind that the deadline is Friday.", "締め切りは金曜日だということを覚えておいてください。"],
  ["in part", "The delay was in part due to bad weather.", "その遅れは一部悪天候によるものでした。"],
  ["at last", "At last, the project is complete.", "ついに、プロジェクトが完了しました。"],
  ["enjoy yourself", "Have a great trip, and enjoy yourself!", "楽しい旅行を、思い切り楽しんできてね！"],
  ["next to", "The bank is next to the post office.", "銀行は郵便局の隣にあります。"],
  ["all the way", "He walked all the way to the station.", "彼は駅までずっと歩いて行きました。"],
  ["day by day", "Her English is improving day by day.", "彼女の英語は日に日に上達しています。"],
  ["at a time", "Please take one step at a time.", "一度に一段ずつ進んでください。"],
  ["far from", "The result was far from perfect.", "結果は完璧にはほど遠いものでした。"],
  ["to some extent", "I agree with you to some extent.", "ある程度まではあなたに同意します。"],
  ["at once", "Please reply to this email at once.", "このメールにすぐに返信してください。"],
  ["in due course", "You will receive the results in due course.", "結果は追ってお知らせします。"],
  ["scores of", "Scores of people gathered outside the stadium.", "何十人もの人がスタジアムの外に集まりました。"],
  ["at a loss", "I was at a loss for words.", "私は言葉を失いました。"],
  ["feel like doing", "I feel like eating something sweet.", "何か甘いものが食べたい気分です。"],
  ["as for", "As for me, I prefer tea to coffee.", "私に関して言えば、コーヒーより紅茶の方が好きです。"],
  ["out of order", "The vending machine is out of order.", "その自動販売機は故障中です。"],
  ["sooner or later", "Sooner or later, you'll get used to it.", "遅かれ早かれ、あなたはそれに慣れるでしょう。"],
  ["on and on", "He talked on and on about his trip.", "彼は自分の旅行についてずっと話し続けました。"],
  ["in secret", "They met in secret to discuss the plan.", "彼らはその計画について話し合うため密かに会いました。"],
  ["make use of", "You should make use of this opportunity.", "この機会を活用すべきです。"],
  ["in the end", "In the end, we decided to cancel the trip.", "結局、私たちは旅行を中止することにしました。"],
  ["little by little", "Little by little, she gained confidence.", "少しずつ、彼女は自信をつけていきました。"],
  ["by chance", "I met my old teacher by chance.", "偶然、昔の先生に会いました。"],
  ["for nothing", "All our effort was for nothing.", "私たちの努力はすべて無駄になりました。"],
  ["in place of", "Please use this form in place of the old one.", "古いものの代わりにこの用紙を使ってください。"],
  ["in detail", "Let me explain the plan in detail.", "その計画について詳しく説明させてください。"],
  ["at best", "At best, we can finish half the work today.", "よくても今日は仕事の半分しか終わりません。"],
  ["by way of", "We traveled to Paris by way of London.", "私たちはロンドン経由でパリへ行きました。"],
  ["make sense", "Your explanation doesn't make sense to me.", "あなたの説明は私には理解できません。"],
  ["on demand", "This service is available on demand.", "このサービスは要求に応じて利用できます。"],
  ["on duty", "The nurse is on duty tonight.", "その看護師は今夜勤務中です。"],
  ["along with", "She sent flowers along with a card.", "彼女はカードと一緒に花を送りました。"],
  ["cannot help doing", "I couldn't help laughing at the joke.", "その冗談に笑わずにはいられませんでした。"],
  ["be about to do", "The movie is about to start.", "映画がまさに始まろうとしています。"],
  ["for sure", "I don't know for sure if he's coming.", "彼が来るかどうか確かなことはわかりません。"],
  ["to and fro", "The boat rocked to and fro on the waves.", "ボートは波の上を行ったり来たり揺れました。"],
  ["would rather", "I would rather stay home tonight.", "今夜はむしろ家にいたいです。"],
  ["as it is", "Leave the room as it is.", "部屋はそのままにしておいてください。"],
  ["without fail", "Please submit the form by Friday without fail.", "必ず金曜日までに用紙を提出してください。"],
  ["dozens of", "Dozens of emails arrived while I was on vacation.", "休暇中に何十通ものメールが届きました。"],
  ["upside down", "You're holding the map upside down.", "地図を逆さまに持っていますよ。"],
  ["from now on", "From now on, I'll save more money.", "これからは、もっとお金を貯めます。"],
  ["in itself", "The task is not difficult in itself.", "その作業自体は難しくありません。"],
  ["make sure", "Make sure you lock the door before leaving.", "出かける前にドアの鍵をかけたか確認してください。"],
  ["later on", "I'll explain the details later on.", "詳細については後で説明します。"],
  ["to tell the truth", "To tell the truth, I don't like the plan.", "実を言うと、私はその計画が好きではありません。"],
  ["as long as", "You can stay here as long as you like.", "好きなだけここにいていいですよ。"],
  ["close at hand", "Help is always close at hand.", "助けはいつもすぐ近くにあります。"],
  ["for long", "This weather won't last for long.", "この天気は長くは続かないでしょう。"],
  ["go into detail", "I don't want to go into detail right now.", "今は詳しく話したくありません。"],
  ["if only", "If only I had studied harder.", "もっと一生懸命勉強していればよかったのに。"],
  ["under control", "Don't worry, everything is under control.", "心配しないで、すべて制御下にありますから。"],
  ["go wrong", "Something went wrong with the printer.", "プリンターに何か問題が起きました。"],
  ["in advance", "Please book your tickets in advance.", "チケットは事前に予約してください。"],
  ["in particular", "Is there anything in particular you'd like to eat?", "何か特に食べたいものはありますか？"],
  ["on purpose", "I don't think he broke it on purpose.", "彼がわざとそれを壊したとは思いません。"],
  ["come true", "Her dream finally came true.", "彼女の夢がついに叶いました。"],
  ["aside from", "Aside from the price, the product is great.", "値段はさておき、その製品は素晴らしいです。"],
  ["make fun of", "It's not nice to make fun of others.", "他人をからかうのはよくないことです。"],
  ["(every) once in a while", "I go fishing once in a while.", "私はたまに釣りに行きます。"],
  ["take place", "The wedding will take place next spring.", "結婚式は来春行われます。"],
  ["have no idea", "I have no idea what he's talking about.", "彼が何を言っているのか全くわかりません。"],
  ["other than", "I have no plans other than resting this weekend.", "今週末は休む以外の予定はありません。"],
  ["at worst", "At worst, we'll have to postpone the event.", "最悪の場合、イベントを延期しなければなりません。"],
  ["by nature", "She is curious by nature.", "彼女は生まれつき好奇心が強いです。"],
  ["take your time", "There's no rush, take your time.", "急がなくていいので、ゆっくりどうぞ。"],
  ["be sure to do", "Be sure to bring your passport.", "必ずパスポートを持ってきてください。"],
  ["happen to do", "I happened to see her at the station.", "私は偶然、駅で彼女を見かけました。"],
  ["for life", "They became friends for life.", "彼らは生涯の友になりました。"],
  ["(just) in case", "Take an umbrella just in case.", "念のため傘を持って行ってください。"],
  ["before long", "Before long, the sun began to set.", "まもなく、太陽が沈み始めました。"],
  ["get in touch with", "I'll get in touch with you next week.", "来週あなたに連絡します。"],
  ["feel free to do", "Feel free to ask me any questions.", "何か質問があればお気軽にどうぞ。"],
  ["not necessarily", "Expensive products are not necessarily better.", "高い製品が必ずしも良いとは限りません。"],
  ["apart from", "Apart from the noise, the hotel was nice.", "騒音を除けば、そのホテルは良かったです。"],
  ["in a sense", "In a sense, he was right about the risk.", "ある意味で、彼はそのリスクについて正しかったです。"],
  ["in addition", "In addition, we offer free shipping.", "さらに、送料無料でご提供しています。"],
  ["now that", "Now that you're here, let's start the meeting.", "あなたが来たので、会議を始めましょう。"],
  ["feel your way", "I had to feel my way in the dark room.", "暗い部屋の中で手探りで進まなければなりませんでした。"],
  ["at first sight", "It was love at first sight.", "それは一目惚れでした。"],
  ["behind someone's back", "Don't talk about her behind her back.", "彼女がいないところで悪口を言わないでください。"],
  ["for someone's part", "For my part, I have no objection.", "私としては、異存はありません。"],
  ["in order", "Please put the documents in order.", "書類を順番に並べてください。"],
  ["in the distance", "We could see the mountains in the distance.", "遠くに山々が見えました。"],
  ["on fire", "The kitchen was on fire when the firefighters arrived.", "消防士が到着したとき、台所は火事になっていました。"],
  ["above all", "Above all, stay calm during the exam.", "何よりも、試験中は落ち着いてください。"],
  ["up to", "It's up to you to decide.", "決めるのはあなた次第です。"],
  ["(It is) no wonder (that)", "No wonder you're tired, you worked all night.", "疲れているのも当然です、一晩中働いたのですから。"],
  ["in the face of", "She stayed calm in the face of danger.", "彼女は危険を前にしても冷静でいました。"],
  ["all of a sudden", "All of a sudden, the lights went out.", "突然、明かりが消えました。"],
  ["anything but", "The test was anything but easy.", "そのテストは決して簡単ではありませんでした。"],
  ["in other words", "In other words, we need more time.", "言い換えれば、私たちにはもっと時間が必要です。"],
  ["with ease", "She solved the problem with ease.", "彼女はその問題を難なく解決しました。"],
  ["as follows", "The schedule is as follows.", "スケジュールは以下の通りです。"],
  ["behave yourself", "Please behave yourself at the party.", "パーティーではきちんと振る舞ってください。"],
  ["do someone good", "A short walk will do you good.", "少し歩くとあなたのためになりますよ。"],
  ["make ends meet", "It's hard to make ends meet these days.", "最近は家計をやりくりするのが大変です。"],
  ["as it were", "He is, as it were, a walking dictionary.", "彼はいわば歩く辞書です。"],
  ["What if", "What if it rains on the day of the picnic?", "もしピクニックの日に雨が降ったらどうしますか？"],
  ["be acquainted with", "I'm not well acquainted with this area.", "私はこの地域にあまり詳しくありません。"],
  ["for the most part", "For the most part, the trip went smoothly.", "おおむね、旅行は順調に進みました。"],
  ["no less than", "No less than a hundred people attended.", "100人もの人が出席しました。"],
  ["owing to", "The game was canceled owing to heavy rain.", "その試合は大雨のため中止になりました。"],
  ["on earth", "What on earth are you doing here?", "一体全体ここで何をしているのですか？"],
  ["quite a few", "Quite a few students missed the class.", "かなり多くの学生が授業を欠席しました。"],
  ["to begin with", "To begin with, let's review last week's data.", "まず最初に、先週のデータを見直しましょう。"],
  ["let go of", "It's time to let go of old habits.", "古い習慣を手放す時です。"],
  ["at most", "The meeting will last an hour at most.", "会議はどんなに長くても1時間で終わります。"],
  ["in a word", "In a word, the plan failed.", "一言で言えば、その計画は失敗しました。"],
  ["in any case", "In any case, please let me know your decision.", "いずれにせよ、あなたの決定を教えてください。"],
  ["find your way", "I found my way to the hotel using a map.", "地図を使ってホテルへの道を見つけました。"],
  ["in the air", "There was excitement in the air before the concert.", "コンサート前は興奮した空気が漂っていました。"],
  ["kill time", "We played cards to kill time at the airport.", "空港で時間つぶしにトランプをしました。"],
  ["on your own", "You can finish this task on your own.", "この作業は自分一人でも終えられます。"],
  ["at random", "The winners were chosen at random.", "当選者は無作為に選ばれました。"],
  ["by all means", "By all means, come and join us for dinner.", "ぜひ夕食に参加しに来てください。"],
  ["generally speaking", "Generally speaking, prices are higher in the city.", "一般的に言って、都市部の方が物価が高いです。"],
  ["come to an end", "The long meeting finally came to an end.", "長い会議がついに終わりました。"],
  ["nothing but", "He eats nothing but vegetables for lunch.", "彼は昼食に野菜しか食べません。"],
  ["speak ill of", "She never speaks ill of anyone.", "彼女は決して誰の悪口も言いません。"],
  ["be in control of", "She is in control of the whole project.", "彼女はプロジェクト全体を管理しています。"],
  ["be of use", "I hope this information will be of use to you.", "この情報があなたのお役に立てば幸いです。"],
  ["beyond doubt", "His talent is beyond doubt.", "彼の才能は疑いようがありません。"],
  ["come to mind", "Nothing comes to mind right now.", "今は何も思い浮かびません。"],
  ["early on", "We noticed the problem early on.", "私たちは早い段階でその問題に気づきました。"],
  ["set sail", "The ship will set sail at dawn.", "その船は夜明けに出航します。"],
  ["make the best of", "We should make the best of this situation.", "私たちはこの状況を最大限に活用すべきです。"],
  ["get rid of", "I need to get rid of these old clothes.", "この古い服を処分する必要があります。"],
  ["in general", "In general, the staff here are very friendly.", "全般的に、ここのスタッフはとても親切です。"],
  ["back and forth", "The cat ran back and forth across the room.", "猫は部屋を行ったり来たり走り回りました。"],
  ["except for", "The store is open every day except for Sunday.", "その店は日曜日を除いて毎日営業しています。"],
  ["in vain", "All our efforts were in vain.", "私たちの努力はすべて無駄になりました。"],
  ["in short", "In short, we need a new strategy.", "要するに、私たちには新しい戦略が必要です。"],
  ["for the benefit of", "This seminar is held for the benefit of new employees.", "このセミナーは新入社員のために開かれています。"],
  ["more or less", "The two designs are more or less the same.", "その2つのデザインは多かれ少なかれ同じです。"],
  ["off duty", "The police officer was off duty at the time.", "その警察官はそのとき非番でした。"],
  ["as a matter of course", "Safety checks are done as a matter of course.", "安全確認は当然のこととして行われます。"],
  ["at any rate", "At any rate, we should leave now.", "とにかく、今すぐ出発すべきです。"],
  ["in all", "In all, fifty people applied for the job.", "全部で50人がその仕事に応募しました。"],
  ["in reality", "In reality, the project cost twice as much.", "実際には、そのプロジェクトは2倍の費用がかかりました。"],
  ["in the first place", "Why did you agree to it in the first place?", "そもそもなぜあなたはそれに同意したのですか？"],
  ["in someone's opinion", "In my opinion, the movie was too long.", "私の意見では、その映画は長すぎました。"],
  ["lose sight of", "Don't lose sight of your original goal.", "本来の目標を見失わないでください。"],
  ["speak well of", "Everyone speaks well of the new manager.", "みんな新しいマネージャーのことをよく言っています。"],
  ["take the place of", "Robots may take the place of some workers.", "ロボットが一部の労働者に取って代わるかもしれません。"],
  ["between you and me", "Between you and me, I don't trust him.", "ここだけの話、私は彼を信用していません。"],
  ["by means of", "They communicated by means of sign language.", "彼らは手話によって意思疎通をしました。"],
  ["on the air", "The show will be on the air at nine tonight.", "その番組は今夜9時に放送されます。"],
  ["as a matter of fact", "As a matter of fact, I already knew that.", "実は、私はすでにそれを知っていました。"],
  ["at work", "He is usually calm at work.", "彼は職場では普段冷静です。"],
  ["as to", "I have no idea as to what happened.", "何が起きたのかについて全く見当がつきません。"],
  ["be absorbed in", "She was absorbed in her book.", "彼女は本に夢中になっていました。"],
  ["for the sake of", "He quit smoking for the sake of his health.", "彼は健康のためにタバコをやめました。"],
  ["now and then", "We still meet now and then.", "私たちは今でも時々会います。"],
  ["regardless of", "Everyone can join, regardless of age.", "年齢に関係なく誰でも参加できます。"],
  ["come to life", "The city comes to life at night.", "その街は夜になると活気づきます。"],
  ["beside yourself", "She was beside herself with joy.", "彼女は嬉しさのあまり我を忘れていました。"],
  ["make a fool of yourself", "Don't make a fool of yourself at the meeting.", "会議で自分を笑いものにしないでください。"],
  ["make your way", "We made our way through the crowd.", "私たちは人混みをかき分けて進みました。"],
  ["all day (long)", "It rained all day long yesterday.", "昨日は一日中雨が降っていました。"],
  ["make much of", "The media made much of the small mistake.", "メディアはその小さなミスを大きく取り上げました。"],
  ["beyond belief", "The scenery was beautiful beyond belief.", "その景色は信じられないほど美しかったです。"],
  ["for free", "You can get a sample for free.", "無料でサンプルをもらえます。"],
  ["all the same", "It's all the same to me which movie we watch.", "どちらの映画を見ても私にはどちらでも構いません。"],
  ["in honor of", "The park was named in honor of the mayor.", "その公園は市長にちなんで名付けられました。"],
  ["it is high time", "It is high time you started studying.", "そろそろあなたが勉強を始めるべき時です。"],
  ["inch by inch", "The team improved their skills inch by inch.", "チームは少しずつ技術を向上させました。"],
  ["off guard", "The question caught me off guard.", "その質問には不意を突かれました。"],
  ["pick your way", "We picked our way carefully across the rocks.", "私たちは岩の上を注意深く選びながら進みました。"],
  ["take a fancy to", "He took a fancy to the little puppy.", "彼はその小さな子犬が気に入りました。"],
  ["in charge of", "She is in charge of the marketing team.", "彼女はマーケティングチームを担当しています。"],
  ["by far", "This is by far the best restaurant in town.", "これは断然この町で一番のレストランです。"],
  ["out of the question", "Canceling the trip is out of the question.", "旅行を中止するなど論外です。"],
  ["have in common", "We have a lot in common.", "私たちには共通点がたくさんあります。"],
  ["see (to it) that", "Please see to it that the door is locked.", "ドアが施錠されていることを確認してください。"],
  ["all in all", "All in all, it was a great trip.", "全体として、それは素晴らしい旅でした。"],
  ["for want of", "The plan failed for want of funding.", "その計画は資金不足のため失敗しました。"],
  ["in accordance with", "We acted in accordance with the rules.", "私たちは規則に従って行動しました。"],
  ["in public", "He rarely speaks in public.", "彼はめったに人前で話しません。"],
  ["make the most of", "Let's make the most of this opportunity.", "この機会を最大限に活かしましょう。"],
  ["take it easy", "Take it easy, we still have plenty of time.", "落ち着いて、まだ時間はたっぷりありますよ。"],
  ["for one thing", "For one thing, the price is too high.", "一つには、値段が高すぎます。"],
  ["no sooner ~ than", "No sooner had I sat down than the phone rang.", "座るやいなや電話が鳴りました。"],
  ["in brief", "In brief, the project was a success.", "手短に言うと、そのプロジェクトは成功でした。"],
  ["have in mind", "What do you have in mind for dinner?", "夕食は何を考えていますか？"],
  ["bring home to", "The accident brought home to us the importance of safety.", "その事故は私たちに安全の大切さを痛感させました。"],
  ["live from hand to mouth", "They lived from hand to mouth during those years.", "その頃、彼らはその日暮らしの生活をしていました。"],
  ["look at", "Can you look at this document for me?", "この書類を見てもらえますか？"],
  ["run away", "The dog ran away from home.", "その犬は家から逃げ出しました。"],
  ["look for", "I'm looking for a new apartment.", "新しいアパートを探しています。"],
  ["come back", "Please come back before it gets dark.", "暗くなる前に戻ってきてください。"],
  ["try on", "Can I try on this jacket?", "このジャケットを試着してもいいですか？"],
  ["come over", "Why don't you come over for dinner tonight?", "今夜、夕食を食べに来ませんか？"],
  ["grow up", "I grew up in a small town.", "私は小さな町で育ちました。"],
  ["come from", "Where do you come from?", "出身はどこですか？"],
  ["get back", "I'll get back to you by email.", "メールで折り返します。"],
  ["write down", "Please write down your phone number here.", "ここに電話番号を書いてください。"],
  ["wake up", "I woke up at six this morning.", "今朝6時に目が覚めました。"],
  ["come apart", "The old book came apart in my hands.", "その古い本は私の手の中でばらばらになりました。"],
  ["call back", "I'll call you back in ten minutes.", "10分後に折り返し電話します。"],
  ["stay out", "He stayed out late last night.", "彼は昨夜遅くまで外出していました。"],
  ["come down", "Prices are expected to come down next year.", "来年は物価が下がると予想されています。"],
  ["run after", "The children ran after the ball.", "子どもたちはボールを追いかけました。"],
  ["get away", "We need to get away for a short vacation.", "少し休暇を取ってどこかへ出かける必要があります。"],
  ["print out", "Could you print out this document for me?", "この書類を印刷してもらえますか？"],
  ["go away", "The headache finally went away.", "頭痛はついになくなりました。"],
  ["watch out", "Watch out! The floor is wet.", "気をつけて！床が濡れています。"],
  ["shut down", "The factory will shut down for maintenance.", "その工場はメンテナンスのため閉鎖されます。"],
  ["keep on doing", "She kept on working despite being tired.", "彼女は疲れているにもかかわらず働き続けました。"],
  ["drop by", "Feel free to drop by anytime.", "いつでも気軽に立ち寄ってください。"],
  ["depend on", "It depends on the weather.", "それは天気次第です。"],
  ["lie down", "I need to lie down for a moment.", "少しの間、横になる必要があります。"],
  ["go on", "Please go on with your presentation.", "プレゼンテーションを続けてください。"],
  ["go up", "Gas prices went up again this month.", "今月、ガソリン価格がまた上がりました。"],
  ["go out with", "She has been going out with him for a year.", "彼女は彼と1年間付き合っています。"],
  ["dress up", "We dressed up for the party.", "私たちはパーティーのためにおしゃれをしました。"],
  ["switch on", "Could you switch on the light, please?", "電気をつけてもらえますか？"],
  ["come up", "A great idea just came up.", "素晴らしいアイデアが浮かびました。"],
  ["happen to", "What happened to your car?", "あなたの車に何があったのですか？"],
  ["check out", "We need to check out of the hotel by noon.", "正午までにホテルをチェックアウトする必要があります。"],
  ["get out", "Get out of the car carefully.", "気をつけて車から降りてください。"],
  ["close down", "The old cinema closed down last year.", "その古い映画館は去年閉館しました。"],
  ["come up to", "A stranger came up to me and asked for directions.", "見知らぬ人が私に近づいてきて道を尋ねました。"],
  ["find out", "I need to find out what happened.", "何が起こったのか突き止める必要があります。"],
  ["shut up", "He told the noisy kids to shut up.", "彼はうるさい子どもたちに静かにするよう言いました。"],
  ["come in", "Please come in and have a seat.", "どうぞ中に入って座ってください。"],
  ["go by", "Time seems to go by so fast.", "時間はとても早く過ぎ去るように感じます。"],
  ["stay away from", "You should stay away from junk food.", "ジャンクフードは避けるべきです。"],
  ["set out", "They set out on their journey at dawn.", "彼らは夜明けに旅に出発しました。"],
  ["go into", "Let's go into more detail later.", "後でもっと詳しく検討しましょう。"],
  ["hear from", "I haven't heard from him in weeks.", "何週間も彼から連絡がありません。"],
  ["put up", "We put up a tent in the forest.", "私たちは森の中にテントを張りました。"],
  ["bring back", "This song brings back a lot of memories.", "この曲はたくさんの思い出を蘇らせます。"],
  ["take away", "Can I get this to take away?", "これを持ち帰りにできますか？"],
  ["come out", "The new movie comes out next Friday.", "新しい映画は来週の金曜日に公開されます。"],
  ["bring in", "The company brought in a new manager.", "会社は新しいマネージャーを迎え入れました。"],
  ["blow out", "Please blow out the candles.", "ろうそくを吹き消してください。"],
  ["call on", "I called on my grandmother yesterday.", "昨日、祖母を訪ねました。"],
  ["stand for", "What does 'CEO' stand for?", "「CEO」は何を表しますか？"],
  ["care for", "Would you care for some tea?", "紅茶はいかがですか？"],
  ["get on with", "How are you getting on with your new job?", "新しい仕事はどうですか？"],
  ["get together", "Let's get together for lunch sometime.", "今度、一緒にランチをしましょう。"],
  ["have on", "She had on a red dress.", "彼女は赤いドレスを着ていました。"],
  ["wait on", "The waiter waited on us politely.", "そのウェイターは丁寧に私たちに給仕しました。"],
  ["leave behind", "Don't leave your umbrella behind.", "傘を置き忘れないでください。"],
  ["take back", "I want to take back what I said earlier.", "さっき言ったことを撤回したいです。"],
  ["hurry up", "Hurry up, or we'll miss the bus.", "急いで、じゃないとバスに乗り遅れますよ。"],
  ["think of", "What do you think of this idea?", "このアイデアについてどう思いますか？"],
  ["get down", "The cat wouldn't get down from the tree.", "その猫は木から降りようとしませんでした。"],
  ["look after", "Can you look after the kids for an hour?", "1時間、子どもたちの面倒を見てもらえますか？"],
  ["go out", "Do you want to go out for dinner tonight?", "今夜、外に夕食を食べに行きませんか？"],
  ["slow down", "Please slow down, you're driving too fast.", "スピードを落としてください、運転が速すぎます。"],
  ["belong to", "This bag belongs to me.", "このバッグは私のものです。"],
  ["work on", "I'm working on a new project this month.", "今月、新しいプロジェクトに取り組んでいます。"],
  ["carry out", "The company will carry out a survey next week.", "会社は来週調査を実施します。"],
  ["set apart", "Her talent set her apart from the others.", "彼女の才能は彼女を他の人たちとは一線を画すものにしました。"],
  ["get off", "We need to get off at the next stop.", "私たちは次の停留所で降りる必要があります。"],
  ["look forward to", "I'm looking forward to seeing you soon.", "近いうちにお会いできるのを楽しみにしています。"],
  ["turn on", "Could you turn on the air conditioner?", "エアコンをつけてもらえますか？"],
  ["put on", "She put on her coat and left the house.", "彼女はコートを着て家を出ました。"],
  ["turn into", "The caterpillar turned into a butterfly.", "その毛虫は蝶になりました。"],
  ["watch over", "The teacher watched over the children at the pool.", "先生はプールで子どもたちを見守りました。"],
  ["fall off", "Be careful not to fall off the ladder.", "はしごから落ちないよう気をつけてください。"],
  ["agree with", "I completely agree with your opinion.", "あなたの意見に完全に同意します。"],
  ["hear of", "I've never heard of that restaurant.", "そのレストランについて聞いたことがありません。"],
  ["send for", "We should send for a doctor right away.", "すぐに医者を呼ぶべきです。"],
  ["take down", "The secretary took down the minutes of the meeting.", "秘書は会議の議事録を書き留めました。"],
  ["cheer up", "I bought her flowers to cheer her up.", "彼女を元気づけるために花を買いました。"],
  ["lead to", "Hard work leads to success.", "努力は成功につながります。"],
  ["sit up", "The baby can already sit up by himself.", "その赤ちゃんはもう一人で座ることができます。"],
  ["turn around", "He turned around when he heard his name.", "彼は自分の名前を聞いて振り返りました。"],
  ["pay back", "I'll pay you back next week.", "来週あなたにお金を返します。"],
  ["go ahead", "Go ahead and start without me.", "私を待たずに始めてください。"],
  ["look over", "Could you look over my resume?", "私の履歴書を確認してもらえますか？"],
  ["prepare for", "We are preparing for the exam.", "私たちは試験の準備をしています。"],
  ["check in", "What time can we check in at the hotel?", "ホテルに何時にチェックインできますか？"],
  ["search for", "The police are searching for the missing dog.", "警察は行方不明の犬を捜索しています。"],
  ["come into", "He came into a large fortune from his uncle.", "彼はおじから多額の財産を受け継ぎました。"],
  ["result in", "The mistake resulted in a big loss.", "そのミスは大きな損失につながりました。"],
  ["show around", "Let me show you around the office.", "オフィスをご案内しましょう。"],
  ["keep from doing", "I couldn't keep myself from laughing.", "笑わずにはいられませんでした。"],
  ["get on", "We got on the train just in time.", "私たちはぎりぎり電車に乗ることができました。"],
  ["stare at", "It's rude to stare at people.", "人をじろじろ見るのは失礼です。"],
  ["give up", "Never give up on your dreams.", "夢を決してあきらめないでください。"],
  ["make up", "They had a fight but made up quickly.", "彼らはけんかしましたがすぐに仲直りしました。"],
  ["turn off", "Please turn off your phone during the movie.", "映画の間は携帯電話の電源を切ってください。"],
  ["look up", "You can look up the word in the dictionary.", "その単語は辞書で調べられます。"],
  ["put away", "Please put away your toys before dinner.", "夕食の前におもちゃを片付けてください。"],
  ["hold on", "Hold on a second, I'll be right there.", "少し待ってください、すぐに行きます。"],
  ["get over", "It took her a while to get over the flu.", "彼女がインフルエンザから回復するのに時間がかかりました。"],
  ["believe in", "I believe in you, you can do it.", "あなたを信じています、あなたならできます。"],
  ["occur to", "It didn't occur to me that he was lying.", "彼がうそをついているとは思いもしませんでした。"],
  ["reach for", "She reached for the top shelf.", "彼女は一番上の棚に手を伸ばしました。"],
  ["put aside", "Let's put aside our differences and work together.", "意見の違いは脇に置いて、一緒に取り組みましょう。"],
  ["rely on", "You can always rely on your family.", "家族はいつでも頼りにできます。"],
  ["get to", "What time will we get to the airport?", "何時に空港に着きますか？"],
  ["go off", "The alarm went off at six in the morning.", "アラームは朝6時に鳴りました。"],
  ["pull up", "The taxi pulled up in front of the hotel.", "タクシーはホテルの前に止まりました。"],
  ["pass by", "Many years have passed by since then.", "それ以来、長い年月が過ぎ去りました。"],
  ["look to for", "We look to our manager for advice.", "私たちはアドバイスを求めてマネージャーに頼ります。"],
  ["live on", "He lives on a small pension.", "彼はわずかな年金で生活しています。"],
  ["stand by", "I'll stand by you no matter what happens.", "何が起きても私はあなたを支えます。"],
  ["pull together", "The team pulled together to meet the deadline.", "チームは締め切りに間に合わせるため協力しました。"],
  ["concentrate on", "Please concentrate on your work.", "仕事に集中してください。"],
  ["send out", "We'll send out the invitations next week.", "来週、招待状を送付します。"],
  ["go without", "We had to go without electricity for a day.", "私たちは一日、電気なしで過ごさなければなりませんでした。"],
  ["bring about", "The new policy brought about many changes.", "新しい方針は多くの変化をもたらしました。"],
  ["hand in", "Please hand in your homework by Friday.", "宿題は金曜日までに提出してください。"],
  ["look into", "The manager promised to look into the issue.", "マネージャーはその問題を調査すると約束しました。"],
  ["catch up with", "I need to catch up with the news.", "ニュースをちゃんと確認する必要があります。"],
  ["go on with", "Let's go on with the next topic.", "次の話題に進みましょう。"],
  ["keep away from", "Keep away from the edge of the cliff.", "崖の端には近づかないでください。"],
  ["eat out", "We usually eat out on Fridays.", "私たちはたいてい金曜日に外食します。"],
  ["get around", "News gets around fast in this town.", "この町ではうわさがすぐに広まります。"],
  ["go against", "This decision goes against company policy.", "この決定は会社の方針に反しています。"],
  ["rid of", "We finally got rid of the old sofa.", "私たちはついに古いソファを処分しました。"],
  ["point out", "She pointed out a mistake in my report.", "彼女は私のレポートの間違いを指摘しました。"],
  ["join in", "Why don't you join in the game?", "そのゲームに参加しませんか？"],
  ["run out of", "We ran out of milk this morning.", "今朝、牛乳が切れてしまいました。"],
  ["put out", "The firefighters put out the fire quickly.", "消防士たちは素早く火を消しました。"],
  ["hand down", "This ring has been handed down for generations.", "この指輪は何世代にもわたって受け継がれてきました。"],
  ["stay up", "I stayed up late to finish the report.", "レポートを終わらせるために夜更かししました。"],
  ["think up", "Can you think up a better title?", "もっと良いタイトルを思いつきますか？"],
  ["run into", "I ran into an old friend at the mall.", "モールで昔の友人にばったり会いました。"],
  ["calm down", "Please calm down and tell me what happened.", "落ち着いて何が起きたのか教えてください。"],
  ["run over", "The car nearly ran over the cat.", "その車はもう少しで猫をひくところでした。"],
  ["look through", "I looked through the documents carefully.", "私は書類を注意深く目を通しました。"],
  ["remind of", "This song reminds me of my childhood.", "この曲は私に子ども時代を思い出させます。"],
  ["tie up", "Please tie up the boxes with this string.", "この紐で箱を縛ってください。"],
  ["get through", "We managed to get through the storm safely.", "私たちは何とか安全に嵐を乗り切りました。"],
  ["mistake for", "I mistook him for his brother.", "私は彼を彼の兄と間違えました。"],
  ["amount to", "The total cost amounts to a hundred dollars.", "総費用は100ドルに達します。"],
  ["rob of", "The accident robbed him of his eyesight.", "その事故は彼から視力を奪いました。"],
  ["break in", "A thief broke in while we were away.", "私たちが留守の間に泥棒が侵入しました。"],
  ["add to", "This only adds to my confusion.", "これは私の混乱をさらに深めるだけです。"],
  ["fall behind", "He fell behind in his studies after the illness.", "彼は病気の後、勉強が遅れてしまいました。"],
  ["cut off", "The power was cut off during the storm.", "嵐の間、電気が止まりました。"],
  ["result from", "The delay resulted from a system error.", "その遅れはシステムエラーによるものでした。"],
  ["see off", "We went to the airport to see her off.", "私たちは彼女を見送るために空港へ行きました。"],
  ["set aside", "Let's set aside some time to talk.", "話をするための時間を確保しましょう。"],
  ["do without", "We can't do without your help.", "あなたの助けなしではやっていけません。"],
  ["turn over", "Please turn over the page.", "ページをめくってください。"],
  ["watch out for", "Watch out for cars when crossing the street.", "道路を渡るときは車に気をつけてください。"],
  ["give in", "He finally gave in to their demands.", "彼はついに彼らの要求に屈しました。"],
  ["use up", "We used up all the paper in the printer.", "プリンターの紙をすべて使い切りました。"],
  ["derive from", "Many English words derive from Latin.", "多くの英単語はラテン語に由来します。"],
  ["refer to", "Please refer to page ten for details.", "詳細は10ページを参照してください。"],
  ["get out of", "How do we get out of this traffic jam?", "この渋滞からどうやって抜け出しましょうか？"],
  ["hit on", "She hit on a great idea for the project.", "彼女はそのプロジェクトの素晴らしいアイデアを思いつきました。"],
  ["turn up", "He turned up late for the meeting again.", "彼はまた会議に遅れて現れました。"],
  ["die out", "This tradition is slowly dying out.", "この伝統は徐々に廃れつつあります。"],
  ["keep off", "Please keep off the grass.", "芝生に入らないでください。"],
  ["pick out", "I picked out a gift for my mother.", "母へのプレゼントを選びました。"],
  ["come along", "Would you like to come along with us?", "私たちと一緒に来ませんか？"],
  ["listen for", "Listen for the doorbell while I'm in the shower.", "私がシャワーを浴びている間、ドアベルに耳を澄ませていてください。"],
  ["come across", "I came across an interesting article today.", "今日、興味深い記事を偶然見つけました。"],
  ["turn down", "She turned down the job offer.", "彼女はその仕事の申し出を断りました。"],
  ["deal with", "We need to deal with this problem quickly.", "私たちはこの問題に迅速に対処する必要があります。"],
  ["do away with", "The company decided to do away with paper forms.", "会社は紙の書類を廃止することにしました。"],
  ["burst into", "She burst into tears when she heard the news.", "彼女はその知らせを聞いて突然泣き出しました。"],
  ["call up", "I'll call up the restaurant to make a reservation.", "予約するためにそのレストランに電話します。"],
  ["deal in", "This shop deals in antique furniture.", "この店はアンティーク家具を扱っています。"],
  ["die of", "He died of a heart attack last year.", "彼は去年、心臓発作で亡くなりました。"],
  ["look up to", "Young players look up to him as a role model.", "若い選手たちは彼をお手本として尊敬しています。"],
  ["talk over", "Let's talk over the plan before deciding.", "決める前にその計画について話し合いましょう。"],
  ["put together", "We put together a proposal for the client.", "私たちはクライアント向けの提案書をまとめました。"],
  ["give birth to", "She gave birth to a healthy baby boy.", "彼女は健康な男の子を出産しました。"],
  ["give out", "The teacher gave out the test papers.", "先生はテスト用紙を配りました。"],
  ["major in", "I majored in economics at university.", "私は大学で経済学を専攻しました。"],
  ["turn in", "Please turn in your assignment by Monday.", "月曜日までに課題を提出してください。"],
  ["come about", "How did this misunderstanding come about?", "この誤解はどのようにして起きたのですか？"],
  ["go through", "We had to go through a lot of paperwork.", "私たちは大量の書類手続きをしなければなりませんでした。"],
  ["figure out", "I can't figure out how this machine works.", "この機械がどう動くのか理解できません。"],
  ["carry on", "Please carry on with the meeting without me.", "私抜きで会議を進めてください。"],
  ["wear out", "These shoes have worn out already.", "この靴はもうすり減ってしまいました。"],
  ["throw away", "Don't throw away that box, I still need it.", "その箱は捨てないで、まだ必要なんです。"],
  ["mix up", "I always mix up their names.", "私はいつも彼らの名前を混同してしまいます。"],
  ["ring up", "I'll ring up the office to confirm the schedule.", "スケジュールを確認するために事務所に電話します。"],
  ["take after", "She takes after her mother in many ways.", "彼女は多くの点で母親に似ています。"],
  ["succeed in", "He succeeded in passing the exam.", "彼は試験に合格することに成功しました。"],
  ["keep up with", "It's hard to keep up with all the changes.", "すべての変化についていくのは大変です。"],
  ["make up for", "Extra practice can make up for lost time.", "追加の練習は失った時間を埋め合わせることができます。"],
  ["go with", "This wine goes well with cheese.", "このワインはチーズによく合います。"],
  ["look down on", "He never looks down on anyone.", "彼は決して誰も見下しません。"],
  ["burn down", "The old barn burned down last night.", "その古い納屋は昨夜焼け落ちました。"],
  ["drive at", "I don't understand what you're driving at.", "あなたが何を言おうとしているのか理解できません。"],
  ["turn into", "The small startup turned into a huge company.", "その小さなスタートアップは巨大企業になりました。"],
  ["hang up", "Please don't hang up the phone yet.", "まだ電話を切らないでください。"],
  ["turn over to", "The manager turned the project over to a new team.", "マネージャーはそのプロジェクトを新しいチームに引き継ぎました。"],
  ["get at", "What are you trying to get at?", "あなたは何を言おうとしているのですか？"],
  ["fill up", "The tank filled up quickly at the gas station.", "ガソリンスタンドでタンクはすぐに満タンになりました。"],
  ["keep out of", "Keep out of trouble while I'm away.", "私がいない間、トラブルに巻き込まれないでください。"],
  ["delight in", "She delights in helping others.", "彼女は他人を助けることに喜びを感じます。"],
  ["finish off", "Let's finish off the last of the pizza.", "残りのピザを食べ終えてしまいましょう。"],
  ["subject to", "The schedule is subject to change.", "スケジュールは変更される場合があります。"],
  ["get along", "Do you get along with your coworkers?", "同僚とはうまくやっていますか？"],
  ["tell from", "I couldn't tell him from his twin brother.", "私は彼を双子の兄弟と見分けられませんでした。"],
  ["look back on", "When I look back on it, I feel proud.", "それを振り返ると、誇らしく感じます。"],
  ["burst out", "The whole class burst out laughing.", "クラス全員が突然笑い出しました。"],
  ["consist of", "The committee consists of ten members.", "その委員会は10人のメンバーで構成されています。"],
  ["think over", "Please think it over and let me know tomorrow.", "よく考えて、明日教えてください。"],
  ["contend with", "Small businesses have to contend with rising costs.", "中小企業はコスト上昇に対処しなければなりません。"],
  ["account for", "Can you account for the missing funds?", "不足している資金について説明できますか？"],
  ["go over", "Let's go over the plan one more time.", "もう一度その計画を確認しましょう。"],
  ["pass away", "Her grandfather passed away peacefully.", "彼女の祖父は安らかに亡くなりました。"],
  ["keep to yourself", "It's best to keep this information to yourself.", "この情報は自分の胸にしまっておくのが一番です。"],
];

let state = normalizeState(null);
let currentUser = null;
let unsubscribeSnapshot = null;
let currentGroupKey = "todo";
let currentChildKey = "work";
let uiFilter = "all";
let todayTab = "task";
let englishShuffleOverride = null;
let englishDirection = "en2ja";

const nav = document.getElementById("category-nav");
const subNav = document.getElementById("sub-nav");
const content = document.getElementById("content");
const todayContent = document.getElementById("today-content");
const accountBar = document.getElementById("account-bar");
const signinScreen = document.getElementById("signin-screen");
const appRoot = document.getElementById("app-root");

function emptyTodos() {
  return { work: [], dailytask: [], shopping: [], travel: [], book: [], movie: [], music: [] };
}

// Fills in any missing fields so data from Firestore (or an older local
// schema) always has the shape the rest of the app expects.
function normalizeState(raw) {
  const merged = Object.assign(
    { todos: emptyTodos(), diary: [], dailyDone: { english: null }, englishMemorized: {} },
    raw || {}
  );
  merged.todos = Object.assign(emptyTodos(), merged.todos);
  merged.dailyDone = Object.assign({ english: null }, merged.dailyDone);
  if (!Array.isArray(merged.diary)) merged.diary = [];
  if (!merged.englishMemorized || typeof merged.englishMemorized !== "object") {
    merged.englishMemorized = {};
  }
  return merged;
}

// Reads this browser's pre-sync local data, migrating older schema
// versions. Used only to seed a brand-new Firestore account on first sign-in.
function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt state */
  }

  const fresh = { todos: emptyTodos(), diary: [] };

  try {
    const v2Raw = localStorage.getItem(LEGACY_STORAGE_KEY_V2);
    if (v2Raw) {
      const v2 = JSON.parse(v2Raw);
      const oldTodos = v2.todos || {};
      fresh.todos.work = oldTodos.work || [];
      fresh.todos.shopping = oldTodos.shopping || [];
      fresh.todos.music = oldTodos.music || [];
      fresh.todos.movie = oldTodos.bookmovie || [];
      fresh.todos.travel = (oldTodos.wishlist || []).map(({ tag, ...rest }) => rest);
      fresh.diary = v2.diary || [];
      return fresh;
    }
  } catch {
    /* ignore corrupt legacy state */
  }

  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_V1);
    if (legacyRaw) {
      const legacyTodos = JSON.parse(legacyRaw);
      if (Array.isArray(legacyTodos)) fresh.todos.work = legacyTodos;
    }
  } catch {
    /* ignore corrupt legacy state */
  }

  return fresh;
}

function saveState() {
  renderTodayWidget();
  if (!currentUser) return;
  setDoc(doc(db, "users", currentUser.uid), state).catch((err) => {
    console.error("Cloud sync failed:", err);
  });
}

/* ---------- Auth & cloud sync ---------- */

function initAppUI() {
  renderNav();
  renderSubNav();
  renderContent();
  renderTodayWidget();
}

function startSync(uid) {
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  unsubscribeSnapshot = onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      if (!snap.exists()) return;
      const incoming = normalizeState(snap.data());
      // Skip redundant re-renders caused by our own writes echoing back.
      if (JSON.stringify(incoming) === JSON.stringify(state)) return;
      state = incoming;
      initAppUI();
    },
    (err) => console.error("Cloud sync listener error:", err)
  );
}

function renderAccountBar() {
  accountBar.innerHTML = "";
  if (!currentUser) return;
  accountBar.appendChild(el("span", { class: "account-email" }, currentUser.email || ""));
  accountBar.appendChild(
    el(
      "button",
      { class: "account-signout", onclick: () => signOut(auth) },
      "ログアウト"
    )
  );
}

async function handleSignedIn(user) {
  currentUser = user;
  renderAccountBar();

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      state = normalizeState(snap.data());
    } else {
      // First time this account is used: seed from any pre-existing local data.
      state = normalizeState(loadLocalState());
      await setDoc(ref, state);
    }

    startSync(user.uid);
    signinScreen.style.display = "none";
    appRoot.style.display = "block";
    initAppUI();
  } catch (err) {
    // Surface the real cause instead of silently bouncing back to the
    // sign-in screen (e.g. Firestore rules rejecting the read/write, or
    // the database not existing yet).
    console.error("Failed to load data after sign-in:", err);
    alert(
      "ログインはできましたが、データの読み込みに失敗しました。\n" +
        "エラー: " + (err && err.code ? err.code : String(err)) +
        "\n\nFirestoreのルール設定をご確認ください。"
    );
  }
}

function handleSignedOut() {
  currentUser = null;
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  appRoot.style.display = "none";
  signinScreen.style.display = "flex";
}

document.getElementById("signin-btn").addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err && err.code === "auth/popup-blocked") {
      // Some browsers/contexts (e.g. certain in-app or PWA setups) block
      // popups outright; fall back to a full-page redirect in that case.
      signInWithRedirect(auth, provider);
      return;
    }
    if (err && (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request")) {
      return; // user dismissed the popup themselves; nothing to report
    }
    console.error("Sign-in failed:", err);
    alert("ログインに失敗しました: " + (err && err.code ? err.code : String(err)));
  }
});

// Surfaces the specific error (e.g. an unauthorized domain) if the redirect
// sign-in didn't succeed; a plain "no user" from onAuthStateChanged alone
// wouldn't tell us why.
getRedirectResult(auth)
  .then((result) => {
    console.log("getRedirectResult:", result ? `signed in as ${result.user.email}` : "no pending redirect");
  })
  .catch((err) => {
    console.error("Sign-in failed:", err);
    alert("ログインに失敗しました: " + (err && err.code ? err.code : "不明なエラー"));
  });

onAuthStateChanged(auth, (user) => {
  if (user) handleSignedIn(user);
  else handleSignedOut();
});

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node) {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/* ---------- Navigation (group + sub-category) ---------- */

function selectGroup(group) {
  currentGroupKey = group.key;
  currentChildKey = group.children ? group.children[0].key : null;
  uiFilter = "all";
  renderNav();
  renderSubNav();
  renderContent();
}

function renderNav() {
  nav.innerHTML = "";
  for (const group of GROUPS) {
    const btn = el(
      "button",
      {
        class: "nav-btn" + (group.key === currentGroupKey ? " active" : ""),
        onclick: () => selectGroup(group),
      },
      group.label
    );
    nav.appendChild(btn);
  }
}

function renderSubNav() {
  subNav.innerHTML = "";
  const group = GROUPS.find((g) => g.key === currentGroupKey);
  if (!group || !group.children) {
    subNav.style.display = "none";
    return;
  }
  subNav.style.display = "flex";
  for (const child of group.children) {
    const btn = el(
      "button",
      {
        class: "sub-nav-btn" + (child.key === currentChildKey ? " active" : ""),
        onclick: () => {
          currentChildKey = child.key;
          uiFilter = "all";
          renderSubNav();
          renderContent();
        },
      },
      child.label
    );
    subNav.appendChild(btn);
  }
}

/* ---------- Content dispatch ---------- */

function renderContent() {
  content.innerHTML = "";
  if (currentGroupKey === "diary") {
    renderDiary();
  } else if (currentGroupKey === "english") {
    renderEnglish();
  } else {
    renderTodoCategory(currentChildKey);
  }
}

/* ---------- Today widget (always-visible Today's task / Others) ---------- */

function goTo(groupKey, childKey) {
  selectGroup(GROUPS.find((g) => g.key === groupKey) || GROUPS[0]);
  if (childKey) {
    currentChildKey = childKey;
    renderSubNav();
    renderContent();
  }
}

function sortByDate(entries) {
  entries.sort((a, b) => {
    const ad = dateSortKey(a.todo);
    const bd = dateSortKey(b.todo);
    if (!ad && !bd) return 0;
    if (!ad) return -1;
    if (!bd) return 1;
    return ad.localeCompare(bd);
  });
  return entries;
}

function collectTodayEntries() {
  const todayStr = todayISO();
  const todayEntries = [];
  const otherEntries = [];

  for (const categoryKey of TODO_KEYS) {
    const items = state.todos[categoryKey] || [];
    for (const todo of items) {
      if (todo.completed) continue;
      (isInTodaysTask(todo, todayStr) ? todayEntries : otherEntries).push({ todo, categoryKey });
    }
  }

  // Undated items (today's additions) come first; dated items sort to the
  // bottom, soonest/most overdue date first.
  return { todayEntries: sortByDate(todayEntries), otherEntries: sortByDate(otherEntries) };
}

function renderTodayWidget() {
  todayContent.innerHTML = "";
  renderTodaySubnav();

  const { todayEntries, otherEntries } = collectTodayEntries();
  const list = el("ul", { class: "today-list" });

  if (todayTab === "others") {
    if (otherEntries.length === 0) {
      list.appendChild(el("li", { class: "empty-state" }, "予定はありません"));
    } else {
      for (const { todo, categoryKey } of otherEntries) {
        list.appendChild(renderTodayItem(todo, categoryKey));
      }
    }
  } else {
    list.appendChild(renderTodayFixedEntry("📚", "英熟語を確認する", "english", null, "english"));
    for (const { todo, categoryKey } of todayEntries) {
      list.appendChild(renderTodayItem(todo, categoryKey));
    }
  }

  todayContent.appendChild(list);
}

function renderTodaySubnav() {
  const bar = document.getElementById("today-subnav");
  bar.innerHTML = "";
  [
    { key: "task", label: "Today's task" },
    { key: "others", label: "Others" },
  ].forEach((t) => {
    bar.appendChild(
      el(
        "button",
        {
          class: "sub-nav-btn" + (todayTab === t.key ? " active" : ""),
          onclick: () => {
            todayTab = t.key;
            renderTodayWidget();
          },
        },
        t.label
      )
    );
  });
}

function renderTodayFixedEntry(icon, label, groupKey, childKey, doneKey) {
  const todayStr = todayISO();
  const li = el("li", { class: "today-item today-fixed" });

  const checkbox = el("input", {
    type: "checkbox",
    checked: state.dailyDone[doneKey] === todayStr,
    onclick: (e) => e.stopPropagation(),
    onchange: () => {
      state.dailyDone[doneKey] = state.dailyDone[doneKey] === todayStr ? null : todayStr;
      saveState();
      renderContent();
    },
  });

  const text = el(
    "span",
    { class: "today-item-text", onclick: () => goTo(groupKey, childKey) },
    label
  );

  li.appendChild(checkbox);
  li.appendChild(el("span", { class: "today-fixed-icon" }, icon));
  li.appendChild(text);
  return li;
}

function renderTodayItem(todo, categoryKey) {
  const li = el("li", { class: "today-item" });

  const checkbox = el("input", {
    type: "checkbox",
    checked: todo.completed,
    onchange: () => {
      todo.completed = !todo.completed;
      saveState();
      renderContent();
    },
  });

  const text = el(
    "span",
    { class: "today-item-text", onclick: () => goTo(CATEGORY_TO_GROUP[categoryKey], categoryKey) },
    todo.text
  );

  const badge = el(
    "span",
    { class: "today-cat-badge", onclick: () => goTo(CATEGORY_TO_GROUP[categoryKey], categoryKey) },
    CATEGORY_LABELS[categoryKey] || categoryKey
  );

  const dateText = dateBadgeText(todo);
  const dateBadge = dateText ? el("span", { class: "date-badge" }, dateText) : null;

  li.appendChild(checkbox);
  li.appendChild(text);
  li.appendChild(badge);
  if (dateBadge) li.appendChild(dateBadge);
  return li;
}

function renderTodoCategory(categoryKey) {
  const items = state.todos[categoryKey] || (state.todos[categoryKey] = []);

  const input = el("input", {
    type: "text",
    placeholder: "やることを入力...",
    autocomplete: "off",
    maxLength: 200,
  });

  let dateMode = "none"; // "none" | "deadline" | "period"
  const deadlineInput = el("input", { type: "date", class: "date-input" });
  const periodStartInput = el("input", { type: "date", class: "date-input" });
  const periodEndInput = el("input", { type: "date", class: "date-input" });

  const dateRow = el("div", { class: "date-row" });

  function renderDateRow() {
    dateRow.innerHTML = "";
    const toggle = el(
      "div",
      { class: "date-mode-toggle" },
      [
        { key: "none", label: "日付なし" },
        { key: "deadline", label: "締切" },
        { key: "period", label: "期間" },
      ].map((m) =>
        el(
          "button",
          {
            type: "button",
            class: "date-mode-btn" + (dateMode === m.key ? " active" : ""),
            onclick: () => {
              dateMode = m.key;
              renderDateRow();
            },
          },
          m.label
        )
      )
    );
    dateRow.appendChild(toggle);

    if (dateMode === "deadline") {
      dateRow.appendChild(deadlineInput);
    } else if (dateMode === "period") {
      dateRow.appendChild(periodStartInput);
      dateRow.appendChild(el("span", { class: "date-range-sep" }, "〜"));
      dateRow.appendChild(periodEndInput);
    }
  }
  renderDateRow();

  const form = el(
    "form",
    {
      class: "todo-form",
      onsubmit: (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        const newTodo = {
          id: createId(),
          text,
          completed: false,
          createdDate: todayISO(),
          deadline: null,
          periodStart: null,
          periodEnd: null,
        };
        if (dateMode === "deadline" && deadlineInput.value) {
          newTodo.deadline = deadlineInput.value;
        } else if (dateMode === "period" && periodStartInput.value) {
          newTodo.periodStart = periodStartInput.value;
          newTodo.periodEnd = periodEndInput.value || periodStartInput.value;
        }
        items.unshift(newTodo);
        saveState();
        input.value = "";
        deadlineInput.value = "";
        periodStartInput.value = "";
        periodEndInput.value = "";
        dateMode = "none";
        renderDateRow();
        renderContent();
      },
    },
    [
      el("div", { class: "todo-form-row1" }, [input, el("button", { type: "submit" }, "追加")]),
      dateRow,
    ]
  );

  const filterRow = el(
    "div",
    { class: "filters" },
    [
      { key: "all", label: "すべて" },
      { key: "active", label: "未完了" },
      { key: "completed", label: "完了済み" },
    ].map((f) =>
      el(
        "button",
        {
          class: "filter-btn" + (uiFilter === f.key ? " active" : ""),
          onclick: () => {
            uiFilter = f.key;
            renderContent();
          },
        },
        f.label
      )
    )
  );

  let filtered = items;
  if (uiFilter === "active") filtered = filtered.filter((t) => !t.completed);
  if (uiFilter === "completed") filtered = filtered.filter((t) => t.completed);

  const list = el("ul", { class: "todo-list" });
  if (filtered.length === 0) {
    list.appendChild(el("li", { class: "empty-state" }, "タスクはありません"));
  } else {
    for (const todo of filtered) {
      list.appendChild(renderTodoItem(todo, items));
    }
  }

  const remaining = items.filter((t) => !t.completed).length;
  const footer = el("div", { class: "footer" }, [
    el("span", {}, `${remaining} 件残り`),
    el(
      "button",
      {
        class: "clear-btn",
        onclick: () => {
          state.todos[categoryKey] = items.filter((t) => !t.completed);
          saveState();
          renderContent();
        },
      },
      "完了済みを削除"
    ),
  ]);

  content.appendChild(form);
  content.appendChild(filterRow);
  content.appendChild(list);
  content.appendChild(footer);
}

function renderTodoItem(todo, items) {
  const li = el("li", { class: "todo-item" + (todo.completed ? " completed" : "") });

  const checkbox = el("input", {
    type: "checkbox",
    checked: todo.completed,
    onchange: () => {
      todo.completed = !todo.completed;
      saveState();
      renderContent();
    },
  });

  const text = el("span", {
    class: "todo-text",
    title: "ダブルクリックで編集",
    ondblclick: () => startEditTodoText(li, todo),
  }, todo.text);

  const dateText = dateBadgeText(todo);
  const dateBadge = dateText ? el("span", { class: "date-badge" }, dateText) : null;

  const deleteBtn = el(
    "button",
    {
      class: "delete-btn",
      "aria-label": "削除",
      onclick: () => {
        const idx = items.indexOf(todo);
        if (idx !== -1) items.splice(idx, 1);
        saveState();
        renderContent();
      },
    },
    "×"
  );

  li.appendChild(checkbox);
  li.appendChild(text);
  if (dateBadge) li.appendChild(dateBadge);
  li.appendChild(deleteBtn);
  return li;
}

function startEditTodoText(li, todo) {
  const editInput = el("input", {
    type: "text",
    class: "todo-text-input",
    value: todo.text,
    maxLength: 200,
  });

  const textEl = li.querySelector(".todo-text");
  li.replaceChild(editInput, textEl);
  editInput.focus();
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);

  const commit = () => {
    const value = editInput.value.trim();
    if (value) todo.text = value;
    saveState();
    renderContent();
  };

  editInput.addEventListener("blur", commit);
  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") editInput.blur();
    if (e.key === "Escape") {
      editInput.removeEventListener("blur", commit);
      renderContent();
    }
  });
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function formatDateShort(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// A todo can carry either a single deadline date or a start~end period.
// Whether this todo belongs in "Today's task" (as opposed to "Others").
//  - deadline: always shown (even once overdue) until done.
//  - period: shown only while today falls within [start, end].
//  - no date: shown only on the day it was added.
function isInTodaysTask(todo, todayStr) {
  if (todo.deadline) return true;
  if (todo.periodStart && todo.periodEnd) {
    return todo.periodStart <= todayStr && todayStr <= todo.periodEnd;
  }
  return todo.createdDate === todayStr;
}

function dateSortKey(todo) {
  return todo.deadline || todo.periodStart || "";
}

function dateBadgeText(todo) {
  if (todo.deadline) return `〆${formatDateShort(todo.deadline)}`;
  if (todo.periodStart && todo.periodEnd && todo.periodStart !== todo.periodEnd) {
    return `${formatDateShort(todo.periodStart)}〜${formatDateShort(todo.periodEnd)}`;
  }
  if (todo.periodStart) return formatDateShort(todo.periodStart);
  return null;
}

/* ---------- Diary (diary text + next day plan) ---------- */

function renderDiary() {
  const entries = state.diary || (state.diary = []);

  const dateInput = el("input", { type: "date", value: todayISO() });
  const diaryArea = el("textarea", { placeholder: "今日の日記..." });
  const planArea = el("textarea", { placeholder: "明日の予定..." });

  const form = el(
    "form",
    {
      class: "journal-form",
      onsubmit: (e) => {
        e.preventDefault();
        const diaryText = diaryArea.value.trim();
        const planText = planArea.value.trim();
        if (!diaryText && !planText) return;
        entries.unshift({
          id: createId(),
          date: dateInput.value || todayISO(),
          diary: diaryText,
          plan: planText,
        });
        saveState();
        renderContent();
      },
    },
    [
      el("div", {}, [el("label", {}, "日付"), dateInput]),
      el("div", {}, [el("label", {}, "日記"), diaryArea]),
      el("div", {}, [el("label", {}, "次の日の予定"), planArea]),
      el("button", { type: "submit" }, "追加"),
    ]
  );

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const list = el("ul", { class: "journal-list" });
  if (sorted.length === 0) {
    list.appendChild(el("li", { class: "empty-state" }, "記録はありません"));
  } else {
    for (const entry of sorted) {
      const card = el("li", { class: "journal-card" }, [
        el("div", { class: "journal-date" }, formatDateLabel(entry.date)),
        entry.diary
          ? el("div", {}, [el("div", { class: "journal-label" }, "日記"), el("p", {}, entry.diary)])
          : null,
        entry.plan
          ? el("div", {}, [el("div", { class: "journal-label" }, "次の日の予定"), el("p", {}, entry.plan)])
          : null,
        el(
          "button",
          {
            class: "delete-btn",
            "aria-label": "削除",
            onclick: () => {
              const idx = entries.indexOf(entry);
              if (idx !== -1) entries.splice(idx, 1);
              saveState();
              renderContent();
            },
          },
          "×"
        ),
      ]);
      list.appendChild(card);
    }
  }

  content.appendChild(form);
  content.appendChild(list);
}

/* ---------- English (10 idioms a day, from the user's own idiom book) ---------- */

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Picks 10 for today, prioritizing idioms not yet marked "覚えた" (memorized).
// Only once every idiom is memorized does the list start showing memorized
// ones again (so the view is never empty).
function getTodaysPhrases() {
  if (englishShuffleOverride) return englishShuffleOverride;

  const memorized = state.englishMemorized || {};
  const unlearned = ENGLISH_BANK.filter(([idiom]) => !memorized[idiom]);
  const learned = ENGLISH_BANK.filter(([idiom]) => memorized[idiom]);

  const result = [];
  if (unlearned.length > 0) {
    const take = Math.min(10, unlearned.length);
    const startIndex = (dayOfYear() * 10) % unlearned.length;
    for (let i = 0; i < take; i++) {
      result.push(unlearned[(startIndex + i) % unlearned.length]);
    }
  }
  if (result.length < 10 && learned.length > 0) {
    const remaining = 10 - result.length;
    const take = Math.min(remaining, learned.length);
    const startIndex = (dayOfYear() * remaining) % learned.length;
    for (let i = 0; i < take; i++) {
      result.push(learned[(startIndex + i) % learned.length]);
    }
  }
  return result;
}

function renderEnglish() {
  const memorizedCount = Object.values(state.englishMemorized || {}).filter(Boolean).length;
  const header = el("div", { class: "english-header" }, [
    el(
      "span",
      { class: "date-label" },
      `${formatDateLabel(todayISO())} の熟語 10選（全${ENGLISH_BANK.length}個 / 覚えた${memorizedCount}個）`
    ),
    el(
      "button",
      {
        class: "shuffle-btn",
        onclick: () => {
          const shuffled = [...ENGLISH_BANK].sort(() => Math.random() - 0.5).slice(0, 10);
          englishShuffleOverride = shuffled;
          renderContent();
        },
      },
      "別の10個を見る"
    ),
  ]);

  const modeRow = el(
    "div",
    { class: "mode-toggle" },
    [
      { key: "en2ja", label: "英→日" },
      { key: "ja2en", label: "日→英" },
    ].map((m) =>
      el(
        "button",
        {
          class: "mode-btn" + (englishDirection === m.key ? " active" : ""),
          onclick: () => {
            englishDirection = m.key;
            renderContent();
          },
        },
        m.label
      )
    )
  );

  const isJaToEn = englishDirection === "ja2en";
  const list = el("ul", { class: "phrase-list" });
  getTodaysPhrases().forEach(([idiom, en, ja], i) => {
    const question = isJaToEn
      ? el("div", { class: "phrase-question" }, ja)
      : el("div", {}, [
          el("div", { class: "phrase-idiom" }, idiom),
          el("div", { class: "phrase-question" }, en),
        ]);

    const answer = isJaToEn
      ? el("div", { class: "phrase-answer" }, [
          el("div", { class: "phrase-idiom" }, idiom),
          el("div", { class: "phrase-en" }, en),
        ])
      : el("div", { class: "phrase-answer" }, [el("div", { class: "phrase-ja" }, ja)]);

    const memorizedCheckbox = el("input", {
      type: "checkbox",
      class: "phrase-memorized-checkbox",
      title: "覚えた",
      checked: !!(state.englishMemorized && state.englishMemorized[idiom]),
      onclick: (e) => e.stopPropagation(),
      onchange: (e) => {
        state.englishMemorized = state.englishMemorized || {};
        state.englishMemorized[idiom] = e.target.checked;
        saveState();
        renderContent();
      },
    });

    const isMemorized = !!(state.englishMemorized && state.englishMemorized[idiom]);
    const li = el("li", {
      class: "phrase-item" + (isMemorized ? " memorized" : ""),
      onclick: () => li.classList.toggle("revealed"),
    }, [
      memorizedCheckbox,
      el("span", { class: "phrase-num" }, String(i + 1).padStart(2, "0")),
      el("div", { class: "phrase-body" }, [
        question,
        answer,
        el("div", { class: "phrase-hint" }, isJaToEn ? "タップして英語を見る" : "タップして日本語を見る"),
      ]),
    ]);
    list.appendChild(li);
  });

  content.appendChild(header);
  content.appendChild(modeRow);
  content.appendChild(list);
}

/* Init happens via onAuthStateChanged -> handleSignedIn (see "Auth & cloud sync" above). */
